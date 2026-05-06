import { useEffect, useState } from "react";
import type { MemoryEntry } from "../../../types/memory";
import { memoryQueryService } from "../../../shared/service/memory/memoryQueryService";

export function useMemoryDetailQuery(slug: string) {
  const [entry, setEntry] = useState<MemoryEntry | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isCancelled = false;

    const load = async () => {
      if (!isCancelled) {
        setIsLoading(true);
      }
      try {
        const data = await memoryQueryService.getBySlug(slug);
        if (!isCancelled) {
          setEntry(data);
        }
      } catch (error) {
        console.error("Failed to load memory detail:", error);
        if (!isCancelled) {
          setEntry(null);
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
  }, [slug]);

  return {
    entry,
    isLoading,
  };
}
