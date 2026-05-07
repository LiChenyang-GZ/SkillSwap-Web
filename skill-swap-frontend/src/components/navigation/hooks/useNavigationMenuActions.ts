import { useCallback } from "react";
import type { NavigationMenuActions } from "../models/navigationMenuActionModel";
import { NAVIGATION_PAGE_KEYS } from "../constants/navigationPageKeys";

interface UseNavigationMenuActionsInput {
  setCurrentPage: (page: string) => void;
  closeMobileMenu: () => void;
  preloadCreateWorkshopScreen: () => void;
  signOut: () => Promise<void>;
}

export function useNavigationMenuActions({
  setCurrentPage,
  closeMobileMenu,
  preloadCreateWorkshopScreen,
  signOut,
}: UseNavigationMenuActionsInput): NavigationMenuActions {
  const navigateToPage = useCallback(
    (page: string) => {
      setCurrentPage(page);
    },
    [setCurrentPage]
  );

  const navigateToPageAndCloseMobile = useCallback(
    (page: string) => {
      setCurrentPage(page);
      closeMobileMenu();
    },
    [closeMobileMenu, setCurrentPage]
  );

  const navigateToCreateAndCloseMobile = useCallback(() => {
    preloadCreateWorkshopScreen();
    setCurrentPage(NAVIGATION_PAGE_KEYS.create);
    closeMobileMenu();
  }, [closeMobileMenu, preloadCreateWorkshopScreen, setCurrentPage]);

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
    navigateToPageAndCloseMobile,
    navigateToCreateAndCloseMobile,
    signOutAndCloseMobile,
  };
}
