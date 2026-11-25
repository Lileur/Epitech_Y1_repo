import {
  fetchJobByIdFromWeLoveDevs,
  fetchAllJobsFromWeLoveDevs,
  fetchJobsFromWeLoveDevs,
  transformWeLoveDevsJob,
  extractJobsFromWeLoveDevsResponse,
} from "../services/welovedevs.service.js";
import { getCacheStats } from "../services/welovedevs-cache.service.js";
import {
  setCatalogJobs,
  getCatalogStats,
} from "../services/jobs-catalog-cache.service.js";

let syncInProgress = false;
let lastSyncAt = 0;
let lastAutoSyncAt = 0;
const MIN_SYNC_INTERVAL_MS = 120_000;
const AUTO_SYNC_COOLDOWN_MS = 120_000;

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed < 0) return fallback;
  return parsed;
}

function toMysqlDateTime(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const year = date.getFullYear();
  if (year < 1000 || year > 9999) return null;
  return date.toISOString().slice(0, 19).replace("T", " ");
}

async function getPublishedJobsSqlFilter(db) {
  try {
    const [cols] = await db.execute(
      "SHOW COLUMNS FROM jobs LIKE 'moderation_status'",
    );
    if (cols.length > 0) {
      return " AND (moderation_status = 'published' OR moderation_status IS NULL)";
    }
  } catch {
    /* ignore */
  }
  return "";
}

export const getAllJobs = async (req, res) => {
  try {
    const db = req.app.locals.db;
    const limit = Math.min(parsePositiveInt(req.query.limit, 50), 2000);
    const offset = parsePositiveInt(req.query.offset, 0);
    const {
      search = "",
      location = "",
      contract_type = "",
      contractType = "",
    } = req.query;
    const contractFilter = contract_type || contractType;

    const publishedFilter = await getPublishedJobsSqlFilter(db);

    let query = `SELECT * FROM jobs
      WHERE (url LIKE '%welovedevs%' OR url LIKE '%welove.devs%')${publishedFilter}`;
    const params = [];

    if (search) {
      query += ` AND (title LIKE ? OR company LIKE ? OR description LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (location) {
      const loc = String(location).trim().toLowerCase();
      if (loc === "remote" || loc === "télétravail" || loc === "teletravail") {
        query += ` AND (remote = 1 OR location LIKE ?)`;
        params.push("%remote%");
      } else {
        query += ` AND location LIKE ?`;
        params.push(`%${location}%`);
      }
    }

    if (contractFilter) {
      query += ` AND contract_type = ?`;
      params.push(contractFilter);
    }

    query += ` ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;

    let [rows] = await db.execute(query, params);

    const canAutoSync =
      rows.length === 0 &&
      offset === 0 &&
      !search &&
      !location &&
      !contractFilter &&
      !syncInProgress &&
      Date.now() - lastAutoSyncAt > AUTO_SYNC_COOLDOWN_MS &&
      Date.now() - lastSyncAt > MIN_SYNC_INTERVAL_MS;

    if (canAutoSync) {
      lastAutoSyncAt = Date.now();
      try {
        await syncJobsInternal(db, { full: true, maxPages: 5, size: 100 });
        [rows] = await db.execute(query, params);
      } catch (syncError) {
        console.warn("Auto-sync failed:", syncError.message);
      }
    }

    if (offset === 0 && !search && !location && !contractFilter) {
      await refreshCatalogFromDb(db);
    }

    return res.json({
      success: true,
      data: rows.map(formatJobRow),
      count: rows.length,
      limit,
      offset,
      catalog: getCatalogStats(),
    });
  } catch (error) {
    console.error("Error in getAllJobs:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch jobs",
      details: error.message,
    });
  }
};

async function refreshCatalogFromDb(db) {
  const publishedFilter = await getPublishedJobsSqlFilter(db);
  const [allRows] = await db.execute(
    `SELECT * FROM jobs
     WHERE (url LIKE '%welovedevs%' OR url LIKE '%welove.devs%')${publishedFilter}
     ORDER BY created_at DESC LIMIT 2000`,
  );
  const formatted = allRows.map(formatJobRow);
  setCatalogJobs(formatted);
  return formatted;
}

export const getJobsCatalog = async (req, res) => {
  try {
    const db = req.app.locals.db;
    const jobs = await refreshCatalogFromDb(db);
    return res.json({
      success: true,
      data: jobs,
      count: jobs.length,
      catalog: getCatalogStats(),
    });
  } catch (error) {
    console.error("Error in getJobsCatalog:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch catalog",
      details: error.message,
    });
  }
};

