import { NextRequest } from "next/server";
import { get } from "@vercel/blob";
import { requireSession } from "@/lib/session";
import { ApiError, errorResponse } from "@/lib/api";

export const runtime = "nodejs";

/** Serves meter images stored as private Vercel Blobs (authenticated users only). */
export async function GET(req: NextRequest) {
  try {
    await requireSession();
    const pathname = req.nextUrl.searchParams.get("pathname");
    if (!pathname) throw new ApiError("BAD_REQUEST", "Missing pathname.");

    const token =
      process.env.BLOB_READ_WRITE_TOKEN ?? process.env.VERCEL_BLOB_READ_WRITE_TOKEN;

    const result = await get(pathname, {
      access: "private",
      ...(token ? { token } : {}),
    });

    if (!result || result.statusCode !== 200 || !result.stream) {
      throw new ApiError("NOT_FOUND", "Image not found.");
    }

    return new Response(result.stream, {
      headers: {
        "Content-Type": result.blob.contentType ?? "image/jpeg",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (err) {
    return errorResponse(err);
  }
}
