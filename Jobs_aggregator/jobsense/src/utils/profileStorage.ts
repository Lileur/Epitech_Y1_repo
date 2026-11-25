export interface StoredExperience {
  id: string;
  title: string;
  company: string;
  period: string;
  description: string;
}

export interface StoredEducation {
  id: string;
  degree: string;
  school: string;
  period: string;
}

export interface StoredProfileFile {
  name: string;
  url: string;
  type?: string;
  size?: number;
  uploadedAt?: string;
}

export interface StoredProfile {
  firstName?: string;
  lastName?: string;
  title?: string;
  location?: string;
  about?: string;
  website?: string;
  phone?: string;
  avatar?: string | null;
  cover?: string | null;
  cvFile?: StoredProfileFile | null;
  skills?: string[];
  experiences?: StoredExperience[];
  education?: StoredEducation[];
  available?: boolean;
  searchContract?: string;
  searchMode?: string;
  searchCity?: string;
  searchSalary?: string;
  searchDate?: string;
}

const STORAGE_PREFIX = 'jobsense_profile';

function normalizeUserKey(userKey?: string | number | null): string {
  if (userKey == null || userKey === '') return 'anonymous';
  return String(userKey).trim().toLowerCase();
}

function getStorageKey(userKey?: string | number | null): string {
  return `${STORAGE_PREFIX}:${normalizeUserKey(userKey)}`;
}

export function getCurrentProfileUserKey(): string | number | null {
  try {
    const raw = localStorage.getItem('user');
    if (!raw) return null;
    const user = JSON.parse(raw) as { id?: string | number; email?: string };
    return user.id ?? user.email ?? null;
  } catch {
    return null;
  }
}

export function loadStoredProfile(userKey?: string | number | null): StoredProfile | null {
  try {
    const raw = localStorage.getItem(getStorageKey(userKey));
    if (!raw) return null;
    return JSON.parse(raw) as StoredProfile;
  } catch {
    return null;
  }
}

export function saveStoredProfile(profile: StoredProfile, userKey?: string | number | null): void {
  try {
    localStorage.setItem(getStorageKey(userKey), JSON.stringify(profile));
  } catch {
    const lightProfile = {
      ...profile,
      avatar: null,
      cover: null,
      cvFile: profile.cvFile
        ? {
            name: profile.cvFile.name,
            type: profile.cvFile.type,
            size: profile.cvFile.size,
            uploadedAt: profile.cvFile.uploadedAt,
            url: '',
          }
        : null,
    };
    localStorage.setItem(getStorageKey(userKey), JSON.stringify(lightProfile));
  }
}

export function buildProfilePayloadFromStorage(options?: { includeAssets?: boolean }): StoredProfile {
  const stored = loadStoredProfile(getCurrentProfileUserKey());
  if (!stored) return {};
  if (options?.includeAssets) return stored;
  return {
    ...stored,
    avatar: null,
    cover: null,
    cvFile: stored.cvFile
      ? {
          name: stored.cvFile.name,
          type: stored.cvFile.type,
          size: stored.cvFile.size,
          uploadedAt: stored.cvFile.uploadedAt,
          url: '',
        }
      : null,
  };
}
