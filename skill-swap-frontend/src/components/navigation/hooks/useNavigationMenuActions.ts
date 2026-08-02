import { useCallback } from "react";
import type { NavigationItem } from "../models/navigationItemModel";
import type { NavigationMenuActions } from "../models/navigationMenuActionModel";

const scrollToSectionAfterRender = (sectionId: string) => {
  requestAnimationFrame(() => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
};

interface UseNavigationMenuActionsInput {
  setCurrentPage: (page: string) => void;
  closeMobileMenu: () => void;
  signOut: () => Promise<void>;
}

export function useNavigationMenuActions({
  setCurrentPage,
  closeMobileMenu,
  signOut,
}: UseNavigationMenuActionsInput): NavigationMenuActions {
  const navigateToPage = useCallback(
    (page: string) => {
      setCurrentPage(page);
      closeMobileMenu();
    },
    [closeMobileMenu, setCurrentPage]
  );

  const navigateToItem = useCallback(
    (item: NavigationItem) => {
      navigateToPage(item.page);
      if (item.sectionId) {
        scrollToSectionAfterRender(item.sectionId);
      }
    },
    [navigateToPage]
  );

  const signOutAndCloseMobile = useCallback(async () => {
    try {
      await signOut();
      closeMobileMenu();
    } catch {
      // Keep mobile menu open when sign-out fails so user retains an immediate retry path.
    }
  }, [closeMobileMenu, signOut]);

  return {
    navigateToPage,
    navigateToItem,
    signOutAndCloseMobile,
  };
}
