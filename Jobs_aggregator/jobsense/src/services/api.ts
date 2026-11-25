import { getApiPublicBase } from '../utils/apiBase';

const API_BASE_URL = '/api';
const API_FALLBACK_URL = `${getApiPublicBase() || 'http://localhost:3000'}/api`;
const GET_CACHE_TTL_MS = 5 * 60_000;
const REQUEST_TIMEOUT_MS = 10_000;
const SYNC_TIMEOUT_MS = 180_000;

type CacheEntry = { expiresAt: number; payload: unknown };
const responseCache = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<unknown>>();

type JobsListResponse =
  | {
      success?: boolean;
      data?: unknown[];
      count?: number;
      warning?: string;
    }
  | unknown[];

/** Extrait le tableau d'offres quel que soit le format de réponse API */
export function jobsResponseToArray(response: JobsListResponse | unknown): unknown[] {
  if (Array.isArray(response)) return response;
  if (response && typeof response === 'object' && 'data' in response) {
    const d = (response as { data: unknown }).data;
    if (Array.isArray(d)) return d;
  }
  return [];
}

type SecurityMetricsApiResponse = {
  success: boolean;
  data: unknown;
};

const withTimeout = async (input: RequestInfo, init?: RequestInit) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
};

const fetchWithFallback = async (path: string, init?: RequestInit) => {
  const primary = await withTimeout(`${API_BASE_URL}${path}`, init);
  if (primary.ok) return primary;
  if (primary.status !== 404 && primary.status !== 500) return primary;
  return withTimeout(`${API_FALLBACK_URL}${path}`, init);
};

const readCached = <T>(key: string): T | null => {
  const cached = responseCache.get(key);
  if (!cached) return null;
  if (Date.now() > cached.expiresAt) {
    responseCache.delete(key);
    return null;
  }
  return cached.payload as T;
};

const writeCache = (key: string, payload: unknown) => {
  responseCache.set(key, { payload, expiresAt: Date.now() + GET_CACHE_TTL_MS });
};

const requestJson = async <T>(path: string, init?: RequestInit, options?: { cacheKey?: string; disableCache?: boolean }) => {
  const cacheKey = options?.cacheKey || `${init?.method || 'GET'}:${path}`;
  const isGet = !init?.method || init.method === 'GET';
  const useCache = isGet && !options?.disableCache;

  if (useCache) {
    const cached = readCached<T>(cacheKey);
    if (cached) return cached;

    const inFlightRequest = inFlight.get(cacheKey) as Promise<T> | undefined;
    if (inFlightRequest) return inFlightRequest;
  }

  const promise = (async () => {
    const response = await fetchWithFallback(path, init);
    if (!response.ok) throw new Error(`Request failed (${response.status})`);
    const payload = (await response.json()) as T;
    if (useCache) writeCache(cacheKey, payload);
    return payload;
  })();

  if (useCache) {
    inFlight.set(cacheKey, promise);
  }

  try {
    return await promise;
  } finally {
    if (useCache) inFlight.delete(cacheKey);
  }
};

