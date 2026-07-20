import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "../../ui/button";

interface HeroIntroSectionProps {
  stats: {
    members: string;
    swaps: string;
    campuses: string;
  };
  onExplore: () => void;
  onHost: () => void;
}

const MASCOT_SRC = "/brand/fox-mascot.png";

export function HeroIntroSection({ stats, onExplore, onHost }: HeroIntroSectionProps) {
  return (
    <section className="relative overflow-hidden pt-16">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_12%,rgba(229,152,46,0.28),transparent_32%),radial-gradient(circle_at_90%_28%,rgba(184,51,43,0.16),transparent_28%)]" />
      <div className="absolute -left-24 top-36 h-64 w-64 rounded-full border border-secondary/30" />
      <div className="absolute -right-20 bottom-16 h-72 w-72 rounded-full border border-primary/20" />

      <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[1.12fr_0.88fr] lg:px-8 lg:py-24">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-secondary/35 bg-card/80 px-4 py-2 text-sm font-semibold shadow-sm">
            <Sparkles className="h-4 w-4 text-secondary" aria-hidden="true" />
            Student-led. Sydney-grown.
          </div>

          <h1 className="mt-7 max-w-4xl text-5xl font-bold leading-[0.98] tracking-[-0.045em] text-foreground sm:text-6xl lg:text-7xl">
            Learn something new from someone who was once{" "}
            <span className="text-primary">exactly where you are.</span>
          </h1>

          <p className="mt-7 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
            SkillSwap is where university students teach the things they love, learn by doing, and find their people along the way.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Button onClick={onExplore} size="lg" className="group h-13 rounded-full px-7 text-base">
              Explore a Swap
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </Button>
            <Button onClick={onHost} variant="outline" size="lg" className="h-13 rounded-full border-foreground/25 bg-card/75 px-7 text-base">
              Host a SkillSwap
            </Button>
          </div>

          <div className="mt-10 grid max-w-2xl grid-cols-3 divide-x divide-foreground/15 border-y border-foreground/15 py-5">
            <div className="pr-3">
              <strong className="block text-2xl font-bold text-foreground sm:text-3xl">{stats.members}</strong>
              <span className="mt-1 block text-xs leading-tight text-muted-foreground sm:text-sm">USYD members</span>
            </div>
            <div className="px-3 sm:px-6">
              <strong className="block text-2xl font-bold text-foreground sm:text-3xl">{stats.swaps}</strong>
              <span className="mt-1 block text-xs leading-tight text-muted-foreground sm:text-sm">SkillSwaps so far</span>
            </div>
            <div className="pl-3 sm:pl-6">
              <strong className="block text-lg font-bold leading-tight text-foreground sm:text-3xl">{stats.campuses}</strong>
              <span className="mt-1 block text-xs leading-tight text-muted-foreground sm:text-sm">next on the map</span>
            </div>
          </div>
        </div>

        <div className="relative mx-auto min-h-[480px] w-full max-w-md sm:min-h-[520px]">
          <div className="relative z-10 mr-8 max-w-sm -translate-y-6 rounded-[50%] border border-[#B75B3E]/25 bg-[#FFF8ED] px-10 py-10 text-center text-[#6B342E] shadow-[0_18px_55px_rgba(107,52,46,0.14)] sm:mr-12 sm:-translate-y-10 sm:px-12 sm:py-12">
            <p className="text-3xl font-semibold leading-[1.2] tracking-[-0.025em] sm:text-4xl">
              Come curious.
              <br />
              Leave connected.
            </p>
            <span
              className="absolute -bottom-4 right-14 h-8 w-8 rotate-45 border-b border-r border-[#B75B3E]/25 bg-[#FFF8ED] sm:right-16"
              aria-hidden="true"
            />
          </div>
          <img
            src={MASCOT_SRC}
            alt="SkillSwap's friendly fox mascot waving hello"
            className="absolute bottom-12 right-0 z-20 w-[82%] max-w-[360px] sm:bottom-0 sm:w-[90%] sm:max-w-[396px]"
          />
        </div>
      </div>
    </section>
  );
}
