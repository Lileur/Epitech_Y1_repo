import {
  fetchJobByIdFromWeLoveDevs,
  transformWeLoveDevsJob,
} from "../services/welovedevs.service.js";
import { generateAutoResume } from "../services/resume.service.js";

async function ensureApplicationsTable(db) {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS applications (
      id INT AUTO_INCREMENT PRIMARY KEY,
      job_id VARCHAR(255) NOT NULL,
      candidate_id INT NOT NULL,
      status ENUM('pending', 'submitted', 'reviewed', 'accepted', 'rejected') NOT NULL DEFAULT 'submitted',
      cover_letter TEXT,
      resume_text LONGTEXT,
      apply_url VARCHAR(500),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_candidate_job (job_id, candidate_id)
    )
  `);
}

async function loadJobForApplication(db, jobId) {
  const [rows] = await db.execute("SELECT * FROM jobs WHERE id = ?", [jobId]);

  if (rows.length > 0 && rows[0].description && rows[0].description.length > 50) {
    const row = rows[0];
    let tags = row.tags;
    if (typeof tags === "string") {
      try {
        tags = JSON.parse(tags);
      } catch {
        tags = [];
      }
    }
    return { ...row, tags };
  }

  const raw = await fetchJobByIdFromWeLoveDevs(jobId);
  const job = transformWeLoveDevsJob(raw);

  const createdAt = new Date(job.created_at).toISOString().slice(0, 19).replace("T", " ");

  await db.execute(
    `
    INSERT INTO jobs (
      id, title, company, description, location,
      salary_min, salary_max, contract_type, remote,
      url, created_at, logo, tags
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      title = VALUES(title),
      company = VALUES(company),
      description = VALUES(description),
      location = VALUES(location),
      salary_min = VALUES(salary_min),
      salary_max = VALUES(salary_max),
      contract_type = VALUES(contract_type),
      remote = VALUES(remote),
      url = VALUES(url),
      logo = VALUES(logo),
      tags = VALUES(tags),
      updated_at = CURRENT_TIMESTAMP
    `,
    [
      String(job.id),
      job.title,
      job.company,
      job.description,
      job.location,
      job.salary_min,
      job.salary_max,
      job.contract_type,
      job.remote ? 1 : 0,
      job.url,
      createdAt,
      job.logo,
      JSON.stringify(job.tags || []),
    ],
  );

  return job;
}

export async function applyToJob(req, res) {
  try {
    const db = req.app.locals.db;
    await ensureApplicationsTable(db);

    const { jobId, profile = {} } = req.body;

    if (!jobId) {
      return res.status(400).json({
        success: false,
        message: "jobId est requis.",
      });
    }

    const [userRows] = await db.execute(
      `SELECT id, first_name, last_name, email, role, job_title, status, profile_data
       FROM users WHERE id = ?`,
      [req.user.id],
    );

    const user = userRows[0];

    let mergedProfile = profile;
    if (user?.profile_data) {
      try {
        const stored =
          typeof user.profile_data === "string"
            ? JSON.parse(user.profile_data)
            : user.profile_data;
        mergedProfile = { ...stored, ...profile };
      } catch {
        mergedProfile = profile;
      }
    }

    if (!user || user.role !== "candidate") {
      return res.status(403).json({
        success: false,
        message: "Seuls les candidats peuvent postuler.",
      });
    }

    if (user.status && user.status !== "active") {
      return res.status(403).json({
        success: false,
        message: "Compte non actif.",
      });
    }

    const job = await loadJobForApplication(db, String(jobId));

    const { resume, coverLetter, matchedSkills, keywords } = generateAutoResume({
      candidate: user,
      profile: mergedProfile,
      job,
    });

    const applyUrl = job.url || `https://welovedevs.com/app/offers/${job.id}`;

    const [existing] = await db.execute(
      "SELECT id FROM applications WHERE job_id = ? AND candidate_id = ?",
      [String(jobId), user.id],
    );

    if (existing.length > 0) {
      await db.execute(
        `
        UPDATE applications
        SET resume_text = ?, cover_letter = ?, apply_url = ?, status = 'submitted', updated_at = NOW()
        WHERE id = ?
        `,
        [resume, coverLetter, applyUrl, existing[0].id],
      );

      return res.json({
        success: true,
        message: "Candidature mise à jour.",
        applicationId: existing[0].id,
        resume,
        coverLetter,
        matchedSkills,
        keywords,
        applyUrl,
        job,
      });
    }

    const [result] = await db.execute(
      `
      INSERT INTO applications (job_id, candidate_id, status, cover_letter, resume_text, apply_url)
      VALUES (?, ?, 'submitted', ?, ?, ?)
      `,
      [String(jobId), user.id, coverLetter, resume, applyUrl],
    );

    return res.status(201).json({
      success: true,
      message: "Candidature enregistrée avec CV auto-généré.",
      applicationId: result.insertId,
      resume,
      coverLetter,
      matchedSkills,
      keywords,
      applyUrl,
      job,
    });
  } catch (error) {
    console.error("applyToJob error:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Erreur lors de la candidature.",
    });
  }
}

export async function previewResume(req, res) {
  try {
    const db = req.app.locals.db;
    const { jobId, profile = {} } = req.body;

    if (!jobId) {
      return res.status(400).json({ success: false, message: "jobId requis." });
    }

    const [userRows] = await db.execute(
      "SELECT id, first_name, last_name, email, role, job_title, profile_data FROM users WHERE id = ?",
      [req.user.id],
    );

    const user = userRows[0];
    if (!user) {
      return res.status(404).json({ success: false, message: "Utilisateur introuvable." });
    }

    let mergedProfile = profile;
    if (user.profile_data) {
      try {
        const stored =
          typeof user.profile_data === "string"
            ? JSON.parse(user.profile_data)
            : user.profile_data;
        mergedProfile = { ...stored, ...profile };
      } catch {
        mergedProfile = profile;
      }
    }

    const job = await loadJobForApplication(db, String(jobId));
    const generated = generateAutoResume({ candidate: user, profile: mergedProfile, job });

    return res.json({
      success: true,
      ...generated,
      applyUrl: job.url,
      job,
    });
  } catch (error) {
    console.error("previewResume error:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Erreur génération CV.",
    });
  }
}

export async function getMyApplications(req, res) {
  try {
    const db = req.app.locals.db;
    await ensureApplicationsTable(db);

    const [rows] = await db.execute(
      `
      SELECT
        a.id,
        a.job_id AS jobId,
        a.status,
        a.apply_url AS applyUrl,
        a.created_at AS createdAt,
        j.title,
        j.company,
        j.location
      FROM applications a
      LEFT JOIN jobs j ON j.id = a.job_id
      WHERE a.candidate_id = ?
      ORDER BY a.created_at DESC
      `,
      [req.user.id],
    );

    return res.json({ success: true, data: rows, count: rows.length });
  } catch (error) {
    console.error("getMyApplications error:", error);
    return res.status(500).json({
      success: false,
      message: "Erreur serveur.",
    });
  }
}
