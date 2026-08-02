import { ArrowRight } from "lucide-react";
import { BRAND_FOX_EMPTY_MEMORY_SRC, BRAND_FOX_EMPTY_SEARCH_SRC } from "../../../shared/constants";
import type { MemoryEntry } from "../../../types/memory";
import { pickMemoryCover } from "../../memory/utils/memoryCover";
import { ImageWithFallback } from "../../ui/ImageWithFallback";
import { Button } from "../../ui/button";

interface HeroMemoriesSectionProps {
  isLoadingMemories: boolean;
  featuredMemories: MemoryEntry[];
  onOpenMemoryEntry: (entry: MemoryEntry) => void;
  onOpenMemoryPage: () => void;
}

export function HeroMemoriesSection({
  isLoadingMemories,
  featuredMemories,
  onOpenMemoryEntry,
  onOpenMemoryPage,
}: HeroMemoriesSectionProps) {
  return (
    <section id="memories" className="px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 grid gap-6 md:grid-cols-[1fr_0.7fr] md:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-primary">Stories from the circle</p>
            <h2 className="mt-4 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
              The skill is only half the story.
            </h2>
          </div>
          <p className="text-lg leading-relaxed text-muted-foreground md:pb-1">
            These are the afternoons when strangers tried something new, helped one another through it, and left a little more connected.
          </p>
        </div>

        {isLoadingMemories ? (
          <div role="status" aria-live="polite" className="rounded-[2rem] border border-foreground/10 bg-card px-6 py-14 text-center">
            <img src={BRAND_FOX_EMPTY_SEARCH_SRC} alt="" aria-hidden="true" className="mx-auto h-20 w-20 animate-pulse object-contain" />
            <p className="mt-4 font-medium text-foreground">Gathering community stories…</p>
            <p className="mt-1 text-sm text-muted-foreground">They will be here in a moment.</p>
          </div>
        ) : featuredMemories.length > 0 ? (
          <>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {featuredMemories.map((entry, index) => (
                <button
                  type="button"
                  key={entry.id}
                  onClick={() => onOpenMemoryEntry(entry)}
                  className={`group relative min-h-[27rem] overflow-hidden rounded-[1.75rem] border border-foreground/10 bg-card text-left shadow-md transition duration-300 hover:-translate-y-1 hover:shadow-2xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/60 ${
                    index === 2 ? "sm:col-span-2 lg:col-span-1" : ""
                  }`}
                  aria-label={`Read the community story: ${entry.title}`}
                >
                  <ImageWithFallback
                    src={pickMemoryCover(entry)}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-black/5" />
                  <div className="absolute inset-x-0 bottom-0 p-6 text-white">
                    <p className="text-xs font-bold uppercase tracking-[0.22em] text-white/70">From our memory wall</p>
                    <h3 className="mt-3 text-2xl font-semibold leading-snug">{entry.title}</h3>
                    <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold">
                      Read the story
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                    </span>
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-10 text-center">
              <Button variant="outline" size="lg" className="group rounded-full bg-card" onClick={onOpenMemoryPage}>
                Visit the memory wall
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
              </Button>
            </div>
          </>
        ) : (
          <div className="grid overflow-hidden rounded-[2rem] border border-foreground/10 bg-card sm:grid-cols-[0.72fr_1fr]">
            <div className="flex min-h-64 items-end justify-center bg-secondary/15 px-6 pt-8">
              <img
                src={BRAND_FOX_EMPTY_MEMORY_SRC}
                alt="SkillSwap fox looking through an empty scrapbook"
                className="max-h-56 w-auto object-contain"
              />
            </div>
            <div className="flex flex-col items-start justify-center p-7 sm:p-10">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary">A fresh page</p>
              <h3 className="mt-3 text-2xl font-semibold">The next story has not been written yet.</h3>
              <p className="mt-3 leading-relaxed text-muted-foreground">
                New memories appear after community events. Until then, you can be part of the next one.
              </p>
              <Button onClick={onOpenMemoryPage} variant="outline" className="mt-6 rounded-full">
                Visit the memory wall
              </Button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
