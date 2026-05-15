// Lightweight browser fingerprint — not bulletproof, but adequate for
// best-effort dedupe alongside DB unique constraints.
export function getFingerprint(): string {
  if (typeof window === "undefined") return "ssr";
  const KEY = "tijcef_fp";
  const stored = localStorage.getItem(KEY);
  if (stored) return stored;

  const parts = [
    navigator.userAgent,
    navigator.language,
    String(screen.width),
    String(screen.height),
    String(screen.colorDepth),
    new Date().getTimezoneOffset().toString(),
    String(navigator.hardwareConcurrency ?? ""),
  ].join("|");

  let hash = 0;
  for (let i = 0; i < parts.length; i++) {
    hash = (hash * 31 + parts.charCodeAt(i)) | 0;
  }
  const rand = Math.random().toString(36).slice(2, 10);
  const fp = `fp_${Math.abs(hash).toString(36)}_${rand}`;
  localStorage.setItem(KEY, fp);
  return fp;
}
