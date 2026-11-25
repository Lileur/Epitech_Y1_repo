import type { NormalizedJob } from './jobModel';
import { normalizeJob } from './jobModel';
import { findJobInCatalog } from './jobsCatalogCache';

const SAVED_IDS_KEY = 'jobsense_saved';
const SAVED_JOBS_KEY = 'jobsense_saved_jobs';

export type SavedJobEntry = {
  jobId: string;
  job: Record<string, unknown>;
  savedAt: string;
};

export function readSavedIds(): string[] {
  try {
    const raw = localStorage.getItem(SAVED_IDS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((x): x is string => typeof x === 'string')
      : [];
  } catch {
    return [];
  }
}

export function writeSavedIds(ids: string[]): void {
  localStorage.setItem(SAVED_IDS_KEY, JSON.stringify(ids));
}

export function loadSavedJobsMap(): Record<string, SavedJobEntry> {
  try {
    const raw = localStorage.getItem(SAVED_JOBS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, SavedJobEntry>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function saveSavedJobsMap(map: Record<string, SavedJobEntry>): void {
  localStorage.setItem(SAVED_JOBS_KEY, JSON.stringify(map));
}

export function jobToSnapshot(job: NormalizedJob): Record<string, unknown> {
  return {
    id: job.id,
    title: job.title,
    company: job.company,
    description: job.description,
    location: job.location,
    contract_type: job.contract_type,
    remote: job.remote,
    salary_min: job.salary_min,
    salary_max: job.salary_max,
    url: job.applyUrl,
    logo: job.logo,
    tags: job.tags,
  };
}

export function resolveJobSnapshot(
  jobId: string,
  hint?: NormalizedJob,
): Record<string, unknown> {
  if (hint) return jobToSnapshot(hint);
  const fromSaved = loadSavedJobsMap()[jobId]?.job;
  if (fromSaved?.title) return fromSaved;
  const fromCatalog = findJobInCatalog(jobId);
  if (fromCatalog) return fromCatalog;
  return { id: jobId };
}

export function toggleSavedJob(
  jobId: string,
  hint?: NormalizedJob,
): { ids: string[]; added: boolean } {
  const ids = readSavedIds();
  const map = loadSavedJobsMap();
  const isSaved = ids.includes(jobId);

  if (isSaved) {
    const nextIds = ids.filter((id) => id !== jobId);
    delete map[jobId];
    writeSavedIds(nextIds);
    saveSavedJobsMap(map);
    return { ids: nextIds, added: false };
  }

  const snapshot = resolveJobSnapshot(jobId, hint);
  const nextIds = [...ids, jobId];
  map[jobId] = {
    jobId,
    job: snapshot,
    savedAt: new Date().toISOString(),
  };
  writeSavedIds(nextIds);
  saveSavedJobsMap(map);
  return { ids: nextIds, added: true };
}

export function mergeSavedFromServer(
  serverItems: Array<{ jobId: string; job: Record<string, unknown> }>,
): string[] {
  const map = loadSavedJobsMap();
  const ids = new Set(readSavedIds());

  for (const item of serverItems) {
    ids.add(item.jobId);
    map[item.jobId] = {
      jobId: item.jobId,
      job: item.job,
      savedAt: new Date().toISOString(),
    };
  }

  const nextIds = [...ids];
  writeSavedIds(nextIds);
  saveSavedJobsMap(map);
  return nextIds;
}

export function getSavedJobsAsNormalized(): NormalizedJob[] {
  const map = loadSavedJobsMap();
  return readSavedIds()
    .map((id) => map[id]?.job)
    .filter(Boolean)
    .map((raw) => normalizeJob(raw as Record<string, unknown>));
}
