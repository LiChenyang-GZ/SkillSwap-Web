import { useEffect, useMemo, useState } from "react";
import type { MemoryEntry } from "../../../types/memory";
import { sortPublishedMemories } from "../../memory/utils/memorySort";

export const useHeroMemoryCarousel = (entries: MemoryEntry[]) => {
  const [carouselStartIndex, setCarouselStartIndex] = useState(0);

  const featuredMemories = useMemo(() => sortPublishedMemories(entries), [entries]);
  const featuredMemoryOrderSignature = useMemo(
    () => featuredMemories.map((entry) => entry.id).join("|"),
    [featuredMemories]
  );
  const hasCarouselControls = featuredMemories.length > 3;

  useEffect(() => {
    if (featuredMemories.length === 0) {
      setCarouselStartIndex(0);
      return;
    }

    if (carouselStartIndex >= featuredMemories.length) {
      setCarouselStartIndex(0);
    }
  }, [carouselStartIndex, featuredMemories.length]);

  useEffect(() => {
    setCarouselStartIndex(0);
  }, [featuredMemoryOrderSignature]);

  const visibleMemories = useMemo(() => {
    if (featuredMemories.length <= 3) {
      return featuredMemories;
    }

    return Array.from({ length: 3 }, (_, offset) => {
      const index = (carouselStartIndex + offset) % featuredMemories.length;
      return featuredMemories[index];
    });
  }, [carouselStartIndex, featuredMemories]);

  const showPreviousMemories = () => {
    if (!hasCarouselControls) return;
    setCarouselStartIndex((prev) => (prev - 1 + featuredMemories.length) % featuredMemories.length);
  };

  const showNextMemories = () => {
    if (!hasCarouselControls) return;
    setCarouselStartIndex((prev) => (prev + 1) % featuredMemories.length);
  };

  return {
    featuredMemories,
    visibleMemories,
    hasCarouselControls,
    showPreviousMemories,
    showNextMemories,
  };
};
