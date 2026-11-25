/** URL publique du backend (navigateur). Requis pour OAuth sous Docker. */
export function getApiPublicBase(): string {
  return (import.meta.env.VITE_API_PUBLIC_URL as string | undefined)?.replace(/\/$/, '') ?? '';
}

export function oauthLoginUrl(provider: 'google' | 'github'): string {
  const base = getApiPublicBase();
  return base ? `${base}/api/auth/${provider}` : `/api/auth/${provider}`;
}

export function apiUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  const base = getApiPublicBase();
  return base ? `${base}${normalized}` : normalized;
}
