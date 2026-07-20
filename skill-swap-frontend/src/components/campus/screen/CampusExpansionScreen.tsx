import { useApp } from "../../../contexts/AppContext";
import { CampusHelpSection } from "../components/CampusHelpSection";
import { CampusHeroSection } from "../components/CampusHeroSection";
import { CampusRoadmapSection } from "../components/CampusRoadmapSection";

export function CampusExpansionScreen() {
  const { isAuthenticated, setCurrentPage } = useApp();

  const exploreSwaps = () => setCurrentPage("explore");
  const hostSwap = () => setCurrentPage(isAuthenticated ? "create" : "auth", "signup");
  const joinCommunity = () => setCurrentPage(isAuthenticated ? "explore" : "auth", "signup");

  return (
    <div className="min-h-screen bg-background pt-20 lg:pt-24">
      <CampusHeroSection onExplore={exploreSwaps} onHost={hostSwap} />
      <CampusRoadmapSection />
      <CampusHelpSection onJoin={joinCommunity} onHost={hostSwap} onChampion={joinCommunity} />
    </div>
  );
}
