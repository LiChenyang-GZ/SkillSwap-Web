import { useEffect, useState, useCallback, useMemo } from 'react';
import { useApp } from '../contexts/AppContext';
import { Button } from './ui/button';
import { Archive, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import useEmblaCarousel from 'embla-carousel-react';
import { Workshop } from '../types';

function isOldWorkshop(workshop: Workshop): boolean {
  const status = (workshop.status || '').toLowerCase();
  if (status === 'completed' || status === 'cancelled') return true;

  if (!workshop.date) return false;
  const time = workshop.time || '00:00';
  const dateTime = new Date(`${workshop.date}T${time}`);
  if (Number.isNaN(dateTime.getTime())) return false;

  return dateTime.getTime() < Date.now();
}

export function Memory() {
  const { workshops, setCurrentPage, isLoading, isAuthenticated, refreshData } = useApp();
  
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: 'center', skipSnaps: false });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [localLoading, setLocalLoading] = useState(true);
  const [backfillTriggered, setBackfillTriggered] = useState(false);

  // Fallback timer for smooth UI transition
  useEffect(() => {
    if (!isLoading) {
      const timer = setTimeout(() => setLocalLoading(false), 500);
      return () => clearTimeout(timer);
    } else {
      setLocalLoading(true);
    }
  }, [isLoading]);

  // Backfill: 页面刷新时如果 Auth 最初为 false，第一次 fetchVisibleWorkshops(full) 仅仅会拉取 public 数据。
  // 在获取到了真实的登录态 (isAuthenticated === true) 且没发现历史活动时，强制要求刷新补全 mine 数据。
  useEffect(() => {
    if (!isAuthenticated || backfillTriggered) return;

    const hasArchived = workshops.some(isOldWorkshop);
    if (hasArchived) return;

    // setTimeout 到宏任务队列结尾执行，防止如果第一波 public 请求还在被 refreshInFlightRef 拦截。
    const timer = window.setTimeout(() => {
      void refreshData('full');
      setBackfillTriggered(true);
    }, 50);

    return () => window.clearTimeout(timer);
  }, [backfillTriggered, isAuthenticated, refreshData, workshops]);

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

  const originalArchived = useMemo(() => workshops
    .filter(isOldWorkshop)
    .sort((a, b) => {
      const aTime = new Date(`${a.date}T${a.time || '00:00'}`).getTime();
      const bTime = new Date(`${b.date}T${b.time || '00:00'}`).getTime();
      return bTime - aTime;
    }), [workshops]);

  const displayWorkshops = useMemo(() => {
    if (originalArchived.length === 0) return [];
    if (originalArchived.length > 5) return originalArchived;
    
    // Duplicate array to ensure Embla can loop properly
    let cloned: Workshop[] = [];
    const copiesNeeded = Math.ceil(6 / originalArchived.length);
    for (let i = 0; i < copiesNeeded; i++) {
        cloned = [...cloned, ...originalArchived.map(w => ({ ...w, _cloneId: `${w.id}-${i}` })) as any];
    }
    return cloned;
  }, [originalArchived]);

  const activeDotIndex = originalArchived.length > 0 ? selectedIndex % originalArchived.length : 0;

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
        {originalArchived.length > 0 ? (
          <div className="relative w-full max-w-[100vw] mx-auto">
            <div className="overflow-hidden" ref={emblaRef}>
              <div className="flex backface-hidden touch-pan-y items-center py-10">
                {displayWorkshops.map((workshop: any, index) => {
                  const isActive = index === selectedIndex;
                  return (
                    <div
                      key={workshop._cloneId || workshop.id}
                      className="relative flex-[0_0_85%] sm:flex-[0_0_60%] md:flex-[0_0_45%] lg:flex-[0_0_35%] min-w-0 px-4"
                      onClick={() => {
                        if (!isActive) {
                           emblaApi?.scrollTo(index);
                        } else {
                           setCurrentPage(`workshop-${workshop.id}`);
                        }
                      }}
                    >
                      <div 
                        className={`group relative w-full aspect-[4/5] sm:aspect-square md:aspect-[3/4] max-h-[70vh] mx-auto rounded-3xl overflow-hidden shadow-2xl transition-all duration-700 ease-out cursor-pointer ${
                          isActive ? 'scale-100 opacity-100 z-10 shadow-primary/20' : 'scale-[0.85] opacity-40 z-0 hover:opacity-60 shadow-none'
                        }`}
                      >
                        <img
                          src={workshop.image || 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80'}
                          alt={workshop.title}
                          className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10" />
                        <div className="absolute inset-0 p-6 sm:p-8 flex flex-col justify-end text-white">
                          <div className={`transition-all duration-700 delay-100 transform ${isActive ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
                            <h3 className="text-3xl sm:text-4xl font-bold mb-6 leading-tight drop-shadow-md text-center">
                              {workshop.title}
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
                {originalArchived.map((_, index) => (
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
            <h3 className="text-2xl font-bold mb-3">No past workshops yet</h3>
            <p className="text-muted-foreground mb-8">
              Looks like we haven't archived any workshops yet. Check back here after our upcoming events!
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
