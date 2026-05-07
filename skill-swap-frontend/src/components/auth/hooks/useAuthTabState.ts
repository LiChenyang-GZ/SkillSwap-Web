import { useCallback, useState } from "react";

export type AuthTab = "signin" | "signup";

export const useAuthTabState = () => {
  const [activeTab, setActiveTab] = useState<AuthTab>("signin");
  const [authErrorNotice, setAuthErrorNotice] = useState<string | null>(null);

  const handleAuthTabChange = useCallback((value: string) => {
    if (value === "signin" || value === "signup") {
      setActiveTab(value);
    }
  }, []);

  return {
    activeTab,
    authErrorNotice,
    setActiveTab,
    setAuthErrorNotice,
    handleAuthTabChange,
  };
};
