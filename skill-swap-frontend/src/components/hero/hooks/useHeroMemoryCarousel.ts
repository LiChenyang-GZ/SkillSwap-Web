import { useMemo, useState } from "react";
import type { MemoryEntry } from "../../../types/memory";
import { sortPublishedMemories } from "../../memory/utils/memorySort";

export const useHeroMemoryCarousel = (entries: MemoryEntry[]) => {
  const [carouselState, setCarouselState] = useState({
    orderSignature: "",
    startIndex: 0,
  });

  const featuredMemories = useMemo(() => sortPublishedMemories(entries), [entries]);
  const featuredMemoryOrderSignature = useMemo(
    () => featuredMemories.map((entry) => entry.id).join("|"),
    [featuredMemories]
  );
  const hasCarouselControls = featuredMemories.length > 3;
  const carouselStartIndex =
    carouselState.orderSignature === featuredMemoryOrderSignature && featuredMemories.length > 0
      ? carouselState.startIndex % featuredMemories.length
      : 0;

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
    setCarouselState({
      orderSignature: featuredMemoryOrderSignature,
      startIndex: (carouselStartIndex - 1 + featuredMemories.length) % featuredMemories.length,
    });
  };

  const showNextMemories = () => {
    if (!hasCarouselControls) return;
    setCarouselState({
      orderSignature: featuredMemoryOrderSignature,
      startIndex: (carouselStartIndex + 1) % featuredMemories.length,
    });
  };

  return {
    featuredMemories,
    visibleMemories,
    hasCarouselControls,
    showPreviousMemories,
    showNextMemories,
  };
};
