export type MemoryEditorMode = "write" | "preview" | "split";

export interface ParsedMemoryDocument {
  body: string;
  title: string;
  coverUrl: string;
  mediaUrls: string[];
}
