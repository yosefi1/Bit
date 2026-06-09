import { createWorker } from "tesseract.js";

export interface OcrResult {
  reading: number | null;
  confidence: number | null; // 0..1
  rawText: string;
  provider: "tesseract" | "openai" | "none";
}

/**
 * Heuristic: pick the longest run of digits (with optional decimal point)
 * from raw OCR text. Meter readouts are usually the most prominent number
 * in the picture, so this works surprisingly well across noisy frames.
 */
function extractMeterNumber(text: string): number | null {
  if (!text) return null;
  // Find sequences like 12345, 12345.6, 01234, etc.
  const matches = text.match(/\d{2,8}(?:[.,]\d{1,3})?/g);
  if (!matches?.length) return null;

  // Prefer the longest sequence; if tie, prefer the one with a decimal.
  matches.sort((a, b) => {
    const lenDiff = b.replace(/\D/g, "").length - a.replace(/\D/g, "").length;
    if (lenDiff !== 0) return lenDiff;
    return Number(b.includes(".") || b.includes(",")) -
      Number(a.includes(".") || a.includes(","));
  });

  const best = matches[0].replace(",", ".");
  const n = Number(best);
  return Number.isFinite(n) ? n : null;
}

function tesseractOptions() {
  const base = { logger: () => {} };
  if (!process.env.VERCEL) return base;
  // Load workers from CDN — bundled paths break on Vercel serverless.
  return {
    ...base,
    workerPath:
      "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/worker.min.js",
    langPath: "https://tessdata.projectnaptha.com/4.0.0",
    corePath:
      "https://cdn.jsdelivr.net/npm/tesseract.js-core@5/tesseract-core.wasm.js",
  };
}

async function runTesseract(buffer: Buffer): Promise<OcrResult> {
  const worker = await createWorker("eng", 1, tesseractOptions());
  try {
    // Tesseract is most accurate on meter digits when we restrict to digits.
    await worker.setParameters({
      tessedit_char_whitelist: "0123456789.,",
    });
    const { data } = await worker.recognize(buffer);
    const reading = extractMeterNumber(data.text);
    return {
      reading,
      // Tesseract reports 0..100; normalize to 0..1
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
  contentType: string
): Promise<OcrResult | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  try {
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
              "You read electricity meter displays. Return ONLY the integer or decimal kWh value visible on the meter. No words, no units. If multiple values are visible, return the main cumulative kWh reading. If unreadable, return UNKNOWN.",
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Read this electricity meter." },
              { type: "image_url", image_url: { url: dataUrl } },
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
      return {
        reading: null,
        confidence: null,
        rawText: text,
        provider: "openai",
      };
    }
    const reading = extractMeterNumber(text);
    return {
      reading,
      // Vision models don't return confidence; treat a clean numeric response as high.
      confidence: reading != null ? 0.9 : null,
      rawText: text,
      provider: "openai",
    };
  } catch (err) {
    console.error("[ocr] OpenAI vision call failed:", err);
    return null;
  }
}

/**
 * Run OCR on a meter image, returning the detected number, confidence,
 * raw text, and which provider was used. The final, authoritative reading
 * is always the tenant-confirmed value — OCR is a starting guess.
 */
export async function readMeterFromImage(
  buffer: Buffer,
  contentType: string
): Promise<OcrResult> {
  // Prefer OpenAI vision when configured, falling back to Tesseract.
  const openai = await runOpenAIVision(buffer, contentType);
  if (openai && openai.reading != null) return openai;

  try {
    const tess = await runTesseract(buffer);
    // If OpenAI returned text but no number, prefer Tesseract's reading if found.
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
