import { ArrowRight } from "lucide-react";
import { Button } from "../../ui/button";

interface HeroTopNavProps {
  onExplore: () => void;
  onSignIn: () => void;
  onHost: () => void;
}

const BRAND_LOGO_SRC = "/brand/fox-logo.png";

export function HeroTopNav({ onExplore, onSignIn, onHost }: HeroTopNavProps) {
  return (
    <nav
      aria-label="Public navigation"
      className="fixed inset-x-0 top-0 z-50 border-b border-foreground/10 bg-background/90 backdrop-blur-xl"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center">
            <div className="h-10 w-10 overflow-hidden rounded-xl bg-secondary shadow-sm">
              <img src={BRAND_LOGO_SRC} alt="" className="h-full w-full object-cover" />
            </div>
            <span className="ml-3 text-lg font-bold tracking-tight text-foreground">SkillSwap</span>
          </div>

          <div className="hidden items-center gap-7 text-sm font-medium text-muted-foreground md:flex">
            <a className="transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" href="#how-it-works">
              How it works
            </a>
            <a className="transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" href="#memories">
              Our stories
            </a>
            <button
              type="button"
              onClick={onExplore}
              className="transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Explore
            </button>
            <button
              type="button"
              onClick={onSignIn}
              className="text-foreground/80 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Sign in
            </button>
          </div>

          <Button onClick={onHost} size="sm" className="rounded-full px-4 sm:px-5">
            Host a swap
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </nav>
  );
}
