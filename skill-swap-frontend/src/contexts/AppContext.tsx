import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAuth, useUser } from "@clerk/clerk-react";
import { toast } from "sonner";
import type { User } from "../types/user";
import {
  buildIdentityFallback,
  decodeJwtPayload,
  detectClerkAuthError,
  fetchBackendProfile,
  mapBackendUser,
  syncFallbackUsername,
} from "../shared/service/auth/appAuthService";
import type {
  AppContextType,
  AuthTab,
  RecentProfileCache,
} from "./appContextTypes";
import {
  isSignedOutPreservedPage,
  normalizePath,
  pageFromPath,
  pathFromPage,
  resolvePostLoginPage,
} from "./appRoutes";
import { useCurrentUserProfileActions } from "./useCurrentUserProfileActions";
import { useNotificationUnreadCount } from "./useNotificationUnreadCount";
import { useThemeMode } from "./useThemeMode";
import { useWorkshopState } from "./useWorkshopState";

export type { GetAuthToken } from "./appContextTypes";

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const { isLoaded: clerkLoaded, isSignedIn, getToken, signOut: clerkSignOut } = useAuth();
  const { user: clerkUser } = useUser();

  const [user, setUser] = useState<User | null>(null);
  const [currentPage, setCurrentPageState] = useState(() => pageFromPath(window.location.pathname));
  const [authTab, setAuthTab] = useState<AuthTab>("signin");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // 防止标签页切换时重复初始化
  const initializedRef = useRef(false);
  const profileInFlightRef = useRef<Promise<User> | null>(null);
  const profileInFlightTokenRef = useRef<string | null>(null);
  const bootstrapAuthInProgressRef = useRef(false);
  const hasBackendProfileRef = useRef(false);
  const recentProfileCacheRef = useRef<RecentProfileCache | null>(null);
  // 区分“用户主动登出”与“session 被动过期”：主动登出已有自己的提示，
  // 不应再弹“会话过期”。
  const explicitSignOutRef = useRef(false);

  const { isDarkMode, toggleDarkMode } = useThemeMode();

  // Clerk 内部已对 getToken() 做缓存与自动刷新：每次调用按需取最新 token，
  // 不再把 token 存进 React state（避免过期后变成陈旧值导致被强制登出）。
  const getAuthToken = useCallback((): Promise<string | null> => {
    return getToken({ template: "signupTemplate" });
  }, [getToken]);

  const setCurrentPage = useCallback((page: string, authTabOption?: AuthTab) => {
    setCurrentPageState(page);

    const targetPath = pathFromPage(page);
    if (normalizePath(window.location.pathname) !== targetPath) {
      window.history.pushState({ page }, "", targetPath);
    }

    if (authTabOption) setAuthTab(authTabOption);
  }, []);

  const fetchBackendUser = useCallback(async (accessToken: string): Promise<User> => {
    const payload = decodeJwtPayload(accessToken) as { sub?: string } | null;
    const tokenSubject = payload?.sub ?? null;
    const cached = recentProfileCacheRef.current;
    if (cached && cached.subject && cached.subject === tokenSubject && Date.now() - cached.at < 15000) {
      return cached.user;
    }

    if (
      profileInFlightRef.current &&
      profileInFlightTokenRef.current === accessToken
    ) {
      return profileInFlightRef.current;
    }

    const task = (async () => {
      const profile = await fetchBackendProfile(accessToken);
      const role = String(profile?.role || "").trim().toLowerCase();
      setIsAdmin(role === "admin");
      const mapped = mapBackendUser(profile);
      recentProfileCacheRef.current = {
        subject: tokenSubject,
        user: mapped,
        at: Date.now(),
      };
      return mapped;
    })();

    profileInFlightRef.current = task;
    profileInFlightTokenRef.current = accessToken;

    try {
      return await task;
    } finally {
      if (profileInFlightTokenRef.current === accessToken) {
        profileInFlightRef.current = null;
        profileInFlightTokenRef.current = null;
      }
    }
  }, []);

  const {
    attendWorkshop,
    cancelWorkshopAttendance,
    clearWorkshopList,
    createWorkshop,
    deleteWorkshop,
    refreshData,
    resetWorkshopState,
    transactions,
    upsertWorkshop,
    workshops,
  } = useWorkshopState({
    currentPage,
    getAuthToken,
    isAuthenticated,
    user,
  });

  const {
    notificationsUnreadCount,
    refreshNotificationsUnreadCount,
    resetNotificationsUnreadCount,
  } = useNotificationUnreadCount({
    currentPage,
    getAuthToken,
    isAuthenticated,
  });

  const {
    updateCurrentUserProfile,
    uploadCurrentUserAvatar,
  } = useCurrentUserProfileActions({
    getAuthToken,
    recentProfileCacheRef,
    setUser,
  });

  const clearAuthState = useCallback((targetPage: string = "hero") => {
    setUser(null);
    setIsAuthenticated(false);
    clearWorkshopList();
    resetNotificationsUnreadCount();
    setIsAdmin(false);
    hasBackendProfileRef.current = false;
    recentProfileCacheRef.current = null;
    setCurrentPage(targetPage);
  }, [clearWorkshopList, resetNotificationsUnreadCount, setCurrentPage]);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPageState(pageFromPath(window.location.pathname));
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // --------------------------
  // Auth Initialization
  // --------------------------
  useEffect(() => {
    if (!clerkLoaded) {
      return;
    }

    // 防止 StrictMode 下重复并发初始化
    if (bootstrapAuthInProgressRef.current) {
      return;
    }

    // 初次 bootstrap 成功后，若仍处于登录态：clerkUser 引用在 Clerk 内部刷新
    // session 时会变化导致本 effect 重跑。此时只更新身份兜底信息，不再走完整
    // bootstrap（否则会在 token 轮换窗口拿到 null 而误清空登录态）。
    if (initializedRef.current && hasBackendProfileRef.current && isSignedIn) {
      setUser((prev) => (prev ? buildIdentityFallback(prev, clerkUser) : prev));
      return;
    }

    bootstrapAuthInProgressRef.current = true;
    void (async () => {
      try {
        if (!isSignedIn) {
          const currentPageFromPath = pageFromPath(window.location.pathname);
          const authErrorMessage = detectClerkAuthError(window.location.search, window.location.hash);
          // 在 clearAuthState 重置 hasBackendProfileRef 之前先捕获这两个标志。
          const wasLoggedIn = hasBackendProfileRef.current;
          const wasExplicitSignOut = explicitSignOutRef.current;
          explicitSignOutRef.current = false;
          if (authErrorMessage) {
            sessionStorage.setItem("skill_swap_auth_error", authErrorMessage);
            clearAuthState("auth");
          } else if (currentPageFromPath === "auth") {
            clearAuthState("auth");
          } else if (isSignedOutPreservedPage(currentPageFromPath)) {
            // Public pages stay directly reachable by URL for signed-out visitors.
            clearAuthState(currentPageFromPath);
          } else {
            clearAuthState("hero");
          }
          // 仅“之前已登录 + 非用户主动登出 + 非 OAuth 回调错误”才提示会话过期。
          if (wasLoggedIn && !wasExplicitSignOut && !authErrorMessage) {
            toast.error("Your session expired. Please sign in again.", {
              position: "top-center",
              duration: 6000,
            });
          }
          setIsLoading(false);
          return;
        }

        // 仅在初次 bootstrap 时取一次 token 用于拉取后端 profile。
        const token = await getToken({ template: "signupTemplate" });
        if (!token) {
          clearAuthState("auth");
          setIsLoading(false);
          return;
        }

        try {
          const mapped = await fetchBackendUser(token);
          const hydrated = buildIdentityFallback(mapped, clerkUser);
          setUser(hydrated);
          setIsAuthenticated(true);
          hasBackendProfileRef.current = true;

          if (hydrated.username && hydrated.username !== mapped.username) {
            // Best effort: persist a friendlier username back to backend.
            try {
              await syncFallbackUsername(token, hydrated.username);
            } catch (syncError) {
              console.warn("Failed to sync fallback username to backend", syncError);
            }
          }

          // 登录后回到用户请求页（或默认 explore）
          setCurrentPage(resolvePostLoginPage());
        } catch (e) {
          console.error("❌ Failed to fetch backend profile after login:", e);
          clearAuthState("auth");
          toast.error("Login succeeded, but failed to load profile from backend.");
        }

        setIsLoading(false);
      } finally {
        bootstrapAuthInProgressRef.current = false;
        initializedRef.current = true;
      }
    })();
  }, [
    clerkLoaded,
    isSignedIn,
    getToken,
    fetchBackendUser,
    clerkUser,
    clearAuthState,
    setCurrentPage,
  ]);

  const clearCache = useCallback(() => {
    localStorage.clear();
    sessionStorage.clear();
    setUser(null);
    resetWorkshopState();
    resetNotificationsUnreadCount();
    setIsAuthenticated(false);
    setIsAdmin(false);
    hasBackendProfileRef.current = false;
    recentProfileCacheRef.current = null;
    setCurrentPage("hero");
    toast.success("Cache cleared! Refreshing...");
    setTimeout(() => window.location.reload(), 1000);
  }, [resetNotificationsUnreadCount, resetWorkshopState, setCurrentPage]);

  const signOut = useCallback(async () => {
    explicitSignOutRef.current = true;
    await clerkSignOut();
    setUser(null);
    resetWorkshopState();
    resetNotificationsUnreadCount();
    setIsAuthenticated(false);
    setIsAdmin(false);
    hasBackendProfileRef.current = false;
    recentProfileCacheRef.current = null;
    setCurrentPage("hero");
    toast.success("Signed out successfully");
  }, [clerkSignOut, resetNotificationsUnreadCount, resetWorkshopState, setCurrentPage]);

  const contextValue = useMemo<AppContextType>(() => ({
    user,
    workshops,
    transactions,
    currentPage,
    authTab,
    isDarkMode,
    isAuthenticated,
    isAdmin,
    notificationsUnreadCount,
    refreshNotificationsUnreadCount,
    isLoading,
    getAuthToken,
    setCurrentPage,
    toggleDarkMode,
    attendWorkshop,
    cancelWorkshopAttendance,
    createWorkshop,
    deleteWorkshop,
    signOut,
    updateCurrentUserProfile,
    uploadCurrentUserAvatar,
    refreshData,
    clearCache,
    upsertWorkshop,
  }), [
    user,
    workshops,
    transactions,
    currentPage,
    authTab,
    isDarkMode,
    isAuthenticated,
    isAdmin,
    notificationsUnreadCount,
    refreshNotificationsUnreadCount,
    isLoading,
    getAuthToken,
    setCurrentPage,
    toggleDarkMode,
    attendWorkshop,
    cancelWorkshopAttendance,
    createWorkshop,
    deleteWorkshop,
    signOut,
    updateCurrentUserProfile,
    uploadCurrentUserAvatar,
    refreshData,
    clearCache,
    upsertWorkshop,
  ]);

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
};
