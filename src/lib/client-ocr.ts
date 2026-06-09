import { createWorker } from "tesseract.js";

export interface ClientOcrResult {
  reading: number | null;
  confidence: number | null;
  rawText: string;
  provider: "tesseract-client" | "none";
}

function extractAllNumbers(text: string): number[] {
  const matches = text.match(/\d{2,8}(?:[.,]\d{1,3})?/g);
  if (!matches?.length) return [];
  return matches
    .map((m) => Number(m.replace(",", ".")))
    .filter((n) => Number.isFinite(n));
}

function pickBest(candidates: number[], previousReading?: number): number | null {
  if (!candidates.length) return null;
  const unique = [...new Set(candidates)];
  if (previousReading != null) {
    const above = unique.filter((n) => n >= previousReading);
    if (above.length) {
      above.sort(
        (a, b) =>
          Math.abs(a - previousReading) - Math.abs(b - previousReading) || b - a
      );
      return above[0];
    }
  }
  unique.sort((a, b) => String(Math.trunc(b)).length - String(Math.trunc(a)).length);
  return unique[0];
}

/** Runs OCR in the user's browser (works well on mobile photos). */
export async function readMeterClientSide(
  file: File,
  previousReading?: number
): Promise<ClientOcrResult> {
  const worker = await createWorker("eng", 1, { logger: () => {} });
  try {
    await worker.setParameters({
      tessedit_char_whitelist: "0123456789.,",
    });
    const { data } = await worker.recognize(file);
    const reading = pickBest(extractAllNumbers(data.text), previousReading);
    return {
      reading,
      confidence: data.confidence != null ? data.confidence / 100 : null,
      rawText: data.text,
      provider: reading != null ? "tesseract-client" : "none",
    };
  } finally {
    await worker.terminate();
  }
}
