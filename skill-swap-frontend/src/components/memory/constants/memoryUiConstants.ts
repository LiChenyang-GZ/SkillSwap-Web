import { defaultSchema } from "rehype-sanitize";
import type { MemoryImageWidth } from "../models/memoryFormModel";

export const MEMORY_FALLBACK_COVER =
  "https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=1200&q=80";

export const MEMORY_ENTRY_PAGE_SIZE = 10;
export const MEMORY_LOCK_HEARTBEAT_MS = 60_000;

export const MEMORY_EMPTY_DOC = `---
title:
cover:
---

#

Write your memory story here...
`;

export const MEMORY_IMAGE_WIDTH_STORAGE_KEY = "skill_swap_memory_image_width";

export const MEMORY_IMAGE_WIDTH_DEFAULT: MemoryImageWidth = "250";

export const MEMORY_IMAGE_WIDTH_OPTIONS: Array<{ value: MemoryImageWidth; label: string }> = [
  { value: "250", label: "Small · 250px" },
  { value: "400", label: "Medium · 400px" },
  { value: "640", label: "Large · 640px" },
  { value: "100%", label: "Full width" },
];

export function isMemoryImageWidth(value: string): value is MemoryImageWidth {
  return MEMORY_IMAGE_WIDTH_OPTIONS.some((option) => option.value === value);
}

export const memoryMarkdownSanitizeSchema = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames || []), "u"],
};
