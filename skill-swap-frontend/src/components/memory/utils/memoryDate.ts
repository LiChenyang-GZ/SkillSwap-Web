import type { MemoryEntry } from "../../../types/memory";

export function toMemoryDisplayDate(entry: MemoryEntry): string {
  const raw = entry.publishedAt || entry.updatedAt || entry.createdAt;
  if (!raw) return "";

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("en-AU", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}
