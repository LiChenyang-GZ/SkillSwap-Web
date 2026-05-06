import { MEMORY_FALLBACK_COVER } from "../constants/memoryUiConstants";
import type { MemoryEntry } from "../../../types/memory";

export function pickMemoryCover(entry: MemoryEntry): string {
  const raw = (entry.coverUrl || entry.mediaUrls[0] || "").trim();
  if (!raw) return MEMORY_FALLBACK_COVER;

  const unquoted = raw.replace(/^['"]|['"]$/g, "");
  const markdownImage = unquoted.match(/^!\[[^\]]*\]\(([^)]+)\)$/);
  if (markdownImage?.[1]) {
    return markdownImage[1].trim() || MEMORY_FALLBACK_COVER;
  }

  return unquoted;
}
