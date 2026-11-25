const PAGE_CACHE_TTL_MS = Number.parseInt(
  process.env.WELOVEDEVS_PAGE_CACHE_TTL_MS || "900000",
  10,
);
const JOB_CACHE_TTL_MS = Number.parseInt(
  process.env.WELOVEDEVS_JOB_CACHE_TTL_MS || "1800000",
  10,
);

const pageCache = new Map();
const jobByIdCache = new Map();

function cachePageKey(page, size, q = "") {
  return `page:${page}:size:${size}:q:${q}`;
}

export function getCachedPage(page, size, q = "") {
  const key = cachePageKey(page, size, q);
  const entry = pageCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    pageCache.delete(key);
    return null;
  }
  return entry.data;
}

export function setCachedPage(page, size, q, data) {
  const key = cachePageKey(page, size, q);
  pageCache.set(key, { data, expiresAt: Date.now() + PAGE_CACHE_TTL_MS });
}

export function getCachedJobById(jobId) {
  const entry = jobByIdCache.get(String(jobId));
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    jobByIdCache.delete(String(jobId));
    return null;
  }
  return entry.raw;
}

export function setCachedJobById(jobId, raw) {
  if (!jobId || !raw) return;
  jobByIdCache.set(String(jobId), {
    raw,
    expiresAt: Date.now() + JOB_CACHE_TTL_MS,
  });
}

export function indexRawJobs(rawJobs = []) {
  for (const job of rawJobs) {
    const id = job?.id ?? job?.objectID ?? job?._id;
    if (id) setCachedJobById(id, job);
  }
}

export function getCacheStats() {
  return {
    pages: pageCache.size,
    jobs: jobByIdCache.size,
    pageTtlMs: PAGE_CACHE_TTL_MS,
    jobTtlMs: JOB_CACHE_TTL_MS,
  };
}

export function clearWelovedevsCache() {
  pageCache.clear();
  jobByIdCache.clear();
}
