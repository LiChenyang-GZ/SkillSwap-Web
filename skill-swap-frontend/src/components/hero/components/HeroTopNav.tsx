import { Button } from "../../ui/button";

interface HeroTopNavProps {
  onGetStarted: () => void;
}

const BRAND_LOGO_SRC = "/brand/fox-logo.png";

export function HeroTopNav({ onGetStarted }: HeroTopNavProps) {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-secondary rounded-full flex items-center justify-center overflow-hidden">
              <img src={BRAND_LOGO_SRC} alt="Skill Swap Club" className="h-full w-full object-cover" />
            </div>
            <span className="ml-3 text-xl font-bold text-foreground">SkillSwap</span>
          </div>
          <Button onClick={onGetStarted} className="bg-primary text-primary-foreground hover:bg-primary/90">
            Get Started
          </Button>
        </div>
      </div>
    </nav>
  );
}
