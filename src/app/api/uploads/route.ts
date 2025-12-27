import { NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

const ALLOWED_FOLDERS = new Set(["tickets", "repairs", "promotions"]);

function toSafeFolder(value: string) {
  const trimmed = value.trim().toLowerCase();
  return ALLOWED_FOLDERS.has(trimmed) ? trimmed : "tickets";
}

function toSafeFilename(name: string) {
  const ext = path.extname(name);
  const base = path.basename(name, ext).replace(/[^a-z0-9-_]+/gi, "");
  const safeBase = base.length ? base : "file";
  return `${Date.now()}-${safeBase}-${randomUUID()}${ext}`;
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");
  const folderValue = formData.get("folder");
  const folder = toSafeFolder(typeof folderValue === "string" ? folderValue : "");

  if (!(file instanceof File)) {
    return NextResponse.json(
      { ok: false, error: "Missing file." },
      { status: 400 },
    );
  }

  const filename = toSafeFilename(file.name);
  const relativePath = path.posix.join("uploads", folder, filename);
  const absoluteDir = path.join(process.cwd(), "public", "uploads", folder);
  const absolutePath = path.join(process.cwd(), "public", relativePath);

  await mkdir(absoluteDir, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(absolutePath, buffer);

  return NextResponse.json({
    ok: true,
    url: `/${relativePath}`,
    path: relativePath,
    name: file.name,
    type: file.type || "application/octet-stream",
  });
}
