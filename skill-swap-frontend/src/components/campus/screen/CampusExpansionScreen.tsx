import { usePublicCtaActions } from "../../../shared/hooks/usePublicCtaActions";
import { CampusHelpSection } from "../components/CampusHelpSection";
import { CampusHeroSection } from "../components/CampusHeroSection";
import { CampusRoadmapSection } from "../components/CampusRoadmapSection";

export function CampusExpansionScreen() {
  const { exploreSwaps, hostSwap, joinCommunity } = usePublicCtaActions();

  return (
    <div className="min-h-screen bg-background">
      <CampusHeroSection onExplore={exploreSwaps} onHost={hostSwap} />
      <CampusRoadmapSection />
      <CampusHelpSection onJoin={joinCommunity} onHost={hostSwap} onChampion={joinCommunity} />
    </div>
  );
}
