import { useCallback, useEffect, useMemo, useState } from "react";
import type { MemoryEntry } from "../../../types/memory";
import { MEMORY_ENTRY_PAGE_SIZE } from "../constants/memoryUiConstants";

interface UseMemoryStudioSelectionParams {
  entries: MemoryEntry[];
}

export function useMemoryStudioSelection({ entries }: UseMemoryStudioSelectionParams) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<MemoryEntry["status"]>("draft");
  const [entryPage, setEntryPage] = useState(1);

  const selectedEntry = useMemo(
    () => entries.find((entry) => entry.id === selectedId) || null,
    [entries, selectedId]
  );

  const totalEntryPages = useMemo(
    () => Math.max(1, Math.ceil(entries.length / MEMORY_ENTRY_PAGE_SIZE)),
    [entries.length]
  );

  const pagedEntries = useMemo(() => {
    const start = (entryPage - 1) * MEMORY_ENTRY_PAGE_SIZE;
    return entries.slice(start, start + MEMORY_ENTRY_PAGE_SIZE);
  }, [entries, entryPage]);

  useEffect(() => {
    if (entryPage > totalEntryPages) {
      setEntryPage(totalEntryPages);
    }
  }, [entryPage, totalEntryPages]);

  useEffect(() => {
    if (entries.length === 0) {
      if (selectedId !== null) {
        setSelectedId(null);
      }
      return;
    }

    if (!selectedId || !entries.some((entry) => entry.id === selectedId)) {
      if (isCreatingNew) {
        return;
      }
      setSelectedId(entries[0].id);
    }
  }, [entries, selectedId, isCreatingNew]);

  const startCreateNew = useCallback(() => {
    setIsCreatingNew(true);
    setSelectedId(null);
    setSelectedStatus("draft");
  }, []);

  const selectEntry = useCallback((entryId: string) => {
    setIsCreatingNew(false);
    setSelectedId(entryId);
  }, []);

  const resetSelectionState = useCallback(() => {
    setSelectedId(null);
    setIsCreatingNew(false);
    setSelectedStatus("draft");
    setEntryPage(1);
  }, []);

  return {
    selectedId,
    setSelectedId,
    selectedEntry,
    isCreatingNew,
    setIsCreatingNew,
    selectedStatus,
    setSelectedStatus,
    entryPage,
    setEntryPage,
    pagedEntries,
    totalEntryPages,
    startCreateNew,
    selectEntry,
    resetSelectionState,
  };
}
