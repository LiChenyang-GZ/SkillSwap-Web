import rehypeSanitize, { defaultSchema } from "rehype-sanitize";

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

export const memoryMarkdownSanitizeSchema = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames || []), "u"],
};

export const MEMORY_MARKDOWN_REHYPE_PLUGINS = [rehypeSanitize, memoryMarkdownSanitizeSchema] as const;
