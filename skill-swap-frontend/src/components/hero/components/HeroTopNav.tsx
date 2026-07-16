import { ArrowRight } from "lucide-react";
import { Button } from "../../ui/button";

interface HeroTopNavProps {
  isAuthenticated: boolean;
  onExplore: () => void;
  onSignIn: () => void;
  onGetStarted: () => void;
}

const BRAND_LOGO_SRC = "/brand/fox-logo.png";

export function HeroTopNav({ isAuthenticated, onExplore, onSignIn, onGetStarted }: HeroTopNavProps) {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-foreground/10 bg-background/85 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-18">
          <button type="button" className="flex items-center" aria-label="SkillSwap home">
            <div className="w-11 h-11 bg-secondary rounded-2xl flex items-center justify-center overflow-hidden shadow-sm">
              <img src={BRAND_LOGO_SRC} alt="Skill Swap Club" className="h-full w-full object-cover" />
            </div>
            <span className="ml-3 text-xl font-bold tracking-tight text-foreground">SkillSwap</span>
          </button>

          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
            <button type="button" onClick={onExplore} className="hover:text-foreground transition-colors">Workshops</button>
            <a href="#how-it-works" className="hover:text-foreground transition-colors">How it works</a>
            <a href="#campus-connect" className="hover:text-foreground transition-colors">Skill Connect</a>
            <a href="#memories" className="hover:text-foreground transition-colors">Memories</a>
          </div>

          <div className="flex items-center gap-2">
            {!isAuthenticated && (
              <Button variant="ghost" onClick={onSignIn} className="hidden sm:inline-flex">
                Sign in
              </Button>
            )}
            <Button onClick={isAuthenticated ? onExplore : onGetStarted} className="rounded-full px-5">
              {isAuthenticated ? "Explore" : "Join the community"}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}
