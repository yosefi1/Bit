/** Max plausible monthly consumption (kWh) for a rental apartment meter. */
export const MAX_PLAUSIBLE_MONTHLY_KWH = 2500;

export interface ClientOcrResult {
  reading: number | null;
  confidence: number | null;
  rawText: string;
  provider: "tesseract-client" | "none";
}

export function extractAllNumbers(text: string): number[] {
  if (!text) return [];
  const matches = text.match(/\d{2,8}(?:[.,]\d{1,3})?/g);
  if (!matches?.length) return [];
  return matches
    .map((m) => Number(m.replace(",", ".")))
    .filter((n) => Number.isFinite(n));
}

export function isPlausibleReading(
  reading: number,
  previousReading: number
): boolean {
  if (!Number.isFinite(reading) || reading < previousReading) return false;
  const delta = reading - previousReading;
  if (delta > MAX_PLAUSIBLE_MONTHLY_KWH) return false;
  const digits = String(Math.trunc(reading)).length;
  if (digits < 3 || digits > 8) return false;
  return true;
}

/** Higher score = more likely the main cumulative kWh display. */
export function scoreReadingCandidate(
  reading: number,
  previousReading: number
): number {
  if (!isPlausibleReading(reading, previousReading)) return -1000;

  const delta = reading - previousReading;
  const prevDigits = String(Math.trunc(previousReading)).length;
  const readDigits = String(Math.trunc(reading)).length;

  let score = 100;
  score -= Math.abs(readDigits - prevDigits) * 12;
  score -= Math.min(delta, 800) * 0.08;
  score += readDigits * 2;

  return score;
}

export function pickBestReading(
  candidates: number[],
  previousReading?: number
): number | null {
  if (!candidates.length) return null;
  const unique = [...new Set(candidates.map((n) => Math.round(n * 100) / 100))];

  if (previousReading != null && Number.isFinite(previousReading)) {
    const scored = unique
      .map((n) => ({ n, s: scoreReadingCandidate(n, previousReading) }))
      .filter((x) => x.s > -500)
      .sort((a, b) => b.s - a.s);
    if (scored.length) return scored[0].n;
  }

  unique.sort(
    (a, b) => String(Math.trunc(b)).length - String(Math.trunc(a)).length
  );
  return unique[0];
}

/** Auto-fill only when OCR is trustworthy enough. */
export function shouldAutoFillOcr(
  reading: number | null,
  confidence: number | null,
  previousReading: number
): boolean {
  if (reading == null) return false;
  if (!isPlausibleReading(reading, previousReading)) return false;
  const delta = reading - previousReading;
  const conf = confidence ?? 0;
  if (conf >= 0.82 && delta <= 400) return true;
  if (conf >= 0.72 && delta <= 120) return true;
  return false;
}
