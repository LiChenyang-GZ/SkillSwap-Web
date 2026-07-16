import { ArrowUpRight, CheckCircle2, GraduationCap, HeartHandshake, Sparkles } from "lucide-react";
import { Button } from "../../ui/button";

interface HeroCampusConnectSectionProps {
  onGetStarted: () => void;
}

const CAMPUSES = ["USYD", "UNSW", "UTS", "OTHER"] as const;

export function HeroCampusConnectSection({ onGetStarted }: HeroCampusConnectSectionProps) {
  return (
    <section id="campus-connect" className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-10 items-center">
        <div className="rounded-[2.5rem] border border-foreground/10 bg-card p-6 sm:p-9 shadow-xl shadow-secondary/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-secondary/20 flex items-center justify-center"><GraduationCap className="h-6 w-6 text-secondary" /></div>
              <div><p className="font-semibold">Campus skill network</p><p className="text-sm text-muted-foreground">Coming soon to SkillSwap</p></div>
            </div>
            <Sparkles className="h-5 w-5 text-primary" />
          </div>

          <div className="mt-8 grid grid-cols-2 gap-3">
            {CAMPUSES.map((campus) => (
              <div key={campus} className="rounded-2xl border border-foreground/10 bg-background px-5 py-4">
                <p className="font-semibold">{campus === "OTHER" ? "Your campus" : campus}</p>
                <p className="mt-1 text-xs text-muted-foreground">Find people nearby</p>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-2xl bg-foreground p-5 text-background">
            <div className="flex items-center gap-3"><HeartHandshake className="h-5 w-5 text-secondary" /><p className="font-semibold">Skill match preview</p></div>
            <div className="mt-4 flex flex-wrap gap-2 text-sm">
              <span className="rounded-full bg-background/10 px-3 py-1.5">Can teach: Python</span>
              <span className="rounded-full bg-background/10 px-3 py-1.5">Wants to learn: Guitar</span>
            </div>
          </div>
        </div>

        <div className="lg:pl-8">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">The next chapter</p>
          <h2 className="mt-4 text-4xl lg:text-5xl font-semibold tracking-tight text-foreground">Workshops today. Skill connections tomorrow.</h2>
          <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
            We&apos;re building a way to discover people who can teach what you want to learn — and who want to learn what you already know.
          </p>
          <div className="mt-7 space-y-3">
            {["Meet people from your university", "Match skills you offer with skills you want", "Choose when and how you connect"].map((item) => (
              <div key={item} className="flex items-center gap-3 text-foreground"><CheckCircle2 className="h-5 w-5 text-secondary" /><span>{item}</span></div>
            ))}
          </div>
          <Button onClick={onGetStarted} variant="outline" size="lg" className="mt-9 rounded-full bg-card">
            Build your profile <ArrowUpRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </section>
  );
}
