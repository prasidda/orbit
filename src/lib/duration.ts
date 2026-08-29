/**
 * Durations for time-based sets — planks, treadmill, stretching.
 *
 * Stored as whole seconds. People write "90" and "1:30" to mean the same
 * thing, so both parse.
 */

export function parseDuration(input: string): number | null {
  const text = input.trim();
  if (!text) return null;

  if (text.includes(":")) {
    const parts = text.split(":");
    if (parts.length !== 2) return null;
    const m = Number(parts[0]);
    const s = Number(parts[1]);
    // Reject "1:75" — that's a typo, not 135 seconds.
    if (!Number.isFinite(m) || !Number.isFinite(s)) return null;
    if (m < 0 || s < 0 || s >= 60) return null;
    return Math.round(m * 60 + s);
  }

  const n = Number(text);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

export function formatDuration(sec: number): string {
  if (sec <= 0) return "0s";
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s === 0 ? `${m}m` : `${m}m ${s}s`;
}