export const jobsAPI = {
  // Get all jobs with optional filters
  getJobs: async (
    params?: {
      limit?: number;
      offset?: number;
      search?: string;
      location?: string;
      contract_type?: string;
      noCache?: boolean;
    },
  ): Promise<JobsListResponse> => {
    try {
      const queryString = new URLSearchParams();
      if (params?.limit) queryString.append('limit', params.limit.toString());
      if (params?.offset) queryString.append('offset', params.offset.toString());
      if (params?.search) queryString.append('search', params.search);
      if (params?.location) queryString.append('location', params.location);
      if (params?.contract_type) queryString.append('contract_type', params.contract_type);

      return await requestJson<JobsListResponse>(`/jobs?${queryString.toString()}`, undefined, {
        cacheKey: `GET:/jobs?${queryString.toString()}`,
        disableCache: Boolean(params?.noCache),
      });
    } catch (error) {
      console.error('Error fetching jobs:', error);
      throw error;
    }
  },

  // Get a single job by ID
  getJobById: async (id: string): Promise<unknown> => {
    try {
      return await requestJson<unknown>(`/jobs/${id}`);
    } catch (error) {
      console.error('Error fetching job:', error);
      throw error;
    }
  },

  // Sync jobs from WeLoveDevs
  syncJobs: async (opts?: { full?: boolean }): Promise<unknown> => {
    try {
      const qs = opts?.full === false ? '?full=0' : '?full=1&maxPages=20';
      responseCache.clear();
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), SYNC_TIMEOUT_MS);
      let response = await fetch(`${API_BASE_URL}/jobs/sync${qs}`, {
        method: 'POST',
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!response.ok && (response.status === 404 || response.status === 500)) {
        response = await fetch(`${API_FALLBACK_URL}/jobs/sync${qs}`, { method: 'POST' });
      }
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error((err as { error?: string; details?: string }).details || (err as { error?: string }).error || `Sync failed (${response.status})`);
      }
      return response.json();
    } catch (error) {
      console.error('Error syncing jobs:', error);
      throw error;
    }
  },

  getJobDetail: async (id: string, opts?: { refresh?: boolean }): Promise<{ success: boolean; data: Record<string, unknown> }> => {
    const qs = opts?.refresh ? '?refresh=1' : '';
    return requestJson<{ success: boolean; data: Record<string, unknown> }>(`/jobs/${id}${qs}`, undefined, {
      cacheKey: `GET:/jobs/${id}${qs}`,
      disableCache: Boolean(opts?.refresh),
    });
  },

  getCatalog: async (noCache = false): Promise<{ success: boolean; data: unknown[]; count: number }> => {
    return requestJson<{ success: boolean; data: unknown[]; count: number }>(
      '/jobs/catalog/all',
      undefined,
      { cacheKey: 'GET:/jobs/catalog/all', disableCache: noCache },
    );
  },

  getAdminJobs: async (params?: { limit?: number; status?: string }) => {
    const qs = new URLSearchParams();
    if (params?.limit) qs.set('limit', String(params.limit));
    if (params?.status) qs.set('status', params.status);
    const response = await fetchWithFallback(`/admin/jobs?${qs.toString()}`, {
      headers: authHeaders(),
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error((payload as { message?: string }).message || 'Chargement offres admin impossible');
    }
    return payload as { success: boolean; data: Array<Record<string, unknown>>; count: number };
  },

  moderateJob: async (jobId: string, status: string, note?: string) => {
    const response = await fetchWithFallback(`/admin/jobs/${jobId}/moderation`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ status, note }),
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error((payload as { message?: string }).message || 'Modération impossible');
    }
    return payload;
  },

  deleteAdminJob: async (jobId: string) => {
    const response = await fetchWithFallback(`/admin/jobs/${jobId}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error((payload as { message?: string }).message || 'Suppression impossible');
    }
    return payload;
  },

  getSecurityMetrics: async (): Promise<SecurityMetricsApiResponse> => {
    try {
      return await requestJson<SecurityMetricsApiResponse>('/admin/security-metrics', undefined, {
        cacheKey: 'GET:/admin/security-metrics',
        disableCache: true,
      });
    } catch (error) {
      console.error('Error fetching security metrics:', error);
      throw error;
    }
  },
};

const authHeaders = () => {
  const token =
    (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('adminToken')) ||
    localStorage.getItem('token');
  return token
    ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' };
};

export const applicationsAPI = {
  apply: async (jobId: string, profile: Record<string, unknown>) => {
    const response = await fetchWithFallback('/applications', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ jobId, profile }),
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error((payload as { message?: string }).message || 'Candidature échouée');
    }
    return payload as {
      success: boolean;
      resume: string;
      coverLetter: string;
      applyUrl: string;
      message: string;
    };
  },

  previewResume: async (jobId: string, profile: Record<string, unknown>) => {
    const response = await fetchWithFallback('/applications/preview-resume', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ jobId, profile }),
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error((payload as { message?: string }).message || 'Prévisualisation impossible');
    }
    return payload as { success: boolean; resume: string; coverLetter: string; applyUrl: string };
  },

  getMine: async () => {
    const response = await fetchWithFallback('/applications/me', {
      headers: authHeaders(),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error('Impossible de charger les candidatures');
    return payload as { success: boolean; data: unknown[]; count: number };
  },
};

export const usersAPI = {
  getProfile: async () => {
    const response = await fetchWithFallback('/users/me/profile', {
      headers: authHeaders(),
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error((payload as { message?: string }).message || 'Profil introuvable');
    }
    return payload as {
      success: boolean;
      user: Record<string, unknown>;
      profile: Record<string, unknown>;
    };
  },

  saveProfile: async (body: {
    profile: Record<string, unknown>;
    firstName?: string;
    lastName?: string;
    jobTitle?: string;
    company?: string;
  }) => {
    const response = await fetchWithFallback('/users/me/profile', {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(body),
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error((payload as { message?: string }).message || 'Échec de la sauvegarde');
    }
    return payload as {
      success: boolean;
      message: string;
      user: Record<string, unknown>;
      profile: Record<string, unknown>;
    };
  },

  getSavedJobs: async () => {
    const response = await fetchWithFallback('/users/me/saved-jobs', {
      headers: authHeaders(),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error('Impossible de charger les favoris');
    return payload as {
      success: boolean;
      data: Array<{ jobId: string; job: Record<string, unknown> }>;
      count: number;
    };
  },

  addSavedJob: async (jobId: string, job?: Record<string, unknown>) => {
    const response = await fetchWithFallback('/users/me/saved-jobs', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ jobId, job }),
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error((payload as { message?: string }).message || 'Sauvegarde impossible');
    }
    return payload;
  },

  removeSavedJob: async (jobId: string) => {
    const response = await fetchWithFallback(`/users/me/saved-jobs/${jobId}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error('Suppression impossible');
    return payload;
  },
};
