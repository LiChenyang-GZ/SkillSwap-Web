import { useApp } from "../../../contexts/AppContext";
import type { MemoryEntry } from "../../../types/memory";
import { useMemoryPublicQuery } from "../../memory/hooks/useMemoryPublicQuery";
import { HeroCampusInvitationSection } from "../components/HeroCampusInvitationSection";
import { HeroHowItWorksSection } from "../components/HeroHowItWorksSection";
import { HeroIntroSection } from "../components/HeroIntroSection";
import { HeroMemoriesSection } from "../components/HeroMemoriesSection";
import { HeroTopNav } from "../components/HeroTopNav";
import { HERO_BASE_STATS } from "../constants/heroUiConstants";
import { useHeroMemoryCarousel } from "../hooks/useHeroMemoryCarousel";

export function HeroScreen() {
  const { isAuthenticated, setCurrentPage } = useApp();
  const { entries, isLoading: isLoadingMemories } = useMemoryPublicQuery();

  const { featuredMemories, visibleMemories, hasCarouselControls, showPreviousMemories, showNextMemories } =
    useHeroMemoryCarousel(entries);

  const openMemoryEntry = (entry: MemoryEntry) => {
    if (entry.slug) {
      setCurrentPage(`memory-entry-${entry.slug}`);
      return;
    }
    setCurrentPage("memory");
  };

  const exploreSwaps = () => setCurrentPage("explore");
  const hostSwap = () => setCurrentPage(isAuthenticated ? "create" : "auth", "signup");
  const joinCommunity = () => setCurrentPage(isAuthenticated ? "explore" : "auth", "signup");

  return (
    <div className="min-h-screen bg-background">
      <HeroTopNav
        onExplore={exploreSwaps}
        onSignIn={() => setCurrentPage("auth", "signin")}
        onHost={hostSwap}
      />
      <HeroIntroSection stats={HERO_BASE_STATS} onExplore={exploreSwaps} onHost={hostSwap} />
      <HeroHowItWorksSection onExplore={exploreSwaps} onHost={hostSwap} />
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
      <HeroCampusInvitationSection onJoin={joinCommunity} />
    </div>
  );
}
