import type { MemoryEditorMode } from "../models/memoryFormModel";

export interface MemoryEditorModeOption {
  value: MemoryEditorMode;
  label: string;
}

export const MEMORY_EDITOR_MODE_OPTIONS: MemoryEditorModeOption[] = [
  { value: "write", label: "Write" },
  { value: "preview", label: "Preview" },
  { value: "split", label: "Split" },
];
