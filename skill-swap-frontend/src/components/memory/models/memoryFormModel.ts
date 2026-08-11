export type MemoryEditorMode = "write" | "preview" | "split";

export type MemoryImageWidth = "250" | "400" | "640" | "100%";

export interface ParsedMemoryDocument {
  body: string;
  title: string;
  coverUrl: string;
  mediaUrls: string[];
}
