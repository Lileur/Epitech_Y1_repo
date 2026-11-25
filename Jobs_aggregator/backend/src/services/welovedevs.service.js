import axios from "axios";
import {
  getCachedPage,
  setCachedPage,
  getCachedJobById,
  setCachedJobById,
  indexRawJobs,
} from "./welovedevs-cache.service.js";

const DEFAULT_API_URL = "https://epi-api.welovedevs.com";
const DEFAULT_PAGE_SIZE = Number.parseInt(
  process.env.WELOVEDEVS_SYNC_PAGE_SIZE || "100",
  10,
);
const DEFAULT_MAX_PAGES = Number.parseInt(
  process.env.WELOVEDEVS_SYNC_MAX_PAGES || "20",
  10,
);
const PAGE_DELAY_MS = Number.parseInt(
  process.env.WELOVEDEVS_PAGE_DELAY_MS || "2500",
  10,
);

let lastRequestTime = 0;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function getApiKey() {
  return process.env.WELOVEDEVS_API_KEY || process.env.WELOVDEVS_API_KEY || "";
}

const MIN_GAP_MS = 2000;

async function respectRateLimit() {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < MIN_GAP_MS) await delay(MIN_GAP_MS - elapsed);
  lastRequestTime = Date.now();
}

function getBaseUrl() {
  return (process.env.WELOVEDEVS_API_URL || DEFAULT_API_URL).replace(/\/$/, "");
}

export function extractJobsFromWeLoveDevsResponse(payload) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.values)) return payload.values;
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.jobs)) return payload.jobs;
  if (Array.isArray(payload.results)) return payload.results;
  if (Array.isArray(payload.content)) return payload.content;
  return [];
}

async function requestWeLoveDevs(path, params = {}) {
  const apiKey = getApiKey();
  if (!apiKey) {
    const error = new Error("WELOVEDEVS_API_KEY est manquant dans backend/.env");
    error.statusCode = 500;
    throw error;
  }

  const url = new URL(path, `${getBaseUrl()}/`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }

  const maxAttempts = 4;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    await respectRateLimit();

    const response = await axios.get(url.toString(), {
      headers: {
        "X-API-Key": apiKey,
        Accept: "application/json",
      },
      timeout: 20000,
      validateStatus: (status) => status < 500,
    });

    if (response.status >= 200 && response.status < 300) {
      return response.data;
    }

    if (response.status === 429 && attempt < maxAttempts) {
      const waitMs = 3000 * attempt;
      console.warn(`WeLoveDevs rate limit — nouvelle tentative dans ${waitMs / 1000}s`);
      await delay(waitMs);
      continue;
    }

    const error = new Error(`WeLoveDevs API HTTP ${response.status}`);
    error.statusCode = response.status;
    throw error;
  }

  const error = new Error("WeLoveDevs API: trop de tentatives");
  error.statusCode = 429;
  throw error;
}

export async function fetchJobsFromWeLoveDevs({
  page = 0,
  size = 50,
  limit,
  q = "",
  search = "",
  skipCache = false,
} = {}) {
  const query = q || search || "";
  const pageSize = Math.min(Math.max(Number(size || limit || 50), 1), 100);
  const pageNumber = Math.max(Number(page) || 0, 0);

  if (!skipCache) {
    const cached = getCachedPage(pageNumber, pageSize, query);
    if (cached) return cached;
  }

  const data = await requestWeLoveDevs("/v1", {
    page: pageNumber,
    size: pageSize,
    q: query,
  });

  setCachedPage(pageNumber, pageSize, query, data);
  indexRawJobs(extractJobsFromWeLoveDevsResponse(data));

  return data;
}

/**
 * Sync multi-pages avec cache — évite de re-appeler l'API pour les pages déjà récupérées.
 */
export async function fetchAllJobsFromWeLoveDevs({
  maxPages = DEFAULT_MAX_PAGES,
  pageSize = DEFAULT_PAGE_SIZE,
  q = "",
  search = "",
} = {}) {
  const query = q || search || "";
  const size = Math.min(Math.max(Number(pageSize) || 100, 1), 100);
  const max = Math.min(Math.max(Number(maxPages) || 20, 1), 50);

  const allRaw = [];
  let totalCount = 0;
  let pagesFetched = 0;

  for (let page = 0; page < max; page += 1) {
    if (page > 0) {
      await delay(PAGE_DELAY_MS);
    }

    const payload = await fetchJobsFromWeLoveDevs({
      page,
      size,
      q: query,
    });

    const batch = extractJobsFromWeLoveDevsResponse(payload);
    totalCount = payload?.totalCount ?? totalCount;
    pagesFetched += 1;

    if (batch.length === 0) break;

    allRaw.push(...batch);

    if (totalCount > 0 && allRaw.length >= totalCount) break;
    if (batch.length < size) break;
  }

  const unique = new Map();
  for (const raw of allRaw) {
    const id = String(raw.id ?? raw.objectID ?? "");
    if (id) unique.set(id, raw);
  }

  const jobs = [...unique.values()].map(transformWeLoveDevsJob);

  return {
    jobs,
    totalCount: totalCount || jobs.length,
    pagesFetched,
    syncedCount: jobs.length,
  };
}

