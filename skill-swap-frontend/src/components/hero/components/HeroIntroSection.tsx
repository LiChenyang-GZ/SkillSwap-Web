import { ArrowRight, MapPin, Sparkles, Users } from "lucide-react";
import { Button } from "../../ui/button";

interface HeroIntroSectionProps {
  stats: {
    members: number;
    skills: number;
    workshops: number;
  };
  isAuthenticated: boolean;
  onExplore: () => void;
  onShareSkill: () => void;
}

export function HeroIntroSection({ stats, isAuthenticated, onExplore, onShareSkill }: HeroIntroSectionProps) {
  return (
    <section className="relative overflow-hidden pt-18">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(229,152,46,0.22),transparent_34%),radial-gradient(circle_at_88%_15%,rgba(184,51,43,0.16),transparent_30%)]" />
      <div className="absolute -left-24 top-36 h-72 w-72 rounded-full border border-secondary/25" />
      <div className="absolute -right-24 bottom-20 h-80 w-80 rounded-full border border-primary/20" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
        <div className="grid lg:grid-cols-[1.08fr_0.92fr] gap-14 items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-secondary/30 bg-card/80 px-4 py-2 text-sm font-medium text-foreground shadow-sm">
              <Sparkles className="h-4 w-4 text-secondary" />
              Built by students, for curious minds
            </div>

            <h1 className="mt-7 max-w-3xl text-5xl sm:text-6xl lg:text-7xl font-bold tracking-[-0.045em] leading-[0.98] text-foreground">
              Teach what you know. <span className="text-primary">Learn what you love.</span>
            </h1>

            <p className="mt-7 max-w-2xl text-lg sm:text-xl leading-relaxed text-muted-foreground">
              Join hands-on workshops, share your own skills, and meet people across Sydney&apos;s university community.
            </p>

            <div className="mt-9 flex flex-col sm:flex-row gap-3">
              <Button onClick={onExplore} size="lg" className="h-13 rounded-full px-7 text-base group">
                Explore workshops
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button onClick={onShareSkill} variant="outline" size="lg" className="h-13 rounded-full px-7 text-base bg-card/70">
                <Users className="w-5 h-5" />
                {isAuthenticated ? "Share a skill" : "Join SkillSwap"}
              </Button>
            </div>

            <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" />Sydney campuses</span>
              <span>No experience required</span>
              <span>Free to join</span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-lg">
            <div className="absolute inset-6 rotate-3 rounded-[2.5rem] bg-secondary/25" />
            <div className="relative overflow-hidden rounded-[2.5rem] border border-foreground/10 bg-card shadow-2xl shadow-primary/10">
              <div className="grid grid-cols-[1fr_0.84fr] min-h-[460px]">
                <div className="flex flex-col justify-between p-7 sm:p-9 bg-foreground text-background">
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-background/60">This week</p>
                    <h2 className="mt-4 text-3xl sm:text-4xl font-semibold leading-tight">One community. Hundreds of things to learn.</h2>
                  </div>
                  <div className="space-y-4">
                    <div className="rounded-2xl bg-background/10 p-4 backdrop-blur">
                      <p className="text-sm text-background/60">Discover</p>
                      <p className="mt-1 font-semibold">Design · Coding · Languages · Creative skills</p>
                    </div>
                    <div className="flex gap-6">
                      <div><strong className="block text-2xl text-secondary">{stats.workshops}+</strong><span className="text-xs text-background/60">workshops</span></div>
                      <div><strong className="block text-2xl text-secondary">{stats.skills}+</strong><span className="text-xs text-background/60">skills</span></div>
                    </div>
                  </div>
                </div>
                <div className="relative bg-gradient-to-b from-secondary/35 to-primary/20">
                  <img src="/brand/fox-mascot.png" alt="SkillSwap fox mascot" className="absolute bottom-0 left-1/2 w-[155%] max-w-none -translate-x-1/2 object-contain" />
                  <div className="absolute right-4 top-4 rounded-full bg-card px-3 py-1.5 text-xs font-semibold shadow-lg">Learn together</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
