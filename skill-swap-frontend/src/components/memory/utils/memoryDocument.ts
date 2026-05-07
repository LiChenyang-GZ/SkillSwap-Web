import type { MemoryEntry } from "../../../types/memory";
import type { ParsedMemoryDocument } from "../models/memoryFormModel";

export function parseFrontMatter(documentText: string): { meta: Record<string, string>; body: string } {
  const normalized = documentText.replace(/\r\n/g, "\n");
  const match = normalized.match(/^\uFEFF?(?:\s*\n)*---\n([\s\S]*?)\n---\n?/);
  if (!match) {
    return { meta: {}, body: normalized };
  }

  const metaBlock = match[1];
  const meta: Record<string, string> = {};
  metaBlock.split("\n").forEach((line) => {
    const idx = line.indexOf(":");
    if (idx <= 0) return;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    if (!key) return;
    meta[key] = value;
  });

  return {
    meta,
    body: normalized.slice(match[0].length),
  };
}

export function normalizeMemoryCoverValue(value?: string): string {
  if (!value) return "";
  const unquoted = value.trim().replace(/^['"]|['"]$/g, "");
  if (!unquoted) return "";

  const markdownImage = unquoted.match(/^!\[[^\]]*\]\(([^)]+)\)$/);
  if (markdownImage?.[1]) {
    return markdownImage[1].trim();
  }

  return unquoted;
}

export function extractMemoryMediaUrls(markdown: string): string[] {
  const urls = new Set<string>();

  const imageRegex = /!\[[^\]]*\]\(([^)]+)\)/g;
  let imageMatch: RegExpExecArray | null = null;
  while ((imageMatch = imageRegex.exec(markdown)) !== null) {
    const url = imageMatch[1].trim();
    if (url) urls.add(url);
  }

  const rawUrlRegex = /(https?:\/\/[^\s)]+)/g;
  let rawMatch: RegExpExecArray | null = null;
  while ((rawMatch = rawUrlRegex.exec(markdown)) !== null) {
    const url = rawMatch[1].trim();
    if (/(\.png|\.jpg|\.jpeg|\.gif|\.webp|\.mp4|\.mov|\.webm)(\?.*)?$/i.test(url)) {
      urls.add(url);
    }
  }

  return Array.from(urls);
}

export function buildMemoryDocumentFromEntry(entry: MemoryEntry): string {
  const content = entry.content || "";
  if (content.startsWith("---\n")) {
    return content;
  }

  return `---
title: ${entry.title || ""}
cover: ${(entry.coverUrl || "").replace(/\n/g, " ")}
---

${content}`;
}

export function parseMemoryDocument(documentText: string): ParsedMemoryDocument {
  const { meta, body } = parseFrontMatter(documentText);

  const title = (meta.title || meta.Title || "").trim();
  const coverUrl = normalizeMemoryCoverValue(meta.cover || meta.coverUrl || meta.image || meta.imageUrl || "");
  const mediaUrls = extractMemoryMediaUrls(documentText);

  return {
    body,
    title,
    coverUrl,
    mediaUrls,
  };
}

export function stripMemoryFrontMatter(content?: string): string {
  if (!content) return "";
  const normalized = content.replace(/\r\n/g, "\n");
  const match = normalized.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) return normalized;
  return normalized.slice(match[0].length);
}