export async function fetchJobByIdFromWeLoveDevs(jobId) {
  const id = String(jobId);

  const cached = getCachedJobById(id);
  if (cached) return cached;

  const directPaths = [`/v1/${id}`, `/v1/jobs/${id}`, `/v1/offers/${id}`];

  for (const path of directPaths) {
    try {
      const data = await requestWeLoveDevs(path);
      const raw = data?.data ?? data?.job ?? data?.offer ?? data;
      if (raw && (raw.id || raw._id || raw.name || raw.title)) {
        setCachedJobById(id, raw);
        return raw;
      }
    } catch {
      /* try next path */
    }
  }

  let page = 0;
  const size = 100;

  while (page < 20) {
    const payload = await fetchJobsFromWeLoveDevs({ page, size });
    const list = extractJobsFromWeLoveDevsResponse(payload);
    const found = list.find((job) => String(job.id ?? job._id) === id);

    if (found) {
      setCachedJobById(id, found);
      return found;
    }

    const total = payload?.totalCount ?? payload?.total ?? list.length;
    if (list.length < size || (total && (page + 1) * size >= total)) break;
    page += 1;
  }

  const error = new Error(`Offre WeLoveDevs introuvable (id: ${id})`);
  error.statusCode = 404;
  throw error;
}

function buildApplyUrl(job) {
  if (job.url) return job.url;
  if (job.apply_url) return job.apply_url;
  if (job.link) return job.link;
  if (job.seoAlias) return `https://welovedevs.com/fr/offers/${job.seoAlias}`;
  const id = job.id ?? job._id;
  if (id) return `https://welovedevs.com/app/offers/${encodeURIComponent(id)}`;
  return "https://welovedevs.com/app/offers";
}

function stripHtml(html = "") {
  return String(html)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;/gi, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function getByPath(obj, path) {
  return path.split(".").reduce((acc, key) => {
    if (acc && typeof acc === "object" && key in acc) return acc[key];
    return undefined;
  }, obj);
}

function normalizeTextValue(value) {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number") {
    return stripHtml(value);
  }
  if (Array.isArray(value)) {
    return value
      .map(normalizeTextValue)
      .filter(Boolean)
      .join("\n");
  }
  if (typeof value === "object") {
    const preferred = [
      "description",
      "text",
      "value",
      "content",
      "label",
      "name",
      "title",
    ];
    for (const key of preferred) {
      if (value[key]) return normalizeTextValue(value[key]);
    }
  }
  return "";
}

function appendUniqueSection(sections, label, value) {
  const text = normalizeTextValue(value);
  if (!text || text.length < 8) return;
  const normalized = text.toLowerCase().replace(/\s+/g, " ").trim();
  if (sections.some((section) => section.normalized === normalized)) return;
  sections.push({ label, text, normalized });
}

function buildDetailedDescription(job) {
  const sections = [];
  const paths = [
    ["Description", "details"],
    ["Description", "description"],
    ["Résumé", "descriptionPreview"],
    ["Profil recherché", "profile"],
    ["Profil recherché", "candidateProfile"],
    ["Profil recherché", "requirements"],
    ["Profil recherché", "requiredProfile"],
    ["Missions", "mission"],
    ["Missions", "missions"],
    ["Missions", "responsibilities"],
    ["Missions", "tasks"],
    ["Stack technique", "stack"],
    ["Stack technique", "technicalStack"],
    ["Avantages", "benefits"],
    ["Avantages", "perks"],
    ["Process de recrutement", "recruitmentProcess"],
    ["Process de recrutement", "hiringProcess"],
    ["Entreprise", "company.description"],
    ["Entreprise", "smallCompany.description"],
  ];

  for (const [label, path] of paths) {
    appendUniqueSection(sections, label, getByPath(job, path));
  }

  if (Array.isArray(job.skillsList) && job.skillsList.length > 0) {
    appendUniqueSection(
      sections,
      "Compétences",
      job.skillsList
        .map((skill) => skill?.name || skill?.label || skill)
        .filter(Boolean)
        .join(", "),
    );
  }

  if (sections.length === 0) return "Description non disponible.";

  if (sections.length === 1) return sections[0].text;

  return sections
    .map(({ label, text }, index) => (index === 0 ? text : `${label}\n${text}`))
    .join("\n\n");
}

