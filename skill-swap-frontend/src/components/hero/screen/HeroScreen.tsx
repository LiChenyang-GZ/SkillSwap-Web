import { useMemo } from "react";
import { useApp } from "../../../contexts/AppContext";
import type { MemoryEntry } from "../../../types/memory";
import { useMemoryPublicQuery } from "../../memory/hooks/useMemoryPublicQuery";
import { HeroHowItWorksSection } from "../components/HeroHowItWorksSection";
import { HeroIntroSection } from "../components/HeroIntroSection";
import { HeroMemoriesSection } from "../components/HeroMemoriesSection";
import { HeroTopNav } from "../components/HeroTopNav";
import { HERO_BASE_STATS } from "../constants/heroUiConstants";
import { useHeroMemoryCarousel } from "../hooks/useHeroMemoryCarousel";

export function HeroScreen() {
  const { setCurrentPage, workshops } = useApp();
  const { entries, isLoading: isLoadingMemories } = useMemoryPublicQuery();

  const { featuredMemories, visibleMemories, hasCarouselControls, showPreviousMemories, showNextMemories } =
    useHeroMemoryCarousel(entries);

  const stats = useMemo(
    () => ({
      members: HERO_BASE_STATS.members,
      skills: HERO_BASE_STATS.skills,
      workshops: workshops.length || HERO_BASE_STATS.workshopsFallback,
    }),
    [workshops.length]
  );

  const openMemoryEntry = (entry: MemoryEntry) => {
    if (entry.slug) {
      setCurrentPage(`memory-entry-${entry.slug}`);
      return;
    }
    setCurrentPage("memory");
  };

  return (
    <div className="min-h-screen bg-background">
      <HeroTopNav onGetStarted={() => setCurrentPage("auth", "signup")} />
      <HeroIntroSection
        stats={stats}
        onJoinWithEmail={() => setCurrentPage("auth", "signup")}
        onSignIn={() => setCurrentPage("auth", "signin")}
      />
      <HeroMemoriesSection
        isLoadingMemories={isLoadingMemories}
        featuredMemories={featuredMemories}
        visibleMemories={visibleMemories}
        hasCarouselControls={hasCarouselControls}
        onShowPrevious={showPreviousMemories}
        onShowNext={showNextMemories}
        onOpenMemoryEntry={openMemoryEntry}
        onOpenMemoryPage={() => setCurrentPage("memory")}
      />
      <HeroHowItWorksSection />
    </div>
  );
}
