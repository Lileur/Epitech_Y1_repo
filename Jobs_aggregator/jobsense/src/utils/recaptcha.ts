const SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY as string | undefined;

let scriptPromise: Promise<void> | null = null;

function loadRecaptchaScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.grecaptcha) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  if (!SITE_KEY) {
    console.warn("VITE_RECAPTCHA_SITE_KEY est manquant, le reCAPTCHA sera désactivé.");
    return Promise.resolve();
  }

  scriptPromise = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = `https://www.google.com/recaptcha/api.js?render=${SITE_KEY}`;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("reCAPTCHA script load failed"));
    document.head.appendChild(s);
  });
  return scriptPromise;
}

declare global {
  interface Window {
    grecaptcha?: {
      ready: (cb: () => void) => void;
      execute: (siteKey: string, opts: { action: string }) => Promise<string>;
    };
  }
}

/**
 * Retourne un jeton reCAPTCHA v3, ou une chaîne vide si aucune clé site n’est configurée.
 */
export async function getRecaptchaToken(action: string): Promise<string> {
  if (!SITE_KEY) return "";
  await loadRecaptchaScript();
  return new Promise((resolve, reject) => {
    window.grecaptcha?.ready(() => {
      window.grecaptcha
        ?.execute(SITE_KEY, { action })
        .then(resolve)
        .catch(reject);
    });
  });
}
