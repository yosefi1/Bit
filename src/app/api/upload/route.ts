import { NextRequest } from "next/server";
import { requireSession } from "@/lib/session";
import { ApiError, errorResponse, ok } from "@/lib/api";
import { saveImage } from "@/lib/storage";
import { readMeterFromImage } from "@/lib/ocr";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Handles meter image upload + OCR in one shot.
 *
 *   POST /api/upload   (multipart/form-data, field name = "file")
 */
export async function POST(req: NextRequest) {
  try {
    await requireSession();

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File))
      throw new ApiError("BAD_REQUEST", "No file uploaded.");

    const MAX_BYTES = 10 * 1024 * 1024;
    if (file.size > MAX_BYTES)
      throw new ApiError("BAD_REQUEST", "Image must be 10 MB or smaller.");
    if (
      !file.type.startsWith("image/") &&
      !/\.(jpe?g|png|webp|gif|heic)$/i.test(file.name)
    ) {
      throw new ApiError("BAD_REQUEST", "Only image files are allowed.");
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const ocr = await readMeterFromImage(buf, file.type || "image/jpeg");

    const stored = await saveImage(file, { folder: "meters" });

    return ok({
      file: stored
        ? {
            url: stored.url,
            originalName: stored.originalName,
            contentType: stored.contentType,
            size: stored.size,
          }
        : {
            url: null,
            originalName: file.name,
            contentType: file.type || "image/jpeg",
            size: buf.byteLength,
          },
      ocr,
      storageWarning: stored
        ? null
        : "Image not saved — connect Vercel Blob in Storage for photo retention.",
    });
  } catch (err) {
    return errorResponse(err);
  }
}
