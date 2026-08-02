import { ArrowRight, MapPin } from "lucide-react";
import { BRAND_MASCOT_SRC } from "../../../shared/constants";
import { Button } from "../../ui/button";

interface CampusHeroSectionProps {
  onExplore: () => void;
  onHost: () => void;
}

export function CampusHeroSection({ onExplore, onHost }: CampusHeroSectionProps) {
  return (
    <section className="relative overflow-hidden pt-20 lg:pt-24">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_14%_16%,color-mix(in_srgb,var(--color-secondary)_24%,transparent),transparent_34%),radial-gradient(circle_at_88%_30%,color-mix(in_srgb,var(--color-primary)_14%,transparent),transparent_30%)]" />
      <div className="absolute -left-24 top-32 h-64 w-64 rounded-full border border-secondary/30" aria-hidden="true" />
      <div className="absolute -right-20 bottom-10 h-72 w-72 rounded-full border border-primary/20" aria-hidden="true" />

      <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 py-14 sm:px-6 sm:py-18 lg:grid-cols-[1.2fr_0.8fr] lg:px-8 lg:py-20">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-secondary/35 bg-card/80 px-4 py-2 text-sm font-semibold shadow-sm">
            <MapPin className="h-4 w-4 text-secondary" aria-hidden="true" />
            USYD → UTS → UNSW
          </p>

          <h1 className="mt-7 max-w-3xl text-5xl font-bold leading-[0.98] tracking-[-0.045em] text-foreground sm:text-6xl">
            One campus taught us how. <span className="text-primary">Two more are next.</span>
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
            SkillSwap grew at the University of Sydney one small session at a time. Now we are getting ready to bring it
            to UTS and UNSW — and the next chapter starts with students like you.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button onClick={onExplore} size="lg" className="group h-13 rounded-full px-7 text-base">
              Explore a Swap
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </Button>
            <Button
              onClick={onHost}
              variant="outline"
              size="lg"
              className="h-13 rounded-full border-foreground/25 bg-card/75 px-7 text-base"
            >
              Host a SkillSwap
            </Button>
          </div>
        </div>

        <div className="relative mx-auto hidden w-full max-w-xs lg:block">
          <div className="absolute inset-x-8 bottom-2 top-10 rounded-[50%] bg-secondary/20" aria-hidden="true" />
          <img
            src={BRAND_MASCOT_SRC}
            alt="SkillSwap's friendly fox mascot waving hello"
            className="relative w-full object-contain"
          />
        </div>
      </div>
    </section>
  );
}
