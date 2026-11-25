/** Nettoie le HTML WeLoveDevs pour affichage texte. */
export function stripHtml(html: string): string {
  return String(html)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Résumé court pour les cartes (descriptionPreview ou début de description). */
export function buildJobSummary(
  description?: string | null,
  preview?: string | null,
  maxLen = 220,
): string {
  const fromPreview = preview ? stripHtml(preview) : '';
  if (fromPreview.length >= 40) {
    return fromPreview.length > maxLen
      ? `${fromPreview.slice(0, maxLen - 1).trim()}…`
      : fromPreview;
  }

  const clean = description ? stripHtml(description) : '';
  if (!clean) return '';
  if (clean.length <= maxLen) return clean;
  const cut = clean.slice(0, maxLen - 1);
  const lastSpace = cut.lastIndexOf(' ');
  const base = lastSpace > 80 ? cut.slice(0, lastSpace) : cut;
  return `${base.trim()}…`;
}
