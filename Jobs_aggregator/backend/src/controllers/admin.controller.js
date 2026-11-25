import { getSecurityMetricsSnapshot } from "../services/security-metrics.service.js";
import { AppError } from "../middleware/error.middleware.js";

const MODERATION_STATUSES = ["published", "pending", "hidden", "rejected"];

export async function ensureJobModerationColumns(db) {
  try {
    await db.execute(`
      ALTER TABLE jobs
      ADD COLUMN moderation_status ENUM('published', 'pending', 'hidden', 'rejected') NOT NULL DEFAULT 'published'
    `);
  } catch {
    /* déjà présente */
  }
  try {
    await db.execute(`ALTER TABLE jobs ADD COLUMN moderation_note VARCHAR(500) DEFAULT NULL`);
  } catch {
    /* déjà présente */
  }
  try {
    await db.execute(`ALTER TABLE jobs ADD COLUMN moderated_at DATETIME DEFAULT NULL`);
  } catch {
    /* déjà présente */
  }
  try {
    await db.execute(`ALTER TABLE jobs ADD COLUMN moderated_by INT DEFAULT NULL`);
  } catch {
    /* déjà présente */
  }
}

function assertAdmin(req) {
  if (!req.user || req.user.role !== "admin") {
    throw new AppError("Accès réservé aux administrateurs.", 403);
  }
}

export const getSecurityMetrics = async (req, res) => {
  try {
    assertAdmin(req);
    const snapshot = getSecurityMetricsSnapshot();
    res.json({ success: true, data: snapshot });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    console.error("Error in getSecurityMetrics:", error);
    res.status(500).json({ success: false, error: "Failed to fetch security metrics" });
  }
};

export const getAdminJobs = async (req, res) => {
  try {
    assertAdmin(req);
    const db = req.app.locals.db;
    await ensureJobModerationColumns(db);

    const limit = Math.min(Number.parseInt(req.query.limit || "500", 10), 2000);
    const statusFilter = req.query.status;

    let query = `
      SELECT id, title, company, location, contract_type, created_at,
             moderation_status, moderation_note, moderated_at
      FROM jobs
      WHERE url LIKE '%welovedevs%' OR url LIKE '%welove.devs%'
    `;
    const params = [];

    if (statusFilter && MODERATION_STATUSES.includes(String(statusFilter))) {
      query += ` AND moderation_status = ?`;
      params.push(statusFilter);
    }

    query += ` ORDER BY created_at DESC LIMIT ${limit}`;

    const [rows] = await db.execute(query, params);

    const data = rows.map((row) => ({
      id: String(row.id),
      title: row.title,
      company: row.company,
      location: row.location || "—",
      contractType: row.contract_type,
      date: row.created_at,
      status: row.moderation_status || "published",
      moderationNote: row.moderation_note,
      moderatedAt: row.moderated_at,
      flags: row.moderation_status === "pending" ? 1 : 0,
    }));

    return res.json({ success: true, data, count: data.length });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    console.error("getAdminJobs error:", error);
    return res.status(500).json({ success: false, message: "Impossible de charger les offres." });
  }
};

export const updateJobModeration = async (req, res) => {
  try {
    assertAdmin(req);
    const db = req.app.locals.db;
    await ensureJobModerationColumns(db);

    const { status, note } = req.body;
    const { id } = req.params;

    const [existing] = await db.execute("SELECT id FROM jobs WHERE id = ?", [id]);
    if (!existing.length) {
      return res.status(404).json({ success: false, message: "Offre introuvable." });
    }

    await db.execute(
      `UPDATE jobs
       SET moderation_status = ?, moderation_note = ?, moderated_at = NOW(), moderated_by = ?
       WHERE id = ?`,
      [status, note ?? null, req.user.id, id],
    );

    return res.json({
      success: true,
      message: `Offre marquée comme « ${status} ».`,
      jobId: id,
      status,
    });
  } catch (error) {
    if (error.name === "ZodError") {
      return res.status(400).json({ success: false, message: "Statut de modération invalide." });
    }
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    console.error("updateJobModeration error:", error);
    return res.status(500).json({ success: false, message: "Échec de la modération." });
  }
};

