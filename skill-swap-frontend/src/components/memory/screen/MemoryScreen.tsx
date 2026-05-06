import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { useApp } from "../../../contexts/AppContext";
import { useMemoryPublicQuery } from "../hooks/useMemoryPublicQuery";
import { buildMemoryCarouselEntries, sortPublishedMemories } from "../utils/memorySort";
import { MEMORY_LOADING_MESSAGE } from "../constants/memoryMessages";
import { MemoryWallCarousel } from "../components/MemoryWallCarousel";
import { MemoryWallEmptyState } from "../components/MemoryWallEmptyState";

export function MemoryScreen() {
  const { setCurrentPage } = useApp();
  const { entries, isLoading } = useMemoryPublicQuery();
  const [localLoading, setLocalLoading] = useState(true);

  useEffect(() => {
    if (!isLoading) {
      const timer = window.setTimeout(() => setLocalLoading(false), 500);
      return () => window.clearTimeout(timer);
    }

    setLocalLoading(true);
  }, [isLoading]);

  const originalPublished = useMemo(() => sortPublishedMemories(entries), [entries]);
  const displayEntries = useMemo(() => buildMemoryCarouselEntries(originalPublished), [originalPublished]);

  if (isLoading || localLoading) {
    return (
      <div className="min-h-screen bg-background pt-20 lg:pt-24 flex items-center justify-center">
        <div className="flex flex-col items-center justify-center space-y-4 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="animate-pulse">{MEMORY_LOADING_MESSAGE}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-20 lg:pt-24 flex flex-col">
      <div className="flex-1 flex flex-col justify-center pb-8 overflow-hidden">
        {originalPublished.length > 0 ? (
          <MemoryWallCarousel
            originalEntries={originalPublished}
            displayEntries={displayEntries}
            onOpenEntry={(entry) => setCurrentPage(`memory-entry-${entry.slug}`)}
          />
        ) : (
          <MemoryWallEmptyState onExplore={() => setCurrentPage("explore")} />
        )}
      </div>
    </div>
  );
}
