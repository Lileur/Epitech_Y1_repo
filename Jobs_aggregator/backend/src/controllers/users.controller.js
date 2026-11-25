import { getCatalogJob } from "../services/jobs-catalog-cache.service.js";
import { fetchJobByIdFromWeLoveDevs, transformWeLoveDevsJob } from "../services/welovedevs.service.js";

async function ensureUserTables(db) {
  try {
    await db.execute(`
      ALTER TABLE users ADD COLUMN profile_data JSON DEFAULT NULL
    `);
  } catch {
    /* déjà présente */
  }

  await db.execute(`
    CREATE TABLE IF NOT EXISTS saved_jobs (
      user_id INT NOT NULL,
      job_id VARCHAR(255) NOT NULL,
      job_snapshot JSON NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, job_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
}

function parseProfileJson(raw) {
  if (!raw) return {};
  if (typeof raw === "object") return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export async function getProfile(req, res) {
  try {
    const db = req.app.locals.db;
    await ensureUserTables(db);

    const [rows] = await db.execute(
      `SELECT id, first_name, last_name, email, role, search_type, company, job_title, profile_data
       FROM users WHERE id = ?`,
      [req.user.id],
    );

    const user = rows[0];
    if (!user) {
      return res.status(404).json({ success: false, message: "Utilisateur introuvable." });
    }

    const profile = parseProfileJson(user.profile_data);

    return res.json({
      success: true,
      user: {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        role: user.role,
        searchType: user.search_type,
        company: user.company,
        jobTitle: user.job_title,
      },
      profile,
    });
  } catch (err) {
    console.error("getProfile error:", err);
    return res.status(500).json({ success: false, message: "Erreur serveur." });
  }
}

export async function saveProfile(req, res) {
  try {
    const db = req.app.locals.db;
    await ensureUserTables(db);

    const { profile = {}, firstName, lastName, jobTitle, company } = req.body;

    const [current] = await db.execute(
      "SELECT first_name, last_name, job_title, company, profile_data FROM users WHERE id = ?",
      [req.user.id],
    );

    if (!current[0]) {
      return res.status(404).json({ success: false, message: "Utilisateur introuvable." });
    }

    const mergedProfile = {
      ...parseProfileJson(current[0].profile_data),
      ...profile,
    };

    const nextFirst = firstName?.trim() || current[0].first_name;
    const nextLast = lastName?.trim() || current[0].last_name;
    const nextJobTitle = jobTitle?.trim() ?? current[0].job_title;
    const nextCompany = company?.trim() ?? current[0].company;

    await db.execute(
      `UPDATE users
       SET first_name = ?, last_name = ?, job_title = ?, company = ?, profile_data = ?, updated_at = NOW()
       WHERE id = ?`,
      [
        nextFirst,
        nextLast,
        nextJobTitle,
        nextCompany,
        JSON.stringify(mergedProfile),
        req.user.id,
      ],
    );

    return res.json({
      success: true,
      message: "Profil enregistré.",
      user: {
        id: req.user.id,
        firstName: nextFirst,
        lastName: nextLast,
        email: req.user.email,
        role: req.user.role,
        jobTitle: nextJobTitle,
        company: nextCompany,
      },
      profile: mergedProfile,
    });
  } catch (err) {
    console.error("saveProfile error:", err);
    return res.status(500).json({ success: false, message: "Erreur serveur." });
  }
}

async function resolveJobSnapshot(db, jobId) {
  const [rows] = await db.execute("SELECT * FROM jobs WHERE id = ?", [jobId]);
  if (rows[0]) {
    let tags = rows[0].tags;
    if (typeof tags === "string") {
      try {
        tags = JSON.parse(tags);
      } catch {
        tags = [];
      }
    }
    return { ...rows[0], tags };
  }

  const cached = getCatalogJob(jobId);
  if (cached) return cached;

  const raw = await fetchJobByIdFromWeLoveDevs(jobId);
  return transformWeLoveDevsJob(raw);
}

export async function getSavedJobs(req, res) {
  try {
    const db = req.app.locals.db;
    await ensureUserTables(db);

    const [rows] = await db.execute(
      `SELECT job_id, job_snapshot, created_at FROM saved_jobs WHERE user_id = ? ORDER BY created_at DESC`,
      [req.user.id],
    );

    const data = rows.map((row) => ({
      jobId: row.job_id,
      job: parseProfileJson(row.job_snapshot),
      savedAt: row.created_at,
    }));

    return res.json({ success: true, data, count: data.length });
  } catch (err) {
    console.error("getSavedJobs error:", err);
    return res.status(500).json({ success: false, message: "Erreur serveur." });
  }
}

export async function addSavedJob(req, res) {
  try {
    const db = req.app.locals.db;
    await ensureUserTables(db);

    const { jobId, job: clientJob } = req.body;
    if (!jobId) {
      return res.status(400).json({ success: false, message: "jobId requis." });
    }

    const snapshot =
      clientJob && clientJob.title
        ? clientJob
        : await resolveJobSnapshot(db, String(jobId));

    await db.execute(
      `INSERT INTO saved_jobs (user_id, job_id, job_snapshot)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE job_snapshot = VALUES(job_snapshot), created_at = NOW()`,
      [req.user.id, String(jobId), JSON.stringify(snapshot)],
    );

    return res.json({
      success: true,
      message: "Offre sauvegardée.",
      jobId: String(jobId),
      job: snapshot,
    });
  } catch (err) {
    console.error("addSavedJob error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Erreur serveur.",
    });
  }
}

export async function removeSavedJob(req, res) {
  try {
    const db = req.app.locals.db;
    await ensureUserTables(db);

    const { jobId } = req.params;

    await db.execute(
      "DELETE FROM saved_jobs WHERE user_id = ? AND job_id = ?",
      [req.user.id, String(jobId)],
    );

    return res.json({ success: true, message: "Offre retirée des favoris." });
  } catch (err) {
    console.error("removeSavedJob error:", err);
    return res.status(500).json({ success: false, message: "Erreur serveur." });
  }
}
