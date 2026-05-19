import { useEffect } from "react";
import type { RefObject } from "react";
import type { AuthTab } from "./useAuthTabState";

interface UseAuthExternalAccountWatcherParams {
  activeTab: AuthTab;
  signInPaneRef: RefObject<HTMLDivElement>;
  setAuthErrorNotice: (message: string | null) => void;
  setActiveTab: (tab: AuthTab) => void;
}

export const useAuthExternalAccountWatcher = ({
  activeTab,
  signInPaneRef,
  setAuthErrorNotice,
  setActiveTab,
}: UseAuthExternalAccountWatcherParams) => {
  useEffect(() => {
    if (activeTab !== "signin") {
      return;
    }
    const root = signInPaneRef.current;
    if (!root) {
      return;
    }

    const checkForExternalAccountError = () => {
      const text = (root.textContent || "").toLowerCase();
      const hit = text.includes("external account was not found") || text.includes("account is not linked yet");
      if (!hit) {
        return;
      }
      setAuthErrorNotice("This Google account is not linked yet. Please use Sign Up once, then return to Sign In.");
      setActiveTab("signup");
    };

    checkForExternalAccountError();
    const observer = new MutationObserver(() => checkForExternalAccountError());
    observer.observe(root, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [activeTab, setActiveTab, setAuthErrorNotice, signInPaneRef]);
};
