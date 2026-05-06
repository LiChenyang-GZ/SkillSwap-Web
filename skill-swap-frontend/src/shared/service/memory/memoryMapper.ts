import { resolveAssetUrl } from "../../../lib/api";
import type { MemoryEntry } from "../../../types/memory";

export interface MemoryApiPayload {
  id: string | number;
  title?: string;
  slug?: string;
  coverUrl?: string;
  content?: string;
  mediaUrls?: string[];
  status?: MemoryEntry["status"];
  publishedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
  editLockOwnerId?: string;
  editLockOwner?: string;
  edit_lock_owner?: string;
  editLockOwnerName?: string;
  edit_lock_owner_name?: string;
  editLockExpiresAt?: string;
  edit_lock_expires_at?: string;
}

function normalizeMemoryUrl(value?: string): string {
  const raw = String(value || "").trim();
  if (!raw) return "";

  const unquoted = raw.replace(/^['"]|['"]$/g, "");
  const markdownImage = unquoted.match(/^!\[[^\]]*\]\(([^)]+)\)$/);
  const resolved = markdownImage?.[1]?.trim() || unquoted;
  return resolveAssetUrl(resolved);
}

export function mapMemoryEntry(payload: MemoryApiPayload): MemoryEntry {
  const rawMediaUrls = Array.isArray(payload.mediaUrls) ? payload.mediaUrls : [];

  return {
    id: String(payload.id),
    title: payload.title || "",
    slug: payload.slug || "",
    coverUrl: normalizeMemoryUrl(payload.coverUrl || ""),
    content: payload.content || "",
    mediaUrls: rawMediaUrls.map((url) => normalizeMemoryUrl(url)).filter(Boolean),
    status: (payload.status || "draft") as MemoryEntry["status"],
    publishedAt: payload.publishedAt,
    createdAt: payload.createdAt,
    updatedAt: payload.updatedAt,
    createdBy: payload.createdBy,
    updatedBy: payload.updatedBy,
    editLockOwnerId: payload.editLockOwnerId || payload.editLockOwner || payload.edit_lock_owner,
    editLockOwnerName: payload.editLockOwnerName || payload.edit_lock_owner_name,
    editLockExpiresAt: payload.editLockExpiresAt || payload.edit_lock_expires_at,
  };
}
