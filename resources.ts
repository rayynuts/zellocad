"use server";

import { revalidatePath } from "next/cache";
import { requireMembership } from "../access";
import { bounce, done } from "../nav";
import { isServerOwner } from "../permissions";
import { prisma } from "../prisma";
import { isHttpUrl, storeDocument } from "../uploads";

function text(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

function refresh(serverId: string) {
  revalidatePath(`/s/${serverId}/resources`);
}

function httpUrl(raw: string) {
  if (!raw) return "";
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  if (!isHttpUrl(withProtocol) || withProtocol.length > 500) return null;
  return withProtocol;
}

async function requireOwner(serverId: string) {
  const ctx = await requireMembership(serverId);
  if (!isServerOwner(ctx.member.role)) bounce(`/s/${serverId}/resources`, "Only the server owner can edit resources.");
  return ctx;
}

export async function saveApplicationLink(form: FormData) {
  const serverId = text(form, "serverId");
  const ctx = await requireOwner(serverId);
  const raw = text(form, "applicationUrl");
  const applicationUrl = httpUrl(raw);
  if (raw && !applicationUrl) bounce(`/s/${serverId}/resources`, "Application link must be a web address, like https://example.com/apply.");
  await prisma.server.update({ where: { id: ctx.server.id }, data: { applicationUrl: applicationUrl || null } });
  refresh(serverId);
  done(`/s/${serverId}/resources`, "saved");
}

export async function addResourceDoc(form: FormData) {
  const serverId = text(form, "serverId");
  await requireOwner(serverId);
  const title = text(form, "title");
  const link = text(form, "url");
  const file = form.get("file");
  if (title.length < 2 || title.length > 80) bounce(`/s/${serverId}/resources`, "Document title must be 2–80 characters.");
  const count = await prisma.resourceDoc.count({ where: { serverId } });
  if (count >= 40) bounce(`/s/${serverId}/resources`, "This server already has 40 documents.");
  let url = "";
  if (file instanceof File && file.size > 0) {
    try {
      url = await storeDocument(file);
    } catch (error) {
      bounce(`/s/${serverId}/resources`, error instanceof Error ? error.message : "That document could not be uploaded.");
    }
  } else if (link) {
    const normalized = httpUrl(link);
    if (!normalized) bounce(`/s/${serverId}/resources`, "Document link must be a web address, like https://docs.example.com/handbook.");
    url = normalized;
  } else {
    bounce(`/s/${serverId}/resources`, "Add a document link or upload a PDF, TXT, DOC, or DOCX.");
  }
  await prisma.resourceDoc.create({ data: { serverId, title, url } });
  refresh(serverId);
  done(`/s/${serverId}/resources`, "doc");
}

export async function deleteResourceDoc(form: FormData) {
  const serverId = text(form, "serverId");
  await requireOwner(serverId);
  const id = text(form, "docId");
  await prisma.resourceDoc.deleteMany({ where: { id, serverId } });
  refresh(serverId);
  done(`/s/${serverId}/resources`, "saved");
}
