import { useApp } from "../../contexts/AppContext";

export const usePublicCtaActions = () => {
  const { isAuthenticated, setCurrentPage } = useApp();

  return {
    exploreSwaps: () => setCurrentPage("explore"),
    hostSwap: () => setCurrentPage(isAuthenticated ? "create" : "auth", "signup"),
    joinCommunity: () => setCurrentPage(isAuthenticated ? "explore" : "auth", "signup"),
  };
};
