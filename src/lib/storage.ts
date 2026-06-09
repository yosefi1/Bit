import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { put } from "@vercel/blob";

/**
 * Pluggable image storage. Local dev writes to /public/uploads.
 * On Vercel, uses Vercel Blob when BLOB_READ_WRITE_TOKEN is set.
 */
export interface StoredFile {
  url: string;
  pathname: string;
  size: number;
  contentType: string;
  originalName: string;
}

const UPLOAD_DIR_REL = "uploads";

function safeExt(name: string, contentType: string): string {
  const fromName = path.extname(name).toLowerCase();
  if (fromName) return fromName;
  if (contentType.includes("png")) return ".png";
  if (contentType.includes("webp")) return ".webp";
  if (contentType.includes("heic")) return ".heic";
  return ".jpg";
}

function useBlobStorage(): boolean {
  const driver = process.env.STORAGE_DRIVER ?? "auto";
  if (driver === "local") return false;
  if (driver === "vercel-blob") return !!process.env.BLOB_READ_WRITE_TOKEN;
  // auto: blob on Vercel when token exists, otherwise local filesystem
  return !!process.env.VERCEL && !!process.env.BLOB_READ_WRITE_TOKEN;
}

export async function saveImage(
  file: File,
  opts: { folder?: string } = {}
): Promise<StoredFile | null> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = safeExt(file.name, file.type);
  const id = crypto.randomBytes(12).toString("hex");
  const folder = opts.folder?.replace(/[^a-z0-9_-]/gi, "") || "meters";
  const filename = `${Date.now()}-${id}${ext}`;
  const relPath = `${UPLOAD_DIR_REL}/${folder}/${filename}`;
  const contentType = file.type || "application/octet-stream";

  if (useBlobStorage()) {
    const blob = await put(relPath, buffer, {
      access: "public",
      contentType,
      addRandomSuffix: false,
    });
    return {
      url: blob.url,
      pathname: blob.pathname,
      size: buffer.byteLength,
      contentType,
      originalName: file.name,
    };
  }

  if (process.env.VERCEL) {
    // Serverless filesystem is read-only; skip persistence until Blob is connected.
    console.warn(
      "[storage] BLOB_READ_WRITE_TOKEN missing — image not persisted. " +
        "Add Vercel Blob via Storage for production uploads."
    );
    return null;
  }

  const absDir = path.join(process.cwd(), "public", UPLOAD_DIR_REL, folder);
  await fs.mkdir(absDir, { recursive: true });
  const absPath = path.join(absDir, filename);
  await fs.writeFile(absPath, buffer);

  return {
    url: `/${UPLOAD_DIR_REL}/${folder}/${filename}`,
    pathname: `${folder}/${filename}`,
    size: buffer.byteLength,
    contentType,
    originalName: file.name,
  };
}
