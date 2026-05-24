import { useEffect, useRef } from "react";
import type { MemoryEntry } from "../../../types/memory";
import { buildMemoryDocumentFromEntry } from "../utils/memoryDocument";

interface UseMemoryStudioDocumentSyncParams {
  selectedEntry: MemoryEntry | null;
  hasUnsavedDraftChanges: boolean;
  onSyncSelectedEntry: (documentText: string | null, status: MemoryEntry["status"]) => void;
}

export function useMemoryStudioDocumentSync({
  selectedEntry,
  hasUnsavedDraftChanges,
  onSyncSelectedEntry,
}: UseMemoryStudioDocumentSyncParams) {
  const lastSyncedEntryIdRef = useRef<string | null>(null);
  const skipNextSelectionSyncRef = useRef(false);

  useEffect(() => {
    if (!selectedEntry) return;

    const entryId = selectedEntry.id ? String(selectedEntry.id) : null;
    const selectionChanged = entryId !== null && lastSyncedEntryIdRef.current !== entryId;

    if (selectionChanged) {
      lastSyncedEntryIdRef.current = entryId;
    }

    if (skipNextSelectionSyncRef.current) {
      skipNextSelectionSyncRef.current = false;
      onSyncSelectedEntry(null, selectedEntry.status || "draft");
      return;
    }

    if (!selectionChanged && hasUnsavedDraftChanges && selectedEntry.status === "draft") {
      onSyncSelectedEntry(null, selectedEntry.status || "draft");
      return;
    }

    onSyncSelectedEntry(buildMemoryDocumentFromEntry(selectedEntry), selectedEntry.status || "draft");
  }, [hasUnsavedDraftChanges, onSyncSelectedEntry, selectedEntry]);
}
