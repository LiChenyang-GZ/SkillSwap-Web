import { ArrowRight, Flag, Lightbulb, Users } from "lucide-react";
import { Button } from "../../ui/button";

interface CampusHelpSectionProps {
  onJoin: () => void;
  onHost: () => void;
  onChampion: () => void;
}

const HELP_CARD_CLASS = "flex h-full flex-col rounded-[2rem] border border-foreground/10 bg-card p-6 sm:p-8";
const HELP_ICON_WRAP_CLASS = "flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary/20";

export function CampusHelpSection({ onJoin, onHost, onChampion }: CampusHelpSectionProps) {
  return (
    <section aria-labelledby="campus-help-heading" className="px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
      <div className="mx-auto max-w-6xl">
        <div className="max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-primary">How you can help</p>
          <h2 id="campus-help-heading" className="mt-4 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            New chapters start with people, not plans.
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
            Whether you are at USYD already or waiting for us at UTS or UNSW, there is a way to be part of what comes
            next.
          </p>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          <article className={HELP_CARD_CLASS}>
            <div className={HELP_ICON_WRAP_CLASS}>
              <Users className="h-6 w-6 text-secondary" aria-hidden="true" />
            </div>
            <h3 className="mt-6 text-2xl font-semibold text-foreground">Join the community</h3>
            <p className="mb-6 mt-3 leading-relaxed text-muted-foreground">
              Become a member, follow along, and be there when the first swaps reach your side of the city.
            </p>
            <Button onClick={onJoin} className="group mt-auto self-start rounded-full">
              Join the community
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </Button>
          </article>

          <article className={HELP_CARD_CLASS}>
            <div className={HELP_ICON_WRAP_CLASS}>
              <Lightbulb className="h-6 w-6 text-secondary" aria-hidden="true" />
            </div>
            <h3 className="mt-6 text-2xl font-semibold text-foreground">Host a SkillSwap</h3>
            <p className="mb-6 mt-3 leading-relaxed text-muted-foreground">
              Share something you love. Every session you host makes the community stronger — and easier to grow.
            </p>
            <Button onClick={onHost} variant="outline" className="group mt-auto self-start rounded-full bg-background">
              Host a SkillSwap
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </Button>
          </article>

          <article className={HELP_CARD_CLASS}>
            <div className={HELP_ICON_WRAP_CLASS}>
              <Flag className="h-6 w-6 text-secondary" aria-hidden="true" />
            </div>
            <h3 className="mt-6 text-2xl font-semibold text-foreground">Bring it to your campus</h3>
            <p className="mb-6 mt-3 leading-relaxed text-muted-foreground">
              At UTS or UNSW? Join now, rally a few curious friends, and help us shape SkillSwap's arrival on your
              campus.
            </p>
            <Button onClick={onChampion} variant="outline" className="group mt-auto self-start rounded-full bg-background">
              Count me in
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </Button>
          </article>
        </div>
      </div>
    </section>
  );
}
