import { Compass, Sparkles } from "lucide-react";
import { CAMPUS_ROLLOUT, CAMPUS_USYD_STATS } from "../constants/campusContent";

export function CampusRoadmapSection() {
  return (
    <section aria-labelledby="campus-roadmap-heading" className="bg-cream-200/55 px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
      <div className="mx-auto max-w-6xl">
        <div className="max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-primary">The map so far</p>
          <h2 id="campus-roadmap-heading" className="mt-4 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            Three campuses, one community.
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
            SkillSwap is established at USYD today. UTS and UNSW are where we are headed next — nothing has launched
            there yet, and that is exactly why it is exciting.
          </p>
        </div>

        <ol className="mt-12 grid gap-5 md:grid-cols-3">
          {CAMPUS_ROLLOUT.map((campus) => (
            <li key={campus.id} className="h-full">
              <article
                className={`flex h-full flex-col rounded-[2rem] p-6 sm:p-8 ${
                  campus.status === "established"
                    ? "bg-primary text-primary-foreground"
                    : "border border-dashed border-foreground/25 bg-card"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span
                    className={`text-2xl font-bold tracking-tight ${
                      campus.status === "established" ? "text-primary-foreground" : "text-foreground"
                    }`}
                  >
                    {campus.shortName}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] ${
                      campus.status === "established"
                        ? "bg-background/15 text-primary-foreground"
                        : "bg-secondary/20 text-foreground"
                    }`}
                  >
                    {campus.status === "established" ? (
                      <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                    ) : (
                      <Compass className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                    {campus.statusLabel}
                  </span>
                </div>

                <h3
                  className={`mt-5 text-xl font-semibold leading-snug ${
                    campus.status === "established" ? "text-primary-foreground" : "text-foreground"
                  }`}
                >
                  {campus.name}
                </h3>
                <p
                  className={`mb-6 mt-3 leading-relaxed ${
                    campus.status === "established" ? "text-primary-foreground/85" : "text-muted-foreground"
                  }`}
                >
                  {campus.description}
                </p>

                {campus.status === "established" && (
                  <div className="mt-auto grid grid-cols-2 gap-4 border-t border-primary-foreground/25 pt-5">
                    {CAMPUS_USYD_STATS.map((stat) => (
                      <div key={stat.label} className="pt-3">
                        <strong className="block text-3xl font-bold">{stat.value}</strong>
                        <span className="mt-1 block text-sm text-primary-foreground/80">{stat.label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </article>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