export const deleteAdminJob = async (req, res) => {
  try {
    assertAdmin(req);
    const db = req.app.locals.db;
    const { id } = req.params;

    const [result] = await db.execute("DELETE FROM jobs WHERE id = ?", [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Offre introuvable." });
    }

    return res.json({ success: true, message: "Offre supprimée de la base." });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    console.error("deleteAdminJob error:", error);
    return res.status(500).json({ success: false, message: "Suppression impossible." });
  }
};

export const getUsers = async (req, res) => {
  try {
    assertAdmin(req);
    const db = req.app.locals.db;
    const [rows] = await db.execute("SELECT id, first_name as firstName, last_name as lastName, email, role, created_at as joined, status, TRUE as verified FROM users ORDER BY created_at DESC");
    
    const users = rows.map(u => ({
      id: u.id,
      name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email.split('@')[0],
      email: u.email,
      role: u.role,
      joined: new Date(u.joined).toISOString().split('T')[0],
      status: u.status || 'active',
      verified: true
    }));

    res.json({ success: true, data: users });
  } catch (error) {
    console.error("Error in getUsers:", error);
    res.status(500).json({ success: false, error: "Failed to fetch users" });
  }
};

export const updateUserStatus = async (req, res) => {
  try {
    assertAdmin(req);
    const db = req.app.locals.db;
    const { id } = req.params;
    const { status } = req.body;

    if (!['active', 'suspended', 'banned'].includes(status)) {
      return res.status(400).json({ success: false, error: "Invalid status" });
    }

    const [users] = await db.execute("SELECT role FROM users WHERE id = ?", [id]);
    if (users.length === 0) return res.status(404).json({ success: false, error: "User not found" });
    if (users[0].role === 'admin') return res.status(403).json({ success: false, error: "Cannot modify an admin account" });

    await db.execute("UPDATE users SET status = ? WHERE id = ?", [status, id]);
    res.json({ success: true });
  } catch (error) {
    console.error("Error updating user status:", error);
    res.status(500).json({ success: false, error: "Failed to update user status" });
  }
};

export const deleteUser = async (req, res) => {
  try {
    assertAdmin(req);
    const db = req.app.locals.db;
    const { id } = req.params;

    const [users] = await db.execute("SELECT email, role FROM users WHERE id = ?", [id]);
    if (users.length === 0) return res.status(404).json({ success: false, error: "User not found" });
    const user = users[0];

    if (user.role === 'admin') return res.status(403).json({ success: false, error: "Cannot delete an admin account" });

    await db.execute("INSERT INTO banned_emails (email, reason) VALUES (?, 'Account deleted by admin') ON DUPLICATE KEY UPDATE reason=VALUES(reason)", [user.email]);
    await db.execute("DELETE FROM users WHERE id = ?", [id]);

    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ success: false, error: "Failed to delete user" });
  }
};

export const promoteUser = async (req, res) => {
  try {
    assertAdmin(req);
    const db = req.app.locals.db;
    const { id } = req.params;
    const { token2fa } = req.body;

    if (!token2fa) {
      return res.status(400).json({ success: false, error: "Code 2FA requis pour cette action" });
    }

    const [adminRows] = await db.execute("SELECT two_factor_secret FROM users WHERE id = ?", [req.user.id]);
    if (adminRows.length === 0 || !adminRows[0].two_factor_secret) {
      return res.status(403).json({ success: false, error: "Vous devez avoir l'A2F configuré pour promouvoir un utilisateur" });
    }

    const { default: speakeasy } = await import('speakeasy');
    const isTokenValid = speakeasy.totp.verify({
      secret: adminRows[0].two_factor_secret,
      encoding: "base32",
      token: token2fa,
      window: 1,
    });

    if (!isTokenValid) {
      return res.status(401).json({ success: false, error: "Code 2FA invalide" });
    }

    const [targetRows] = await db.execute("SELECT role FROM users WHERE id = ?", [id]);
    if (targetRows.length === 0) {
      return res.status(404).json({ success: false, error: "Utilisateur non trouvé" });
    }

    if (targetRows[0].role === 'admin') {
      return res.status(400).json({ success: false, error: "L'utilisateur est déjà admin" });
    }

    await db.execute("UPDATE users SET role = 'admin' WHERE id = ?", [id]);
    
    res.json({ success: true, message: "Utilisateur promu admin" });
  } catch (error) {
    console.error("Error promoting user:", error);
    res.status(500).json({ success: false, error: "Failed to promote user" });
  }
};
