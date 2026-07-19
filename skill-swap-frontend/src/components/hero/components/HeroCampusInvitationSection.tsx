import { ArrowRight, MapPin } from "lucide-react";
import { Button } from "../../ui/button";

interface HeroCampusInvitationSectionProps {
  onJoin: () => void;
}

export function HeroCampusInvitationSection({ onJoin }: HeroCampusInvitationSectionProps) {
  return (
    <section className="px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
      <div className="mx-auto max-w-6xl overflow-hidden rounded-[2rem] bg-foreground px-6 py-9 text-background sm:px-10 sm:py-12">
        <div className="grid items-center gap-8 md:grid-cols-[1fr_auto]">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-secondary">
              <MapPin className="h-4 w-4" aria-hidden="true" />
              USYD → UTS → UNSW
            </div>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">Help bring the next swap to your campus.</h2>
            <p className="mt-4 max-w-2xl leading-relaxed text-background/70">
              SkillSwap grew through students inviting one another in. If you are at UTS or UNSW, we would love to build this next chapter with you.
            </p>
          </div>
          <Button onClick={onJoin} size="lg" className="group rounded-full bg-secondary px-7 text-secondary-foreground hover:bg-secondary/90">
            Join the community
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </section>
  );
}
