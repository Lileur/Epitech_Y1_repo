const CATALOG_KEY = 'jobsense_catalog_cache';

export type CatalogJobSnapshot = Record<string, unknown>;

export function loadCatalogCache(): CatalogJobSnapshot[] {
  try {
    const raw = localStorage.getItem(CATALOG_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { jobs?: CatalogJobSnapshot[] };
    return Array.isArray(parsed?.jobs) ? parsed.jobs : [];
  } catch {
    return [];
  }
}

export function saveCatalogCache(jobs: CatalogJobSnapshot[]): void {
  localStorage.setItem(
    CATALOG_KEY,
    JSON.stringify({ updatedAt: Date.now(), jobs }),
  );
}

export function upsertCatalogJob(job: CatalogJobSnapshot): void {
  const jobs = loadCatalogCache();
  const id = String(job.id ?? '');
  if (!id) return;
  const idx = jobs.findIndex((j) => String(j.id) === id);
  if (idx >= 0) jobs[idx] = { ...jobs[idx], ...job };
  else jobs.push(job);
  saveCatalogCache(jobs);
}

export function findJobInCatalog(jobId: string): CatalogJobSnapshot | null {
  const jobs = loadCatalogCache();
  return jobs.find((j) => String(j.id) === jobId) ?? null;
}
