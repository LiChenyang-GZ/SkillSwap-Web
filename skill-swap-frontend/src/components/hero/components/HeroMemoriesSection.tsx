import type { MemoryEntry } from "../../../types/memory";
import { Archive, ArrowRight, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { ImageWithFallback } from "../../figma/ImageWithFallback";
import { Button } from "../../ui/button";
import { Card } from "../../ui/card";
import { pickMemoryCover } from "../../memory/utils/memoryCover";

interface HeroMemoriesSectionProps {
  isLoadingMemories: boolean;
  featuredMemories: MemoryEntry[];
  visibleMemories: MemoryEntry[];
  hasCarouselControls: boolean;
  onShowPrevious: () => void;
  onShowNext: () => void;
  onOpenMemoryEntry: (entry: MemoryEntry) => void;
  onOpenMemoryPage: () => void;
}

export function HeroMemoriesSection({
  isLoadingMemories,
  featuredMemories,
  visibleMemories,
  hasCarouselControls,
  onShowPrevious,
  onShowNext,
  onOpenMemoryEntry,
  onOpenMemoryPage,
}: HeroMemoriesSectionProps) {
  return (
    <section id="workshops" className="py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-h1 lg:text-5xl mb-4 text-foreground">
            Our <span className="text-secondary">Memories</span>
          </h2>
        </div>

        {isLoadingMemories ? (
          <div className="py-16 flex flex-col items-center justify-center space-y-4 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p>Loading featured memories...</p>
          </div>
        ) : featuredMemories.length > 0 ? (
          <>
            <div className="flex items-center justify-center gap-4 lg:gap-6">
              {hasCarouselControls && (
                <Button
                  variant="outline"
                  size="icon"
                  className="hidden sm:inline-flex h-11 w-11 rounded-full"
                  onClick={onShowPrevious}
                  aria-label="Show previous memories"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
              )}

              <div className="flex flex-wrap justify-center gap-6 lg:gap-8">
                {visibleMemories.map((entry) => (
                  <Card
                    key={entry.id}
                    className="w-full sm:w-[320px] overflow-hidden border-0 shadow-md hover:shadow-2xl transition-all duration-300 group cursor-pointer"
                    onClick={() => onOpenMemoryEntry(entry)}
                  >
                    <div className="relative aspect-[4/5] overflow-hidden">
                      <ImageWithFallback
                        src={pickMemoryCover(entry)}
                        alt={entry.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/10" />
                      <div className="absolute inset-x-0 bottom-0 p-6 text-white text-center">
                        <p className="text-xs uppercase tracking-[0.2em] text-white/70 mb-2">Memory</p>
                        <h3 className="text-2xl font-semibold leading-snug line-clamp-3">{entry.title}</h3>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              {hasCarouselControls && (
                <Button
                  variant="outline"
                  size="icon"
                  className="hidden sm:inline-flex h-11 w-11 rounded-full"
                  onClick={onShowNext}
                  aria-label="Show next memories"
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
              )}
            </div>

            {hasCarouselControls && (
              <div className="sm:hidden mt-6 flex items-center justify-center gap-3">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 rounded-full"
                  onClick={onShowPrevious}
                  aria-label="Show previous memories"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 rounded-full"
                  onClick={onShowNext}
                  aria-label="Show next memories"
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>
            )}

            <div className="mt-10 text-center">
              <Button variant="outline" size="lg" className="group" onClick={onOpenMemoryPage}>
                See more
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </>
        ) : (
          <div className="max-w-md mx-auto text-center px-4 py-12">
            <div className="bg-muted/50 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-5">
              <Archive className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No featured memories yet</h3>
            <p className="text-muted-foreground mb-6">New memories will appear here after upcoming events.</p>
            <Button onClick={onOpenMemoryPage} variant="outline">
              Go to Memory page
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
