import { ArrowRight, BookOpen, Lightbulb } from "lucide-react";
import { Button } from "../../ui/button";
import { HERO_HOST_STEPS, HERO_LEARNER_STEPS } from "../constants/heroUiConstants";

interface HeroHowItWorksSectionProps {
  onExplore: () => void;
  onHost: () => void;
}

const StoryPath = ({
  eyebrow,
  title,
  description,
  steps,
  action,
  onAction,
  icon: Icon,
  warm = false,
}: {
  eyebrow: string;
  title: string;
  description: string;
  steps: readonly { order: string; title: string; description: string }[];
  action: string;
  onAction: () => void;
  icon: typeof BookOpen;
  warm?: boolean;
}) => (
  <article className={`rounded-[2rem] border p-6 sm:p-9 ${warm ? "border-primary/20 bg-primary text-primary-foreground" : "border-foreground/10 bg-card"}`}>
    <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${warm ? "bg-background/15" : "bg-secondary/20"}`}>
      <Icon className={`h-6 w-6 ${warm ? "text-primary-foreground" : "text-secondary"}`} aria-hidden="true" />
    </div>
    <p className={`mt-6 text-xs font-bold uppercase tracking-[0.22em] ${warm ? "text-primary-foreground/70" : "text-secondary"}`}>{eyebrow}</p>
    <h3 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h3>
    <p className={`mt-4 leading-relaxed ${warm ? "text-primary-foreground/80" : "text-muted-foreground"}`}>{description}</p>

    <ol className="mt-8 space-y-6">
      {steps.map((step) => (
        <li key={step.order} className={`grid grid-cols-[2.5rem_1fr] gap-3 border-t pt-5 ${warm ? "border-primary-foreground/20" : "border-foreground/10"}`}>
          <span className={`text-sm font-bold ${warm ? "text-primary-foreground/60" : "text-secondary"}`}>{step.order}</span>
          <div>
            <h4 className="font-semibold">{step.title}</h4>
            <p className={`mt-1 text-sm leading-relaxed ${warm ? "text-primary-foreground/75" : "text-muted-foreground"}`}>{step.description}</p>
          </div>
        </li>
      ))}
    </ol>

    <Button
      onClick={onAction}
      variant={warm ? "secondary" : "outline"}
      className={`group mt-8 rounded-full ${warm ? "bg-background text-foreground hover:bg-background/90" : "bg-background"}`}
    >
      {action}
      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
    </Button>
  </article>
);

export function HeroHowItWorksSection({ onExplore, onHost }: HeroHowItWorksSectionProps) {
  return (
    <section id="how-it-works" className="bg-cream-200/55 px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
      <div className="mx-auto max-w-6xl">
        <div className="max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-primary">Two ways in, one community</p>
          <h2 className="mt-4 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            Less scrolling. More showing up.
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
            You do not need to be an expert to host, or know anyone before you arrive. Just pick the path that feels right today.
          </p>
        </div>

        <div className="mt-12 grid gap-5 lg:grid-cols-2">
          <StoryPath
            eyebrow="I want to learn"
            title="Try the thing."
            description="Find a student-led swap, come along, and leave with a new skill and a few familiar faces."
            steps={HERO_LEARNER_STEPS}
            action="Explore a Swap"
            onAction={onExplore}
            icon={BookOpen}
          />
          <StoryPath
            eyebrow="I want to share"
            title="Teach the first step."
            description="Turn something you know into an inviting hour that helps somebody else begin."
            steps={HERO_HOST_STEPS}
            action="Host a SkillSwap"
            onAction={onHost}
            icon={Lightbulb}
            warm
          />
        </div>
      </div>
    </section>
  );
}
