import { createWorker } from "tesseract.js";

export interface OcrResult {
  reading: number | null;
  confidence: number | null;
  rawText: string;
  provider: "tesseract" | "openai" | "none";
}

export interface OcrOptions {
  /** Previous meter reading — helps pick the most likely candidate. */
  previousReading?: number;
}

function extractAllNumbers(text: string): number[] {
  if (!text) return [];
  const matches = text.match(/\d{2,8}(?:[.,]\d{1,3})?/g);
  if (!matches?.length) return [];
  const nums: number[] = [];
  for (const m of matches) {
    const n = Number(m.replace(",", "."));
    if (Number.isFinite(n)) nums.push(n);
  }
  return nums;
}

function pickBestReading(candidates: number[], previousReading?: number): number | null {
  if (!candidates.length) return null;
  const unique = [...new Set(candidates)];

  if (previousReading != null && Number.isFinite(previousReading)) {
    const abovePrev = unique.filter((n) => n >= previousReading);
    if (abovePrev.length) {
      abovePrev.sort(
        (a, b) =>
          Math.abs(a - previousReading) - Math.abs(b - previousReading) ||
          b - a
      );
      return abovePrev[0];
    }
  }

  unique.sort((a, b) => {
    const lenDiff = String(Math.trunc(b)).length - String(Math.trunc(a)).length;
    if (lenDiff !== 0) return lenDiff;
    return b - a;
  });
  return unique[0];
}

function extractMeterNumber(text: string, previousReading?: number): number | null {
  return pickBestReading(extractAllNumbers(text), previousReading);
}

function tesseractOptions() {
  const base = { logger: () => {} };
  if (!process.env.VERCEL) return base;
  return {
    ...base,
    workerPath:
      "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/worker.min.js",
    langPath: "https://tessdata.projectnaptha.com/4.0.0",
    corePath:
      "https://cdn.jsdelivr.net/npm/tesseract.js-core@5/tesseract-core.wasm.js",
  };
}

async function runTesseract(
  buffer: Buffer,
  previousReading?: number
): Promise<OcrResult> {
  const worker = await createWorker("eng", 1, tesseractOptions());
  try {
    await worker.setParameters({
      tessedit_char_whitelist: "0123456789.,",
    });
    const { data } = await worker.recognize(buffer);
    const reading = extractMeterNumber(data.text, previousReading);
    return {
      reading,
      confidence: data.confidence != null ? data.confidence / 100 : null,
      rawText: data.text,
      provider: "tesseract",
    };
  } finally {
    await worker.terminate();
  }
}

async function runOpenAIVision(
  buffer: Buffer,
  contentType: string,
  previousReading?: number
): Promise<OcrResult | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  try {
    const prevHint =
      previousReading != null
        ? ` The previous cumulative reading was ${previousReading} kWh — return a value >= that.`
        : "";
    const dataUrl = `data:${contentType || "image/jpeg"};base64,${buffer.toString("base64")}`;
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You read Israeli electricity meter LCD displays. Return ONLY the main cumulative kWh number (digits and optional decimal). No units." +
              prevHint,
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Read the kWh reading on this meter." },
              { type: "image_url", image_url: { url: dataUrl, detail: "high" } },
            ],
          },
        ],
        max_tokens: 30,
        temperature: 0,
      }),
    });
    if (!resp.ok) return null;
    const json = (await resp.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text = json.choices?.[0]?.message?.content?.trim() ?? "";
    if (!text || /unknown/i.test(text)) {
      return { reading: null, confidence: null, rawText: text, provider: "openai" };
    }
    const reading = extractMeterNumber(text, previousReading);
    return {
      reading,
      confidence: reading != null ? 0.92 : null,
      rawText: text,
      provider: "openai",
    };
  } catch (err) {
    console.error("[ocr] OpenAI vision call failed:", err);
    return null;
  }
}

export async function readMeterFromImage(
  buffer: Buffer,
  contentType: string,
  opts: OcrOptions = {}
): Promise<OcrResult> {
  const { previousReading } = opts;
  const openai = await runOpenAIVision(buffer, contentType, previousReading);
  if (openai?.reading != null) return openai;

  try {
    const tess = await runTesseract(buffer, previousReading);
    if (openai && tess.reading == null) return openai;
    return tess;
  } catch (err) {
    console.error("[ocr] Tesseract failed:", err);
    return {
      reading: openai?.reading ?? null,
      confidence: openai?.confidence ?? null,
      rawText: openai?.rawText ?? "",
      provider: openai ? "openai" : "none",
    };
  }
}
