import { buildJobSummary, stripHtml } from './jobText';

export type JobTag = { label: string; type: 'remote' | 'salary' | 'type' | 'location' | 'skill' };

export interface NormalizedJob {
  id: string;
  title: string;
  company: string;
  logo: string;
  tags: JobTag[];
  salary?: string;
  location: string;
  postedDays: number;
  featured?: boolean;
  contract_type?: string;
  remote?: boolean;
  salary_min?: number | null;
  salary_max?: number | null;
  description?: string;
  summary?: string;
  applyUrl?: string;
}

export interface FilterState {
  contractTypes: string[];
  workModes: string[];
  experience: string[];
  salaryMin: number;
  salaryMax: number;
}

const CONTRACT_OPTIONS = ['CDI', 'Stage', 'Alternance', 'Freelance'] as const;
const WORK_MODE_OPTIONS = ['Remote', 'Hybride', 'Présentiel'] as const;
const EXPERIENCE_OPTIONS = ['Junior (0–2 ans)', 'Confirmé (2–5)', 'Senior (5+)'] as const;

function parseTags(raw: unknown): JobTag[] {
  if (Array.isArray(raw)) return raw as JobTag[];
  if (typeof raw === 'string') {
    try {
      const p = JSON.parse(raw) as unknown;
      return Array.isArray(p) ? (p as JobTag[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function daysPosted(createdAt?: string | Date | null): number {
  if (!createdAt) return 0;
  const created = new Date(createdAt);
  if (Number.isNaN(created.getTime())) return 0;
  return Math.floor((Date.now() - created.getTime()) / (1000 * 60 * 60 * 24));
}

/** Convertit min/max bruts (souvent € annuels) en milliers d'euros pour le filtre UI */
export function salaryBoundsK(
  min: number | null | undefined,
  max: number | null | undefined,
): { minK: number; maxK: number } | null {
  if (min == null || max == null || Number.isNaN(min) || Number.isNaN(max)) return null;
  const hi = Math.max(min, max);
  if (hi > 500) {
    return { minK: Math.round(min / 1000), maxK: Math.round(max / 1000) };
  }
  return { minK: Math.round(min), maxK: Math.round(max) };
}

export function formatSalaryLabel(min: number, max: number): string {
  const b = salaryBoundsK(min, max);
  if (!b) return '';
  return `${b.minK}k–${b.maxK}k€`;
}

export function normalizeJob(raw: Record<string, unknown>): NormalizedJob {
  const id = String(raw.id ?? '');
  const title = String(raw.title ?? '');
  const company = String(raw.company ?? '');
  let logo = String(raw.logo ?? '');
  if (!logo && company) logo = company.slice(0, 2).toUpperCase();
  const tags = parseTags(raw.tags);
  const location = String(raw.location ?? '—');
  const postedDays =
    typeof raw.postedDays === 'number' && !Number.isNaN(raw.postedDays)
      ? raw.postedDays
      : daysPosted(raw.created_at as string | undefined);
  const salary_min =
    raw.salary_min != null && raw.salary_min !== ''
      ? Number(raw.salary_min)
      : null;
  const salary_max =
    raw.salary_max != null && raw.salary_max !== ''
      ? Number(raw.salary_max)
      : null;
  let salary = typeof raw.salary === 'string' && raw.salary ? raw.salary : undefined;
  if (!salary && salary_min != null && salary_max != null) {
    salary = formatSalaryLabel(salary_min, salary_max);
  }
  const remote = Boolean(raw.remote);
  const contract_type = String(raw.contract_type ?? tags.find((t) => t.type === 'type')?.label ?? 'CDI');
  const descriptionRaw =
    typeof raw.description === 'string'
      ? raw.description
      : typeof raw.details === 'string'
        ? raw.details
        : undefined;
  const description = descriptionRaw ? stripHtml(descriptionRaw) : undefined;
  const previewRaw =
    typeof raw.summary === 'string'
      ? raw.summary
      : typeof raw.descriptionPreview === 'string'
        ? raw.descriptionPreview
        : undefined;
  const summary =
    buildJobSummary(description, previewRaw) ||
    (description && description.length > 0
      ? buildJobSummary(description)
      : undefined);

  const applyUrl = typeof raw.url === 'string' && raw.url
    ? raw.url
    : typeof raw.apply_url === 'string' && raw.apply_url
    ? raw.apply_url
    : typeof raw.external_url === 'string' && raw.external_url
    ? raw.external_url
    : undefined;

  return {
    id,
    title,
    company,
    logo,
    tags,
    salary,
    location,
    postedDays,
    featured: Boolean(raw.featured),
    contract_type,
    remote,
    salary_min,
    salary_max,
    description,
    summary,
    applyUrl,
  };
}

export function normalizeJobsList(rows: unknown[]): NormalizedJob[] {
  if (!Array.isArray(rows)) return [];
  return rows.map((r) => normalizeJob(r as Record<string, unknown>));
}

export function getContractBucket(job: NormalizedJob): string {
  const raw = (job.contract_type || job.tags.find((t) => t.type === 'type')?.label || 'CDI').toString();
  const s = raw.toLowerCase();
  if (/alternance|apprentissage/.test(s)) return 'Alternance';
  if (/stage|internship|stagiaire/.test(s)) return 'Stage';
  if (/freelance|freelancer|indépendant|indépendante/.test(s)) return 'Freelance';
  return 'CDI';
}

export function getWorkMode(job: NormalizedJob): string {
  const tagLabels = job.tags.map((t) => t.label.toLowerCase()).join(' ');
  if (/hybrid|hybride/.test(tagLabels)) return 'Hybride';
  if (job.remote || /\bremote\b|télétravail|teletravail|full remote/.test(tagLabels)) return 'Remote';
  if (job.location && /^remote$/i.test(job.location.trim())) return 'Remote';
  return 'Présentiel';
}

export function getExperienceBucket(job: NormalizedJob): string {
  const t = `${job.title} ${job.description ?? ''}`.toLowerCase();
  const contract = getContractBucket(job);
  if (contract === 'Stage' || /stage|stagiaire|internship|intern\b|alternance|apprenti/.test(t)) {
    return 'Junior (0–2 ans)';
  }
  if (/(senior|lead\b|staff|principal|head of|directeur technique|cto\b|chief|architecte)/i.test(job.title)) {
    return 'Senior (5+)';
  }
  if (/(junior|graduate|débutant|debutant|first job|première expérience)/i.test(t)) {
    return 'Junior (0–2 ans)';
  }
  return 'Confirmé (2–5)';
}

function jobMatchesSalary(job: NormalizedJob, minK: number, maxK: number): boolean {
  const b = salaryBoundsK(job.salary_min ?? undefined, job.salary_max ?? undefined);
  if (!b) return true;
  return b.minK <= maxK && b.maxK >= minK;
}

export function filterBySearchOnly(jobs: NormalizedJob[], query: string, location: string): NormalizedJob[] {
  const q = query.trim().toLowerCase();
  const loc = location.trim().toLowerCase();
  return jobs.filter((job) => {
    if (q) {
      const blob = `${job.title} ${job.company} ${job.tags.map((t) => t.label).join(' ')}`.toLowerCase();
      if (!blob.includes(q)) return false;
    }
    if (loc) {
      const locBlob = `${job.location} ${job.tags.map((t) => t.label).join(' ')}`.toLowerCase();
      if (!locBlob.includes(loc)) return false;
    }
    return true;
  });
}

export function filterJobs(
  jobs: NormalizedJob[],
  query: string,
  location: string,
  filters: FilterState,
): NormalizedJob[] {
  return filterBySearchOnly(jobs, query, location).filter((job) => {
    if (filters.contractTypes.length > 0) {
      if (!filters.contractTypes.includes(getContractBucket(job))) return false;
    }
    if (filters.workModes.length > 0) {
      if (!filters.workModes.includes(getWorkMode(job))) return false;
    }
    if (filters.experience.length > 0) {
      if (!filters.experience.includes(getExperienceBucket(job))) return false;
    }
    if (!jobMatchesSalary(job, filters.salaryMin, filters.salaryMax)) return false;

    return true;
  });
}

export type SortKey = 'relevance' | 'recent' | 'salary';

export function sortJobs(jobs: NormalizedJob[], sortBy: SortKey): NormalizedJob[] {
  const copy = [...jobs];
  if (sortBy === 'recent') {
    copy.sort((a, b) => a.postedDays - b.postedDays);
    return copy;
  }
  if (sortBy === 'salary') {
    copy.sort((a, b) => {
      const ba = salaryBoundsK(a.salary_min ?? undefined, a.salary_max ?? undefined);
      const bb = salaryBoundsK(b.salary_min ?? undefined, b.salary_max ?? undefined);
      const va = ba?.maxK ?? -1;
      const vb = bb?.maxK ?? -1;
      return vb - va;
    });
    return copy;
  }
  return copy;
}

function countBy<T extends string>(jobs: NormalizedJob[], getter: (j: NormalizedJob) => T, options: readonly T[]) {
  const rec = Object.fromEntries(options.map((k) => [k, 0])) as Record<T, number>;
  for (const job of jobs) {
    const k = getter(job);
    if (k in rec) rec[k] += 1;
  }
  return rec;
}

export function computeFacetCounts(jobs: NormalizedJob[]) {
  return {
    contract: countBy(jobs, getContractBucket, CONTRACT_OPTIONS),
    workMode: countBy(jobs, getWorkMode, WORK_MODE_OPTIONS),
    experience: countBy(jobs, getExperienceBucket, EXPERIENCE_OPTIONS),
  };
}

export function topRecruiters(jobs: NormalizedJob[], limit = 4): { name: string; logo: string; jobs: number }[] {
  const map = new Map<string, number>();
  for (const j of jobs) {
    if (!j.company) continue;
    map.set(j.company, (map.get(j.company) ?? 0) + 1);
  }
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, jobsCount]) => ({
      name,
      logo: name
        .split(/\s+/)
        .map((w) => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase(),
      jobs: jobsCount,
    }));
}
