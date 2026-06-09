import { createWorker, type Worker } from "tesseract.js";
import {
  extractAllNumbers,
  pickBestReading,
  type ClientOcrResult,
} from "./ocr-meter";

export type { ClientOcrResult };

const MAX_WIDTH = 1400;

async function loadImage(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = "async";
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Image load failed"));
      img.src = url;
    });
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function drawProcessed(
  img: HTMLImageElement,
  opts: { cropBottomRatio?: number; contrast?: number }
): HTMLCanvasElement {
  const crop = opts.cropBottomRatio ?? 1;
  const srcY = crop < 1 ? img.height * (1 - crop) : 0;
  const srcH = crop < 1 ? img.height * crop : img.height;

  const scale = Math.min(1, MAX_WIDTH / img.width);
  const w = Math.round(img.width * scale);
  const h = Math.round(srcH * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  ctx.drawImage(img, 0, srcY, img.width, srcH, 0, 0, w, h);
  const imageData = ctx.getImageData(0, 0, w, h);
  const d = imageData.data;
  const contrast = opts.contrast ?? 1.4;

  for (let i = 0; i < d.length; i += 4) {
    const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    let v = (gray - 128) * contrast + 128;
    v = Math.max(0, Math.min(255, v));
    d[i] = d[i + 1] = d[i + 2] = v;
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

async function recognizeCanvas(
  worker: Worker,
  canvas: HTMLCanvasElement
): Promise<{ text: string; confidence: number | null }> {
  const { data } = await worker.recognize(canvas);
  return {
    text: data.text,
    confidence: data.confidence != null ? data.confidence / 100 : null,
  };
}

/** Runs OCR in the browser with preprocessing + multiple passes. */
export async function readMeterClientSide(
  file: File,
  previousReading?: number
): Promise<ClientOcrResult> {
  const img = await loadImage(file);
  const passes = [
    drawProcessed(img, { cropBottomRatio: 0.45, contrast: 1.6 }),
    drawProcessed(img, { cropBottomRatio: 0.35, contrast: 1.8 }),
    drawProcessed(img, { cropBottomRatio: 1, contrast: 1.35 }),
  ];

  const worker = await createWorker("eng", 1, { logger: () => {} });
  try {
    await worker.setParameters({
      tessedit_char_whitelist: "0123456789.,",
    });

    const allCandidates: number[] = [];
    let bestConf: number | null = null;
    const rawParts: string[] = [];

    for (const canvas of passes) {
      const { text, confidence } = await recognizeCanvas(worker, canvas);
      rawParts.push(text.trim());
      allCandidates.push(...extractAllNumbers(text));
      if (confidence != null && (bestConf == null || confidence > bestConf)) {
        bestConf = confidence;
      }
    }

    const reading = pickBestReading(allCandidates, previousReading);
    return {
      reading,
      confidence: bestConf,
      rawText: rawParts.filter(Boolean).join(" | "),
      provider: reading != null ? "tesseract-client" : "none",
    };
  } finally {
    await worker.terminate();
  }
}
