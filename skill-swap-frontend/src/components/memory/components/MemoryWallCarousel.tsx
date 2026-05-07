import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";
import type { DisplayMemoryEntry } from "../models/memoryViewModel";
import type { MemoryEntry } from "../../../types/memory";
import { Button } from "../../ui/button";
import { MEMORY_FALLBACK_COVER } from "../constants/memoryUiConstants";
import { pickMemoryCover } from "../utils/memoryCover";

interface MemoryWallCarouselProps {
  originalEntries: MemoryEntry[];
  displayEntries: DisplayMemoryEntry[];
  onOpenEntry: (entry: MemoryEntry) => void;
}

export function MemoryWallCarousel({ originalEntries, displayEntries, onOpenEntry }: MemoryWallCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: "center", skipSnaps: false });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const activeDotIndex = originalEntries.length > 0 ? selectedIndex % originalEntries.length : 0;

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
  }, [emblaApi, onSelect]);

  return (
    <div className="relative w-full max-w-[100vw] mx-auto">
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex backface-hidden touch-pan-y items-center py-10">
          {displayEntries.map((entry, index) => {
            const cover = pickMemoryCover(entry);
            const isActive = index === selectedIndex;
            return (
              <div
                key={entry._cloneId || entry.id}
                className="relative flex-[0_0_85%] sm:flex-[0_0_60%] md:flex-[0_0_45%] lg:flex-[0_0_35%] min-w-0 px-4"
                onClick={() => {
                  if (!isActive) {
                    emblaApi?.scrollTo(index);
                  } else if (entry.slug) {
                    onOpenEntry(entry);
                  }
                }}
              >
                <div
                  className={`group relative w-full aspect-[4/5] sm:aspect-square md:aspect-[3/4] max-h-[70vh] mx-auto rounded-3xl overflow-hidden shadow-2xl transition-all duration-700 ease-out cursor-pointer ${
                    isActive
                      ? "scale-100 opacity-100 z-10 shadow-primary/20"
                      : "scale-[0.85] opacity-40 z-0 hover:opacity-60 shadow-none"
                  }`}
                >
                  <img
                    src={cover}
                    alt={entry.title}
                    onError={(event) => {
                      if (event.currentTarget.src !== MEMORY_FALLBACK_COVER) {
                        event.currentTarget.src = MEMORY_FALLBACK_COVER;
                      }
                    }}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10" />
                  <div className="absolute inset-0 p-6 sm:p-8 flex flex-col justify-end text-white">
                    <div
                      className={`transition-all duration-700 delay-100 transform ${
                        isActive ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
                      }`}
                    >
                      <h3 className="text-3xl sm:text-4xl font-bold mb-6 leading-tight drop-shadow-md text-center line-clamp-3">
                        {entry.title}
                      </h3>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-center gap-4 mt-6">
        <Button
          variant="outline"
          size="icon"
          className="w-10 h-10 rounded-full border-muted-foreground/20 hover:bg-muted"
          onClick={scrollPrev}
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <div className="flex gap-2 isolate">
          {originalEntries.map((_, index) => (
            <button
              key={index}
              onClick={() => emblaApi?.scrollTo(index)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                index === activeDotIndex ? "bg-primary w-6" : "bg-muted-foreground/30 w-1.5 hover:bg-muted-foreground/50"
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
        <Button
          variant="outline"
          size="icon"
          className="w-10 h-10 rounded-full border-muted-foreground/20 hover:bg-muted"
          onClick={scrollNext}
        >
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}
