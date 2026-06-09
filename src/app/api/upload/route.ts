import { NextRequest } from "next/server";
import { requireSession } from "@/lib/session";
import { ApiError, errorResponse, ok } from "@/lib/api";
import { saveImage } from "@/lib/storage";
import { readMeterFromImage } from "@/lib/ocr";

export const runtime = "nodejs";

/**
 * Handles meter image upload + OCR in one shot.
 *
 *   POST /api/upload   (multipart/form-data, field name = "file")
 *
 * Returns:
 *   {
 *     file: { url, originalName, contentType, size },
 *     ocr:  { reading, confidence, rawText, provider }
 *   }
 */
export async function POST(req: NextRequest) {
  try {
    await requireSession();

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File))
      throw new ApiError("BAD_REQUEST", "No file uploaded.");

    const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
    if (file.size > MAX_BYTES)
      throw new ApiError("BAD_REQUEST", "Image must be 10 MB or smaller.");
    if (!file.type.startsWith("image/"))
      throw new ApiError("BAD_REQUEST", "Only image files are allowed.");

    const stored = await saveImage(file, { folder: "meters" });

    // Run OCR on the same buffer (re-read from saved file would also work).
    const buf = Buffer.from(await file.arrayBuffer());
    const ocr = await readMeterFromImage(buf, file.type);

    return ok({
      file: {
        url: stored.url,
        originalName: stored.originalName,
        contentType: stored.contentType,
        size: stored.size,
      },
      ocr,
    });
  } catch (err) {
    return errorResponse(err);
  }
}
