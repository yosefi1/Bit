import { NextRequest } from "next/server";
import { requireSession } from "@/lib/session";
import { ApiError, errorResponse, ok } from "@/lib/api";
import { saveImage } from "@/lib/storage";
import { readMeterFromImage } from "@/lib/ocr";
import { getPreviousReadingForApartment } from "@/lib/billing";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    if (session.user.role !== "TENANT" || !session.user.apartmentId) {
      throw new ApiError("FORBIDDEN", "נדרשת הרשאת דייר.");
    }

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

    const apartmentId = session.user.apartmentId;
    const previousReading = await getPreviousReadingForApartment(apartmentId);
    const buf = Buffer.from(await file.arrayBuffer());
    const ocr = await readMeterFromImage(buf, file.type || "image/jpeg", {
      previousReading,
    });

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
        : "התמונה לא נשמרה — ודא ש-Vercel Blob מחובר ועשה Redeploy.",
    });
  } catch (err) {
    return errorResponse(err);
  }
}
