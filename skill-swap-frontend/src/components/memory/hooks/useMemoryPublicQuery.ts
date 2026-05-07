import { useEffect, useState } from "react";
import type { MemoryEntry } from "../../../types/memory";
import { memoryQueryService } from "../../../shared/service/memory/memoryQueryService";

export function useMemoryPublicQuery() {
  const [entries, setEntries] = useState<MemoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isCancelled = false;

    const load = async () => {
      if (!isCancelled) {
        setIsLoading(true);
      }
      try {
        const data = await memoryQueryService.getPublic();
        if (!isCancelled) {
          setEntries(data);
        }
      } catch (error) {
        console.error("Failed to load memories:", error);
        if (!isCancelled) {
          setEntries([]);
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    void load();

    return () => {
      isCancelled = true;
    };
  }, []);

  return {
    entries,
    isLoading,
  };
}
