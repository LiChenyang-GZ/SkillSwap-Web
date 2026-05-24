import { useCallback, useMemo, useReducer } from "react";
import type { SetStateAction } from "react";
import type { MemoryEntry } from "../../../types/memory";
import { MEMORY_ENTRY_PAGE_SIZE } from "../constants/memoryUiConstants";

interface UseMemoryStudioSelectionParams {
  entries: MemoryEntry[];
}

interface MemoryStudioSelectionState {
  selectedId: string | null;
  isCreatingNew: boolean;
  selectedStatus: MemoryEntry["status"];
  requestedEntryPage: number;
}

type MemoryStudioSelectionAction =
  | { type: "start-create-new" }
  | { type: "select-entry"; entryId: string | null }
  | { type: "set-creating-new"; value: boolean }
  | { type: "set-selected-status"; status: MemoryEntry["status"] }
  | { type: "set-entry-page"; update: SetStateAction<number> }
  | { type: "reset" };

const initialSelectionState: MemoryStudioSelectionState = {
  selectedId: null,
  isCreatingNew: false,
  selectedStatus: "draft",
  requestedEntryPage: 1,
};

const resolveNextPage = (previous: number, update: SetStateAction<number>) => {
  const next = typeof update === "function" ? update(previous) : update;
  return Math.max(1, next);
};

function memoryStudioSelectionReducer(
  state: MemoryStudioSelectionState,
  action: MemoryStudioSelectionAction
): MemoryStudioSelectionState {
  switch (action.type) {
    case "start-create-new":
      return {
        ...state,
        selectedId: null,
        isCreatingNew: true,
        selectedStatus: "draft",
      };
    case "select-entry":
      return {
        ...state,
        selectedId: action.entryId,
        isCreatingNew: false,
      };
    case "set-creating-new":
      return {
        ...state,
        isCreatingNew: action.value,
      };
    case "set-selected-status":
      return {
        ...state,
        selectedStatus: action.status,
      };
    case "set-entry-page":
      return {
        ...state,
        requestedEntryPage: resolveNextPage(state.requestedEntryPage, action.update),
      };
    case "reset":
      return initialSelectionState;
    default:
      return state;
  }
}

export function useMemoryStudioSelection({ entries }: UseMemoryStudioSelectionParams) {
  const [state, dispatch] = useReducer(memoryStudioSelectionReducer, initialSelectionState);

  const selectedId = useMemo(() => {
    if (state.isCreatingNew || entries.length === 0) {
      return null;
    }
    if (state.selectedId && entries.some((entry) => entry.id === state.selectedId)) {
      return state.selectedId;
    }
    return entries[0].id;
  }, [entries, state.isCreatingNew, state.selectedId]);

  const selectedEntry = useMemo(() => entries.find((entry) => entry.id === selectedId) || null, [entries, selectedId]);

  const totalEntryPages = useMemo(
    () => Math.max(1, Math.ceil(entries.length / MEMORY_ENTRY_PAGE_SIZE)),
    [entries.length]
  );

  const entryPage = Math.min(state.requestedEntryPage, totalEntryPages);

  const pagedEntries = useMemo(() => {
    const start = (entryPage - 1) * MEMORY_ENTRY_PAGE_SIZE;
    return entries.slice(start, start + MEMORY_ENTRY_PAGE_SIZE);
  }, [entries, entryPage]);

  const startCreateNew = useCallback(() => {
    dispatch({ type: "start-create-new" });
  }, []);

  const selectEntry = useCallback((entryId: string) => {
    dispatch({ type: "select-entry", entryId });
  }, []);

  const resetSelectionState = useCallback(() => {
    dispatch({ type: "reset" });
  }, []);

  const setSelectedId = useCallback((entryId: string | null) => {
    dispatch({ type: "select-entry", entryId });
  }, []);

  const setIsCreatingNew = useCallback((value: boolean) => {
    dispatch({ type: "set-creating-new", value });
  }, []);

  const setSelectedStatus = useCallback((status: MemoryEntry["status"]) => {
    dispatch({ type: "set-selected-status", status });
  }, []);

  const setEntryPage = useCallback((update: SetStateAction<number>) => {
    dispatch({ type: "set-entry-page", update });
  }, []);

  return {
    selectedId,
    setSelectedId,
    selectedEntry,
    isCreatingNew: state.isCreatingNew,
    setIsCreatingNew,
    selectedStatus: state.selectedStatus,
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
