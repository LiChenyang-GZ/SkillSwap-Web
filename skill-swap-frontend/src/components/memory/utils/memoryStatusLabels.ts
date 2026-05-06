import type { MemoryEntry } from "../../../types/memory";

export function toMemoryStatusLabel(status: MemoryEntry["status"]): string {
  if (status === "archived") return "hidden";
  return status;
}

export function isMemoryDraftLockedByOther(entry: MemoryEntry, currentUserId: string | null): boolean {
  if (!currentUserId) return false;
  if (entry.status !== "draft") return false;
  const ownerId = entry.editLockOwnerId ? String(entry.editLockOwnerId) : null;
  return Boolean(ownerId && ownerId !== currentUserId);
}