export const getJobById = async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { id } = req.params;
    const refresh = req.query.refresh === "1" || req.query.refresh === "true";

    const [rows] = await db.execute("SELECT * FROM jobs WHERE id = ?", [id]);
    const cached = rows[0];

    if (cached?.moderation_status != null && cached.moderation_status !== "published") {
      return res.status(404).json({
        success: false,
        error: "Offre introuvable ou non publiée",
      });
    }

    if (!refresh && cached?.description && String(cached.description).length > 50) {
      return res.json({
        success: true,
        data: formatJobRow(cached),
        source: "database",
      });
    }

    let job;
    try {
      const raw = await fetchJobByIdFromWeLoveDevs(id);
      job = transformWeLoveDevsJob(raw);
      await saveJobsToDatabase(db, [job]);
    } catch (apiError) {
      if (!cached) throw apiError;
      console.warn(`WeLoveDevs detail fetch failed for ${id}:`, apiError.message);
      return res.json({
        success: true,
        data: formatJobRow(cached),
        source: "database",
        warning: apiError.message,
      });
    }

    return res.json({
      success: true,
      data: job,
      source: "welovedevs",
      cached: false,
    });
  } catch (error) {
    console.error("Error in getJobById:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch job",
      details: error.message,
    });
  }
};

function stripHtml(html = "") {
  return String(html)
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildSummaryFromDescription(description, max = 240) {
  const clean = stripHtml(description || "");
  if (!clean) return "";
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > 60 ? cut.slice(0, lastSpace) : cut).trim()}…`;
}

function formatJobRow(row) {
  if (!row) return row;
  let tags = row.tags;
  if (typeof tags === "string") {
    try {
      tags = JSON.parse(tags);
    } catch {
      tags = [];
    }
  }
  const description = stripHtml(row.description || "");
  const summary = buildSummaryFromDescription(description);
  return {
    ...row,
    description,
    summary: summary || null,
    tags,
  };
}

async function syncJobsInternal(db, options = {}) {
  const q = options.q ?? options.search ?? "";
  const full = options.full !== false;

  if (full) {
    console.log("WeLoveDevs multi-page sync (with cache)...");
    const result = await fetchAllJobsFromWeLoveDevs({
      maxPages: options.maxPages,
      pageSize: options.size ?? options.pageSize,
      q,
    });

    if (result.jobs.length > 0) {
      await saveJobsToDatabase(db, result.jobs);
      await db.execute(
        "DELETE FROM jobs WHERE url IS NULL OR (url NOT LIKE '%welovedevs%' AND url NOT LIKE '%welove.devs%')",
      );
      await refreshCatalogFromDb(db);
    }

    return {
      count: result.syncedCount,
      totalCount: result.totalCount,
      pagesFetched: result.pagesFetched,
      cache: getCacheStats(),
      catalog: getCatalogStats(),
    };
  }

  const page = Number.parseInt(options.page ?? "0", 10);
  const size = Number.parseInt(options.size ?? "100", 10);
  const apiData = await fetchJobsFromWeLoveDevs({ page, size, q });
  const rawJobs = extractJobsFromWeLoveDevsResponse(apiData);
  const jobs = rawJobs.map(transformWeLoveDevsJob);

  if (jobs.length > 0) {
    await saveJobsToDatabase(db, jobs);
  }

  return {
    count: jobs.length,
    totalCount: apiData?.totalCount ?? jobs.length,
    pagesFetched: 1,
    cache: getCacheStats(),
  };
}

export const syncJobsFromWeLoveDevs = async (req, res) => {
  const now = Date.now();

  if (syncInProgress) {
    return res.status(429).json({
      success: false,
      error: "Sync already in progress",
    });
  }

  if (now - lastSyncAt < MIN_SYNC_INTERVAL_MS) {
    const waitSec = Math.ceil((MIN_SYNC_INTERVAL_MS - (now - lastSyncAt)) / 1000);
    return res.status(429).json({
      success: false,
      error: `Please wait ${waitSec}s before syncing again`,
    });
  }

  syncInProgress = true;
  lastSyncAt = now;

  try {
    const db = req.app.locals.db;
    console.log("Starting job sync from WeLoveDevs...");

    const full = req.query.full !== "0" && req.query.full !== "false";
    const maxPages = Number.parseInt(req.query.maxPages || "20", 10);
    const size = Number.parseInt(req.query.size || "100", 10);
    const q = req.query.q || req.query.search || "";

    const result = await syncJobsInternal(db, { full, maxPages, size, q });

    return res.json({
      success: true,
      message: `Synced ${result.count} jobs from WeLoveDevs (${result.pagesFetched} page(s))`,
      count: result.count,
      totalCount: result.totalCount,
      pagesFetched: result.pagesFetched,
      cache: result.cache,
    });
  } catch (error) {
    console.error("Error in syncJobsFromWeLoveDevs:", error);
    return res.status(error.statusCode || 502).json({
      success: false,
      error: "Failed to sync jobs",
      details: error.message,
    });
  } finally {
    syncInProgress = false;
  }
};

async function saveJobsToDatabase(db, jobs) {
  const connection = await db.getConnection();

  try {
    for (const job of jobs) {
      const createdAt =
        toMysqlDateTime(job.created_at) || toMysqlDateTime(new Date());

      const query = `
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
      `;

      await connection.query(query, [
        String(job.id),
        job.title || "Offre sans titre",
        job.company || "Entreprise inconnue",
        job.description || "",
        job.location || "Non précisé",
        job.salary_min ?? null,
        job.salary_max ?? null,
        job.contract_type || "CDI",
        job.remote ? 1 : 0,
        job.url || null,
        createdAt,
        job.logo || null,
        JSON.stringify(job.tags || []),
      ]);
    }
  } finally {
    connection.release();
  }
}
