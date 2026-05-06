import type { MemoryEntry } from "../../../types/memory";
import type { DisplayMemoryEntry } from "../models/memoryViewModel";

export function sortPublishedMemories(entries: MemoryEntry[]): MemoryEntry[] {
  return [...entries].sort((a, b) => {
    const aTime = new Date(a.publishedAt || a.updatedAt || a.createdAt || 0).getTime();
    const bTime = new Date(b.publishedAt || b.updatedAt || b.createdAt || 0).getTime();
    return bTime - aTime;
  });
}

export function buildMemoryCarouselEntries(originalPublished: MemoryEntry[]): DisplayMemoryEntry[] {
  if (originalPublished.length === 0) return [];
  if (originalPublished.length > 5) return originalPublished;

  let cloned: DisplayMemoryEntry[] = [];
  const copiesNeeded = Math.ceil(6 / originalPublished.length);
  for (let i = 0; i < copiesNeeded; i++) {
    cloned = [
      ...cloned,
      ...originalPublished.map((entry) => ({ ...entry, _cloneId: `${entry.id}-${i}` })),
    ];
  }
  return cloned;
}
