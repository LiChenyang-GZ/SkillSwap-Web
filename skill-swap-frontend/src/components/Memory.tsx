import { useEffect, useState, useCallback } from 'react';
import { useApp } from '../contexts/AppContext';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Archive, ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
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
  const { workshops, setCurrentPage, isAuthenticated, refreshData } = useApp();
  
  const [backfillTriggered, setBackfillTriggered] = useState(false);
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: 'center', skipSnaps: false });
  const [selectedIndex, setSelectedIndex] = useState(0);

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

  useEffect(() => {
    if (!isAuthenticated || backfillTriggered) return;

    const hasArchived = workshops.some(isOldWorkshop);
    if (hasArchived) return;

    const timer = window.setTimeout(() => {
      void refreshData('full');
      setBackfillTriggered(true);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [backfillTriggered, isAuthenticated, refreshData, workshops]);

  const archivedWorkshops = workshops
    .filter(isOldWorkshop)
    .sort((a, b) => {
      const aTime = new Date(`${a.date}T${a.time || '00:00'}`).getTime();
      const bTime = new Date(`${b.date}T${b.time || '00:00'}`).getTime();
      return bTime - aTime;
    });

  return (
    <div className="min-h-screen bg-background pt-20 lg:pt-24 flex flex-col">
      <div className="flex-1 flex flex-col justify-center pb-12 overflow-hidden">
        {archivedWorkshops.length > 0 ? (
          <div className="relative w-full max-w-[100vw] mx-auto">
            <div className="overflow-hidden" ref={emblaRef}>
              <div className="flex backface-hidden touch-pan-y items-center py-10">
                {archivedWorkshops.map((workshop, index) => {
                  const isActive = index === selectedIndex;
                  return (
                    <div
                      key={workshop.id}
                      className={`relative flex-[0_0_85%] sm:flex-[0_0_60%] md:flex-[0_0_45%] lg:flex-[0_0_35%] min-w-0 transition-all duration-700 ease-out px-4 select-none ${
                        isActive ? 'scale-100 opacity-100 z-10' : 'scale-[0.85] opacity-40 z-0 cursor-pointer hover:opacity-60'
                      }`}
                      onClick={() => !isActive && emblaApi?.scrollTo(index)}
                    >
                      <div 
                        className={`relative w-full aspect-[4/5] sm:aspect-square md:aspect-[3/4] rounded-3xl overflow-hidden shadow-2xl transition-shadow duration-500 ${isActive ? 'shadow-primary/20' : 'shadow-none'}`}
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

                            <div className="flex items-center justify-center gap-4 mt-auto pt-4">
                              <Button 
                                onClick={() => setCurrentPage(`workshop-${workshop.id}`)}
                                className="rounded-full px-6 bg-white text-black hover:bg-white/90 transition-transform active:scale-95 shadow-lg group"
                              >
                                View Details
                                <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-center gap-4 mt-8">
              <Button
                variant="outline"
                size="icon"
                className="w-12 h-12 rounded-full border-muted-foreground/20 hover:bg-muted"
                onClick={scrollPrev}
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <div className="flex gap-2 isolate">
                {archivedWorkshops.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => emblaApi?.scrollTo(index)}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      index === selectedIndex ? 'bg-primary w-8' : 'bg-muted-foreground/30 w-2 hover:bg-muted-foreground/50'
                    }`}
                    aria-label={`Go to slide ${index + 1}`}
                  />
                ))}
              </div>
              <Button
                variant="outline"
                size="icon"
                className="w-12 h-12 rounded-full border-muted-foreground/20 hover:bg-muted"
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
