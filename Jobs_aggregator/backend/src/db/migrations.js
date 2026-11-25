/**
 * Migrations idempotentes au démarrage (volume MySQL déjà existant sans ré-init).
 */
export async function runStartupMigrations(db) {
  try {
    await db.execute(`
      ALTER TABLE jobs
      ADD COLUMN moderation_status ENUM('published', 'pending', 'hidden', 'rejected') NOT NULL DEFAULT 'published'
    `);
  } catch {
    /* colonne déjà présente */
  }

  for (const sql of [
    `ALTER TABLE jobs ADD COLUMN moderation_note VARCHAR(500) DEFAULT NULL`,
    `ALTER TABLE jobs ADD COLUMN moderated_at DATETIME DEFAULT NULL`,
    `ALTER TABLE jobs ADD COLUMN moderated_by INT DEFAULT NULL`,
    `ALTER TABLE users ADD COLUMN profile_data JSON DEFAULT NULL`,
  ]) {
    try {
      await db.execute(sql);
    } catch {
      /* déjà présente */
    }
  }

  try {
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
  } catch (err) {
    console.warn("saved_jobs migration:", err.message);
  }
}
