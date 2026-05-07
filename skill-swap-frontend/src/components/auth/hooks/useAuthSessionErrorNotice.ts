import { useEffect } from "react";
import type { AuthTab } from "./useAuthTabState";

interface UseAuthSessionErrorNoticeParams {
  setAuthErrorNotice: (message: string | null) => void;
  setActiveTab: (tab: AuthTab) => void;
}

export const useAuthSessionErrorNotice = ({
  setAuthErrorNotice,
  setActiveTab,
}: UseAuthSessionErrorNoticeParams) => {
  useEffect(() => {
    const message = sessionStorage.getItem("skill_swap_auth_error");
    if (!message) return;
    setAuthErrorNotice(message);
    setActiveTab("signup");
    sessionStorage.removeItem("skill_swap_auth_error");
  }, [setActiveTab, setAuthErrorNotice]);
};
