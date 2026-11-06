import { readFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";

const TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".pdf": "application/pdf",
  ".txt": "text/plain; charset=utf-8",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

export async function GET(_request: Request, context: { params: Promise<{ path: string[] }> }) {
  const parts = (await context.params).path;
  if (!parts?.length || parts.some((part) => part.includes("..") || part.includes("/") || part.includes("\\"))) {
    return new NextResponse("Bad path", { status: 400 });
  }
  const root = path.resolve(process.cwd(), "data", "uploads");
  const file = path.resolve(root, ...parts);
  if (!file.startsWith(root + path.sep)) return new NextResponse("Bad path", { status: 400 });
  try {
    const data = await readFile(file);
    return new NextResponse(data, {
      headers: {
        "Content-Type": TYPES[path.extname(file).toLowerCase()] ?? "application/octet-stream",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
