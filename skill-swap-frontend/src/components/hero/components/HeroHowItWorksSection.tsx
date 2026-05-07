import { HERO_HOW_IT_WORKS_STEPS } from "../constants/heroUiConstants";

export function HeroHowItWorksSection() {
  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8 bg-background">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-h1 lg:text-5xl mb-4 text-foreground">
            How It <span className="text-secondary">Works</span>
          </h2>
          <p className="text-body text-muted-foreground max-w-2xl mx-auto">
            A community-first model that keeps learning and teaching simple for everyone.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {HERO_HOW_IT_WORKS_STEPS.map((step) => (
            <div key={step.order} className="text-center">
              <div className="w-16 h-16 bg-secondary rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <span className="text-secondary-foreground font-bold text-xl">{step.order}</span>
              </div>
              <h3 className="text-h3 mb-2 text-foreground">{step.title}</h3>
              <p className="text-caption text-muted-foreground">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
