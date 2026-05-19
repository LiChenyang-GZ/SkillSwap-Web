import { useRef } from "react";
import { useAuth } from "@clerk/clerk-react";
import { useApp } from "../../../contexts/AppContext";
import { AuthFormCard } from "../components/AuthFormCard";
import { AuthMarketingPanel } from "../components/AuthMarketingPanel";
import { AuthTopBar } from "../components/AuthTopBar";
import { getAuthClerkAppearance } from "../constants/authClerkAppearance";
import { useAuthExternalAccountWatcher } from "../hooks/useAuthExternalAccountWatcher";
import { useAuthRedirect } from "../hooks/useAuthRedirect";
import { useAuthSessionErrorNotice } from "../hooks/useAuthSessionErrorNotice";
import { useAuthTabState } from "../hooks/useAuthTabState";

export function AuthScreen() {
  const { setCurrentPage, isDarkMode, toggleDarkMode } = useApp();
  const { isLoaded, isSignedIn } = useAuth();
  const signInPaneRef = useRef<HTMLDivElement>(null);

  const { activeTab, authErrorNotice, setActiveTab, setAuthErrorNotice, handleAuthTabChange } = useAuthTabState();

  useAuthRedirect({ isLoaded, isSignedIn, setCurrentPage });
  useAuthSessionErrorNotice({ setAuthErrorNotice, setActiveTab });
  useAuthExternalAccountWatcher({ activeTab, signInPaneRef, setAuthErrorNotice, setActiveTab });

  const clerkAppearance = getAuthClerkAppearance(isDarkMode);

  return (
    <div
      className={
        isDarkMode
          ? "min-h-screen bg-[radial-gradient(1200px_520px_at_15%_0%,rgba(245,158,11,0.28),transparent),linear-gradient(135deg,#020617_0%,#0f172a_45%,#1e293b_100%)] pt-20 lg:pt-24"
          : "min-h-screen bg-[radial-gradient(1100px_420px_at_10%_0%,rgba(251,146,60,0.25),transparent),linear-gradient(135deg,#fff7ed_0%,#f8fafc_55%,#eef2ff_100%)] pt-20 lg:pt-24"
      }
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <AuthTopBar
          isDarkMode={isDarkMode}
          onBackToHome={() => setCurrentPage("hero")}
          onToggleTheme={toggleDarkMode}
        />

        <div className="grid gap-8 lg:grid-cols-[1.15fr_1fr] items-start">
          <AuthMarketingPanel isDarkMode={isDarkMode} />
          <AuthFormCard
            isDarkMode={isDarkMode}
            activeTab={activeTab}
            authErrorNotice={authErrorNotice}
            signInPaneRef={signInPaneRef}
            onTabChange={handleAuthTabChange}
            onSwitchToSignup={() => setActiveTab("signup")}
            clerkAppearance={clerkAppearance}
          />
        </div>
      </div>
    </div>
  );
}
