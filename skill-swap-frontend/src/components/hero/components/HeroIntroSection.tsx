import { ArrowRight, Users } from "lucide-react";
import { Button } from "../../ui/button";

interface HeroIntroSectionProps {
  stats: {
    members: number;
    skills: number;
    workshops: number;
  };
  onJoinWithEmail: () => void;
  onSignIn: () => void;
}

export function HeroIntroSection({ stats, onJoinWithEmail, onSignIn }: HeroIntroSectionProps) {
  return (
    <section className="relative overflow-hidden ">
      <div className="absolute inset-0 bg-gradient-to-br from-cream-100 via-background to-cream-200 opacity-60"></div>
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 lg:pt-24 pb-16">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-display lg:text-6xl mb-6 text-foreground">
            Welcome to <span className="text-secondary">Skill Swap Club</span>
          </h1>

          <p className="text-h3 lg:text-2xl text-muted-foreground mb-8 leading-relaxed">
            Learn new skills, teach what you know, and grow together.
            <br />
            <span className="text-secondary">Join workshops to learn • Host workshops to share</span>
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <Button onClick={onJoinWithEmail} size="lg" className="px-8 py-3 text-lg min-w-[200px] group">
              <Users className="w-5 h-5 mr-3" />
              Join with Email
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>

            <Button
              onClick={onSignIn}
              variant="outline"
              size="lg"
              className="px-8 py-3 text-lg min-w-[200px] border-2 border-primary hover:bg-primary hover:text-primary-foreground transition-all duration-200"
            >
              Sign In
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-2xl mx-auto">
            <div className="text-center">
              <div className="text-h1 text-secondary mb-2">{stats.members}+</div>
              <div className="text-caption text-muted-foreground">Active Members</div>
            </div>
            <div className="text-center">
              <div className="text-h1 text-secondary mb-2">{stats.skills}+</div>
              <div className="text-caption text-muted-foreground">Skills Available</div>
            </div>
            <div className="text-center">
              <div className="text-h1 text-secondary mb-2">{stats.workshops}+</div>
              <div className="text-caption text-muted-foreground">Workshops Hosted</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
