import { randomBytes } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

const TYPES = new Map([
  ["image/png", "png"],
  ["image/jpeg", "jpg"],
  ["image/webp", "webp"],
  ["image/gif", "gif"],
]);

const DOC_TYPES = new Map([
  ["application/pdf", "pdf"],
  ["text/plain", "txt"],
  ["application/msword", "doc"],
  ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", "docx"],
]);

export function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export function normalizeDiscord(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return "";
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(withProtocol);
    const host = url.hostname.replace(/^www\./, "").toLowerCase();
    if (host !== "discord.gg" && host !== "discord.com") return null;
    const parts = url.pathname.split("/").filter(Boolean);
    const code = host === "discord.gg" ? parts[0] : parts[0] === "invite" ? parts[1] : "";
    if (!code || !/^[A-Za-z0-9-]+$/.test(code)) return null;
    return host === "discord.gg" ? `https://discord.gg/${code}` : `https://discord.com/invite/${code}`;
  } catch {
    return null;
  }
}

export function extractCode(input: string) {
  const trimmed = input.trim();
  if (!trimmed) return "";
  try {
    const url = new URL(trimmed);
    const fromQuery = url.searchParams.get("code");
    if (fromQuery) return fromQuery.trim();
    const parts = url.pathname.split("/").filter(Boolean);
    return parts[parts.length - 1] ?? trimmed;
  } catch {
    return trimmed;
  }
}

export async function storeDocument(file: File) {
  const ext = DOC_TYPES.get(file.type);
  if (!ext) throw new Error("Upload a PDF, TXT, DOC, or DOCX.");
  if (file.size > 5 * 1024 * 1024) throw new Error("Documents must be under 5 MB.");
  const bytes = Buffer.from(await file.arrayBuffer());
  const dir = path.join(process.cwd(), "data", "uploads", "docs");
  await mkdir(dir, { recursive: true });
  const name = `${Date.now()}-${randomBytes(6).toString("hex")}.${ext}`;
  await writeFile(path.join(dir, name), bytes);
  return `/uploads/docs/${name}`;
}

export async function storeUpload(file: File, kind: string) {
  const ext = TYPES.get(file.type);
  if (!ext) throw new Error("Unsupported image type.");
  const bytes = Buffer.from(await file.arrayBuffer());
  const dir = path.join(process.cwd(), "data", "uploads", kind);
  await mkdir(dir, { recursive: true });
  const name = `${Date.now()}-${randomBytes(6).toString("hex")}.${ext}`;
  await writeFile(path.join(dir, name), bytes);
  return `/uploads/${kind}/${name}`;
}

export async function resolveImage(
  form: FormData,
  fileKey: string,
  urlKey: string,
  removeKey: string,
  kind: string,
  maxBytes: number,
): Promise<{ url?: string | null; error?: string }> {
  const file = form.get(fileKey);
  const url = typeof form.get(urlKey) === "string" ? String(form.get(urlKey)).trim() : "";
  const remove = form.get(removeKey) === "on";
  if (file instanceof File && file.size > 0) {
    if (!TYPES.has(file.type)) return { error: "Upload a PNG, JPG, WEBP, or GIF." };
    if (file.size > maxBytes) return { error: `Image must be under ${Math.round(maxBytes / (1024 * 1024))} MB.` };
    return { url: await storeUpload(file, kind) };
  }
  if (url) {
    if (!isHttpUrl(url)) return { error: "Image URL must start with http:// or https://." };
    if (url.length > 500) return { error: "Image URL is too long." };
    return { url };
  }
  if (remove) return { url: null };
  return {};
}
