import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { put } from "@vercel/blob";

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

function preferBlobStorage(): boolean {
  const driver = process.env.STORAGE_DRIVER ?? "auto";
  if (driver === "local") return false;
  if (driver === "vercel-blob") return true;
  return !!process.env.VERCEL;
}

async function saveToBlob(
  relPath: string,
  buffer: Buffer,
  contentType: string,
  originalName: string
): Promise<StoredFile | null> {
  try {
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
      originalName,
    };
  } catch (err) {
    console.warn("[storage] Vercel Blob upload failed:", err);
    return null;
  }
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

  if (preferBlobStorage()) {
    const blob = await saveToBlob(relPath, buffer, contentType, file.name);
    if (blob) return blob;
    if (process.env.VERCEL) return null;
  }

  const absDir = path.join(process.cwd(), "public", UPLOAD_DIR_REL, folder);
  await fs.mkdir(absDir, { recursive: true });
  await fs.writeFile(path.join(absDir, filename), buffer);

  return {
    url: `/${UPLOAD_DIR_REL}/${folder}/${filename}`,
    pathname: `${folder}/${filename}`,
    size: buffer.byteLength,
    contentType,
    originalName: file.name,
  };
}
