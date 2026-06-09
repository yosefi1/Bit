import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

/**
 * Pluggable image storage. The default driver ("local") writes uploaded
 * meter images to /public/uploads, which works seamlessly in local dev
 * but is *not* suitable for Vercel's serverless filesystem.
 *
 * For production on Vercel, switch STORAGE_DRIVER to "vercel-blob" (see
 * commented stub in `saveImage`) — the public URL contract stays the same,
 * so no other code needs to change.
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

export async function saveImage(
  file: File,
  opts: { folder?: string } = {}
): Promise<StoredFile> {
  const driver = process.env.STORAGE_DRIVER ?? "local";

  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = safeExt(file.name, file.type);
  const id = crypto.randomBytes(12).toString("hex");
  const folder = opts.folder?.replace(/[^a-z0-9_-]/gi, "") || "meters";
  const filename = `${Date.now()}-${id}${ext}`;
  const relPath = `${folder}/${filename}`;

  if (driver === "vercel-blob") {
    // Uncomment & install `@vercel/blob` before deploying:
    //
    //   import { put } from "@vercel/blob";
    //   const blob = await put(`${UPLOAD_DIR_REL}/${relPath}`, buffer, {
    //     access: "public",
    //     contentType: file.type,
    //     token: process.env.BLOB_READ_WRITE_TOKEN,
    //   });
    //   return {
    //     url: blob.url,
    //     pathname: blob.pathname,
    //     size: buffer.byteLength,
    //     contentType: file.type,
    //     originalName: file.name,
    //   };
    throw new Error(
      "vercel-blob storage driver selected but not enabled. " +
        "Install @vercel/blob and uncomment the implementation in src/lib/storage.ts."
    );
  }

  // Default: local filesystem under /public/uploads/<folder>/<filename>
  const absDir = path.join(process.cwd(), "public", UPLOAD_DIR_REL, folder);
  await fs.mkdir(absDir, { recursive: true });
  const absPath = path.join(absDir, filename);
  await fs.writeFile(absPath, buffer);

  return {
    url: `/${UPLOAD_DIR_REL}/${relPath}`,
    pathname: relPath,
    size: buffer.byteLength,
    contentType: file.type || "application/octet-stream",
    originalName: file.name,
  };
}
