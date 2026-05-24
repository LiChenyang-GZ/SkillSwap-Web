import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { MemoryEntry } from "../../../types/memory";
import { memoryAdminService } from "../../../shared/service/memory/memoryAdminService";
import { MEMORY_STUDIO_LOAD_FAILED } from "../constants/memoryMessages";

interface UseMemoryStudioQueryParams {
  hasSession: boolean;
  getAuthToken: () => Promise<string | null>;
}

export function useMemoryStudioQuery({ hasSession, getAuthToken }: UseMemoryStudioQueryParams) {
  const [entries, setEntries] = useState<MemoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const hasLoadedEntriesForSessionRef = useRef(false);
  const hasSessionRef = useRef(hasSession);

  if (hasSessionRef.current !== hasSession) {
    hasSessionRef.current = hasSession;
    hasLoadedEntriesForSessionRef.current = false;
  }

  const loadEntries = useCallback(async (): Promise<MemoryEntry[] | null> => {
    const token = await getAuthToken();
    if (!token) return null;
    setIsLoading(true);
    try {
      const data = await memoryAdminService.getAllForAdmin(token);
      hasLoadedEntriesForSessionRef.current = true;
      setEntries(data);
      return data;
    } catch (error) {
      console.error(error);
      toast.error(MEMORY_STUDIO_LOAD_FAILED);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [getAuthToken]);

  useEffect(() => {
    if (!hasSession) {
      return;
    }
    void loadEntries();
  }, [hasSession, loadEntries]);

  return {
    entries: hasSession && hasLoadedEntriesForSessionRef.current ? entries : [],
    setEntries,
    isLoading,
    loadEntries,
  };
}
