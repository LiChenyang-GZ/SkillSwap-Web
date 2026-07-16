import { ArrowRight, CalendarDays, Search } from "lucide-react";
import type { Workshop } from "../../../types/workshop";
import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
import { Card } from "../../ui/card";

interface HeroFeaturedWorkshopsSectionProps {
  workshops: Workshop[];
  onExplore: () => void;
  onOpenWorkshop: (workshopId: string) => void;
}

export function HeroFeaturedWorkshopsSection({ workshops, onExplore, onOpenWorkshop }: HeroFeaturedWorkshopsSectionProps) {
  const featured = workshops.slice(0, 3);

  return (
    <section id="workshops" className="py-20 px-4 sm:px-6 lg:px-8 bg-foreground text-background">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-10">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-secondary">Learn something unexpected</p>
            <h2 className="mt-4 max-w-2xl text-4xl lg:text-5xl font-semibold tracking-tight">Your next favourite skill could start here.</h2>
          </div>
          <Button onClick={onExplore} variant="outline" className="self-start md:self-auto rounded-full border-background/20 bg-background/10 text-background hover:bg-background/20 hover:text-background">
            Browse all workshops <ArrowRight className="h-4 w-4" />
          </Button>
        </div>

        {featured.length > 0 ? (
          <div className="grid md:grid-cols-3 gap-5">
            {featured.map((workshop) => (
              <Card
                key={workshop.id}
                role="button"
                tabIndex={0}
                onClick={() => onOpenWorkshop(workshop.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onOpenWorkshop(workshop.id);
                  }
                }}
                className="group cursor-pointer gap-0 overflow-hidden border-background/10 bg-background/5 text-background transition-all hover:-translate-y-1 hover:bg-background/10"
              >
                <div className="aspect-[4/3] overflow-hidden bg-background/10">
                  {workshop.image ? (
                    <img src={workshop.image} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  ) : (
                    <div className="h-full flex items-center justify-center"><Search className="h-8 w-8 text-background/35" /></div>
                  )}
                </div>
                <div className="p-6">
                  <Badge className="border-0 bg-secondary text-secondary-foreground">{workshop.category}</Badge>
                  <h3 className="mt-4 text-xl font-semibold line-clamp-2">{workshop.title}</h3>
                  <div className="mt-4 flex items-center gap-2 text-sm text-background/60">
                    <CalendarDays className="h-4 w-4" />
                    {new Date(workshop.date).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="rounded-[2rem] border border-dashed border-background/20 bg-background/5 px-6 py-14 text-center">
            <Search className="mx-auto h-8 w-8 text-secondary" />
            <h3 className="mt-4 text-xl font-semibold">New workshops are on the way</h3>
            <p className="mt-2 text-background/60">Explore the community or become the next person to share a skill.</p>
            <Button onClick={onExplore} className="mt-6 rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/90">Explore SkillSwap</Button>
          </div>
        )}
      </div>
    </section>
  );
}
