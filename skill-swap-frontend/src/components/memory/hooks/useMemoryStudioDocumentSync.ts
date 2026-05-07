import { useEffect, useRef } from "react";
import type { MemoryEntry } from "../../../types/memory";
import { buildMemoryDocumentFromEntry } from "../utils/memoryDocument";

interface UseMemoryStudioDocumentSyncParams {
  selectedEntry: MemoryEntry | null;
  hasUnsavedDraftChanges: boolean;
  setDocumentText: (text: string) => void;
  setSelectedStatus: (status: MemoryEntry["status"]) => void;
}

export function useMemoryStudioDocumentSync({
  selectedEntry,
  hasUnsavedDraftChanges,
  setDocumentText,
  setSelectedStatus,
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
      setSelectedStatus(selectedEntry.status || "draft");
      return;
    }

    if (!selectionChanged && hasUnsavedDraftChanges && selectedEntry.status === "draft") {
      setSelectedStatus(selectedEntry.status || "draft");
      return;
    }

    setDocumentText(buildMemoryDocumentFromEntry(selectedEntry));
    setSelectedStatus(selectedEntry.status || "draft");
  }, [hasUnsavedDraftChanges, selectedEntry, setDocumentText, setSelectedStatus]);
}
