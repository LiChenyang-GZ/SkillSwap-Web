import { useApp } from "../../../contexts/AppContext";
import { usePublicCtaActions } from "../../../shared/hooks/usePublicCtaActions";
import type { MemoryEntry } from "../../../types/memory";
import { useMemoryPublicQuery } from "../../memory/hooks/useMemoryPublicQuery";
import { sortPublishedMemories } from "../../memory/utils/memorySort";
import { HeroCampusInvitationSection } from "../components/HeroCampusInvitationSection";
import { HeroHowItWorksSection } from "../components/HeroHowItWorksSection";
import { HeroIntroSection } from "../components/HeroIntroSection";
import { HeroMemoriesSection } from "../components/HeroMemoriesSection";
import { HERO_FEATURED_MEMORY_COUNT } from "../constants/heroUiConstants";

export function HeroScreen() {
  const { setCurrentPage } = useApp();
  const { exploreSwaps, hostSwap, joinCommunity } = usePublicCtaActions();
  const { entries, isLoading: isLoadingMemories } = useMemoryPublicQuery();

  const featuredMemories = sortPublishedMemories(entries).slice(0, HERO_FEATURED_MEMORY_COUNT);

  const openMemoryEntry = (entry: MemoryEntry) => {
    if (entry.slug) {
      setCurrentPage(`memory-entry-${entry.slug}`);
      return;
    }
    setCurrentPage("memory");
  };

  return (
    <div className="min-h-screen bg-background">
      <HeroIntroSection onExplore={exploreSwaps} onHost={hostSwap} />
      <HeroHowItWorksSection onExplore={exploreSwaps} onHost={hostSwap} />
      <HeroMemoriesSection
        isLoadingMemories={isLoadingMemories}
        featuredMemories={featuredMemories}
        onOpenMemoryEntry={openMemoryEntry}
        onOpenMemoryPage={() => setCurrentPage("memory")}
      />
      <HeroCampusInvitationSection onJoin={joinCommunity} onSeeCampuses={() => setCurrentPage("campuses")} />
    </div>
  );
}
