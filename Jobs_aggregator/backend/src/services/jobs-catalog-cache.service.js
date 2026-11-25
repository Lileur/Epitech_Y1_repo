/** Cache mémoire du catalogue WeLoveDevs (toutes les offres synchronisées). */
const catalogById = new Map();
let catalogUpdatedAt = 0;
const CATALOG_TTL_MS = Number.parseInt(
  process.env.JOBS_CATALOG_CACHE_TTL_MS || "3600000",
  10,
);

export function setCatalogJobs(jobs = []) {
  catalogById.clear();
  for (const job of jobs) {
    if (job?.id) catalogById.set(String(job.id), job);
  }
  catalogUpdatedAt = Date.now();
}

export function upsertCatalogJob(job) {
  if (!job?.id) return;
  catalogById.set(String(job.id), job);
  catalogUpdatedAt = Date.now();
}

export function getCatalogJob(jobId) {
  return catalogById.get(String(jobId)) ?? null;
}

export function getAllCatalogJobs() {
  return [...catalogById.values()];
}

export function getCatalogStats() {
  return {
    count: catalogById.size,
    updatedAt: catalogUpdatedAt,
    ttlMs: CATALOG_TTL_MS,
  };
}

export function isCatalogStale() {
  if (catalogById.size === 0) return true;
  return Date.now() - catalogUpdatedAt > CATALOG_TTL_MS;
}
