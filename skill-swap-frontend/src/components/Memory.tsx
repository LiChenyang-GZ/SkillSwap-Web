import { useCallback, useEffect, useMemo, useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { memoryAPI } from '../lib/api';
import { MemoryEntry } from '../types';
import { Button } from './ui/button';
import { Archive, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import useEmblaCarousel from 'embla-carousel-react';

const fallbackCover = 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=1200&q=80';

type DisplayMemoryEntry = MemoryEntry & { _cloneId?: string };

function pickCover(entry: MemoryEntry): string {
  const raw = (entry.coverUrl || entry.mediaUrls[0] || '').trim();
  if (!raw) return fallbackCover;

  const markdownImage = raw.match(/^!\[[^\]]*\]\(([^)]+)\)$/);
  if (markdownImage?.[1]) {
    return markdownImage[1].trim() || fallbackCover;
  }

  return raw;
}

export function Memory() {
  const { setCurrentPage } = useApp();
  const [entries, setEntries] = useState<MemoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [localLoading, setLocalLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const data = await memoryAPI.getPublic();
        setEntries(data);
      } catch (error) {
        console.error('Failed to load memories:', error);
        setEntries([]);
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, []);

  // Keep the old page transition feeling from the original Memory page.
  useEffect(() => {
    if (!isLoading) {
      const timer = window.setTimeout(() => setLocalLoading(false), 500);
      return () => window.clearTimeout(timer);
    }

    setLocalLoading(true);
  }, [isLoading]);

  const originalPublished = useMemo(
    () => [...entries].sort((a, b) => {
      const aTime = new Date(a.publishedAt || a.updatedAt || a.createdAt || 0).getTime();
      const bTime = new Date(b.publishedAt || b.updatedAt || b.createdAt || 0).getTime();
      return bTime - aTime;
    }),
    [entries]
  );

  const displayEntries = useMemo<DisplayMemoryEntry[]>(() => {
    if (originalPublished.length === 0) return [];
    if (originalPublished.length > 5) return originalPublished;

    let cloned: DisplayMemoryEntry[] = [];
    const copiesNeeded = Math.ceil(6 / originalPublished.length);
    for (let i = 0; i < copiesNeeded; i++) {
      cloned = [
        ...cloned,
        ...originalPublished.map((entry) => ({ ...entry, _cloneId: `${entry.id}-${i}` })),
      ];
    }
    return cloned;
  }, [originalPublished]);

  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: 'center', skipSnaps: false });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const activeDotIndex = originalPublished.length > 0 ? selectedIndex % originalPublished.length : 0;

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
    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', onSelect);
  }, [emblaApi, onSelect]);

  if (isLoading || localLoading) {
    return (
      <div className="min-h-screen bg-background pt-20 lg:pt-24 flex items-center justify-center">
        <div className="flex flex-col items-center justify-center space-y-4 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="animate-pulse">Loading memories...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-20 lg:pt-24 flex flex-col">
      <div className="flex-1 flex flex-col justify-center pb-8 overflow-hidden">
        {originalPublished.length > 0 ? (
          <div className="relative w-full max-w-[100vw] mx-auto">
            <div className="overflow-hidden" ref={emblaRef}>
              <div className="flex backface-hidden touch-pan-y items-center py-10">
                {displayEntries.map((entry, index) => {
                  const cover = pickCover(entry);
                  const isActive = index === selectedIndex;
                  return (
                    <div
                      key={entry._cloneId || entry.id}
                      className="relative flex-[0_0_85%] sm:flex-[0_0_60%] md:flex-[0_0_45%] lg:flex-[0_0_35%] min-w-0 px-4"
                      onClick={() => {
                        if (!isActive) {
                          emblaApi?.scrollTo(index);
                        } else if (entry.slug) {
                          setCurrentPage(`memory-entry-${entry.slug}`);
                        }
                      }}
                    >
                      <div
                        className={`group relative w-full aspect-[4/5] sm:aspect-square md:aspect-[3/4] max-h-[70vh] mx-auto rounded-3xl overflow-hidden shadow-2xl transition-all duration-700 ease-out cursor-pointer ${
                          isActive ? 'scale-100 opacity-100 z-10 shadow-primary/20' : 'scale-[0.85] opacity-40 z-0 hover:opacity-60 shadow-none'
                        }`}
                      >
                        <img
                          src={cover}
                          alt={entry.title}
                          onError={(event) => {
                            if (event.currentTarget.src !== fallbackCover) {
                              event.currentTarget.src = fallbackCover;
                            }
                          }}
                          className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10" />
                        <div className="absolute inset-0 p-6 sm:p-8 flex flex-col justify-end text-white">
                          <div className={`transition-all duration-700 delay-100 transform ${isActive ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
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
                {originalPublished.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => emblaApi?.scrollTo(index)}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      index === activeDotIndex ? 'bg-primary w-6' : 'bg-muted-foreground/30 w-1.5 hover:bg-muted-foreground/50'
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
        ) : (
          <div className="max-w-md mx-auto text-center px-4">
            <div className="bg-muted/50 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6">
              <Archive className="w-12 h-12 text-muted-foreground" />
            </div>
            <h3 className="text-2xl font-bold mb-3">No memories published yet</h3>
            <p className="text-muted-foreground mb-8">
              Looks like we haven't published any memories yet. Check back here after upcoming events.
            </p>
            <Button onClick={() => setCurrentPage('explore')} size="lg" className="rounded-full">
              Explore upcoming workshops
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
