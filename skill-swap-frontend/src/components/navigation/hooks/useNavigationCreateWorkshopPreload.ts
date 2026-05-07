import { useCallback, useEffect } from "react";
import { NAVIGATION_CREATE_WORKSHOP_PRELOAD_DELAY_MS } from "../constants/navigationUiConstants";

export function useNavigationCreateWorkshopPreload(isAuthenticated: boolean) {
  const preloadCreateWorkshopScreen = useCallback(() => {
    void import("../../create-workshop/screen/CreateWorkshopScreen");
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

    const timer = window.setTimeout(() => {
      preloadCreateWorkshopScreen();
    }, NAVIGATION_CREATE_WORKSHOP_PRELOAD_DELAY_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [isAuthenticated, preloadCreateWorkshopScreen]);

  return {
    preloadCreateWorkshopScreen,
  };
}