function mapContractType(raw) {
  const value = String(raw || "").toLowerCase();
  if (value.includes("intern") || value.includes("stage")) return "Stage";
  if (value.includes("altern")) return "Alternance";
  if (value.includes("freelance") || value.includes("contractor")) return "Freelance";
  if (value.includes("permanent") || value.includes("cdi")) return "CDI";
  return raw || "CDI";
}

function parseLocation(job) {
  if (typeof job.formattedPlaces === "string" && job.formattedPlaces) {
    return job.formattedPlaces;
  }
  if (Array.isArray(job.formattedPlaces) && job.formattedPlaces[0]) {
    return String(job.formattedPlaces[0]);
  }
  if (job.location?.name) return job.location.name;
  if (typeof job.location === "string") return job.location;
  return "France";
}

function parseSalaryFromTitle(title = "") {
  const match = title.match(/(\d{2,3})\s*\/\s*(\d{2,3})\s*k/i);
  if (match) return `${match[1]}k–${match[2]}k€`;
  const single = title.match(/(\d{2,3})\s*k/i);
  if (single) return `${single[1]}k€`;
  return null;
}

export const transformWeLoveDevsJob = (job) => {
  if (!job) {
    throw new Error("Offre WeLoveDevs invalide");
  }

  const id = String(job.id ?? job.objectID ?? job._id ?? "");
  const companyName =
    job.smallCompany?.companyName ||
    job.company?.companyName ||
    job.company?.name ||
    (typeof job.company === "string" ? job.company : "Entreprise");

  const title = job.title || job.name || "Offre sans titre";
  const locationName = parseLocation(job);
  const titleLower = title.toLowerCase();
  const isRemote =
    Boolean(job.remote ?? job.is_remote) ||
    /remote|télétravail|teletravail/.test(titleLower) ||
    /remote/.test(String(locationName).toLowerCase());

  const previewText = stripHtml(job.descriptionPreview || "");
  const description = buildDetailedDescription(job);
  const summary =
    previewText ||
    (description.length > 280
      ? `${description.slice(0, 277).trim()}…`
      : description);

  const contractRaw = Array.isArray(job.contractTypes)
    ? job.contractTypes[0]
    : job.contract_type || job.type;

  return {
    id,
    source: "welovedevs",
    title,
    company: companyName,
    logo: companyName.slice(0, 2).toUpperCase(),
    description,
    descriptionPreview: previewText || null,
    summary,
    location: locationName,
    salary_min: job.salary?.min ?? job.salary_min ?? null,
    salary_max: job.salary?.max ?? job.salary_max ?? null,
    salary:
      job.salary?.min && job.salary?.max
        ? `${job.salary.min}–${job.salary.max}€`
        : parseSalaryFromTitle(title) || job.salary_range || null,
    contract_type: mapContractType(contractRaw),
    remote: isRemote,
    url: buildApplyUrl(job),
    created_at:
      job.publishDate || job.createdAt || job.created_at || new Date().toISOString(),
    tags: generateTags(job, { title, isRemote, contractRaw }),
    postedDays: calculateDaysPosted(
      job.publishDate || job.createdAt || job.created_at,
    ),
  };
};

const generateTags = (job, ctx = {}) => {
  const tags = [];
  const isRemote = ctx.isRemote ?? Boolean(job.remote);
  const title = ctx.title || job.title || "";

  if (isRemote || /remote/i.test(title)) {
    tags.push({ label: "Remote", type: "remote" });
  } else if (job.formattedPlaces) {
    const place = parseLocation(job);
    const shortPlace = place.split(",")[0].trim();
    if (shortPlace) {
      tags.push({ label: shortPlace, type: "location" });
    }
  }

  const contractType = mapContractType(
    ctx.contractRaw ||
      (Array.isArray(job.contractTypes) ? job.contractTypes[0] : job.contract_type),
  );
  tags.push({ label: contractType, type: "type" });

  const salaryLabel = parseSalaryFromTitle(title);
  if (salaryLabel) {
    tags.push({ label: salaryLabel, type: "salary" });
  }

  if (Array.isArray(job.skillsList)) {
    for (const skill of job.skillsList.slice(0, 4)) {
      const label = skill.name || skill.label || skill;
      if (label) tags.push({ label: String(label), type: "skill" });
    }
  }

  return tags;
};

const calculateDaysPosted = (createdAt) => {
  if (!createdAt) return 0;
  const createdDate = new Date(createdAt);
  if (Number.isNaN(createdDate.getTime())) return 0;
  return Math.floor(
    Math.abs(Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24),
  );
};
