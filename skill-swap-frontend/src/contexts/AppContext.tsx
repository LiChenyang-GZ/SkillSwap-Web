import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  ReactNode,
} from "react";
import { useAuth, useUser } from "@clerk/clerk-react";
import type { WorkshopUpsertPayload } from "../lib/api";
import type { User } from "../types/user";
import type { Workshop } from "../types/workshop";
import type { CreditTransaction } from "../types/creditTransaction";
import { notificationAPI, resolveAssetUrl, workshopAPI } from "../lib/api";
import { useCreateWorkshopAction } from "../shared/hooks/workshop/useCreateWorkshopAction";
import { workshopDiscoveryService } from "../shared/service/workshop/workshopDiscoveryService";
import { toast } from "sonner";

interface AppContextType {
  user: User | null;
  workshops: Workshop[];
  transactions: CreditTransaction[];
  currentPage: string;
  authTab: "signin" | "signup";
  isDarkMode: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  notificationsUnreadCount: number;
  refreshNotificationsUnreadCount: () => Promise<void>;
  isLoading: boolean;
  sessionToken: string | null;
  setCurrentPage: (page: string, authTab?: "signin" | "signup") => void;
  toggleDarkMode: () => void;
  attendWorkshop: (workshopId: string) => Promise<void>;
  cancelWorkshopAttendance: (workshopId: string) => Promise<void>;
  createWorkshop: (workshopData: WorkshopUpsertPayload) => Promise<boolean>;
  deleteWorkshop: (workshopId: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateCurrentUserProfile: (updates: {
    username?: string;
    avatarUrl?: string;
    bio?: string;
    skills?: string[];
  }) => Promise<User>;
  uploadCurrentUserAvatar: (file: File) => Promise<User>;
  refreshData: (mode?: "public" | "mine" | "full" | "dashboard") => Promise<void>;
  clearCache: () => void;
  upsertWorkshop: (workshop: Workshop) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const PAGE_TO_PATH: Record<string, string> = {
  hero: "/",
  home: "/home",
  explore: "/explore",
  create: "/create",
  dashboard: "/dashboard",
  memory: "/memory",
  adminMemory: "/admin/memory",
  feedback: "/feedback",
  notifications: "/notifications",
  adminReview: "/admin/workshops",
  auth: "/auth",
  credits: "/credits",
};

const PATH_TO_PAGE: Record<string, string> = {
  "/": "hero",
  "/home": "home",
  "/explore": "explore",
  "/create": "create",
  "/dashboard": "dashboard",
  "/memory": "memory",
  "/admin/memory": "adminMemory",
  "/feedback": "feedback",
  "/notifications": "notifications",
  "/admin/workshops": "adminReview",
  "/auth": "auth",
  "/credits": "credits",
};

const normalizePath = (pathname: string) => {
  if (!pathname) return "/";
  const trimmed = pathname.trim();
  if (!trimmed || trimmed === "/") return "/";
  return trimmed.endsWith("/") ? trimmed.slice(0, -1) : trimmed;
};

const pageFromPath = (pathname: string) => {
  const normalizedPath = normalizePath(pathname);
  if (normalizedPath.startsWith("/workshops/")) {
    const workshopId = decodeURIComponent(normalizedPath.slice("/workshops/".length));
    return workshopId ? `workshop-${workshopId}` : "explore";
  }
  if (normalizedPath.startsWith("/memory/")) {
    const slug = decodeURIComponent(normalizedPath.slice("/memory/".length));
    return slug ? `memory-entry-${slug}` : "memory";
  }
  return PATH_TO_PAGE[normalizedPath] || "explore";
};

const pathFromPage = (page: string) => {
  if (page.startsWith("workshop-")) {
    const workshopId = page.slice("workshop-".length);
    return `/workshops/${encodeURIComponent(workshopId)}`;
  }
  if (page.startsWith("memory-entry-")) {
    const slug = page.slice("memory-entry-".length);
    return `/memory/${encodeURIComponent(slug)}`;
  }
  return PAGE_TO_PATH[page] || "/explore";
};

const resolvePostLoginPage = () => {
  const requestedPage = pageFromPath(window.location.pathname);
  if (requestedPage === "hero" || requestedPage === "auth") {
    return "explore";
  }
  return requestedPage;
};

export function AppProvider({ children }: { children: ReactNode }) {
  const { isLoaded: clerkLoaded, isSignedIn, getToken, signOut: clerkSignOut } = useAuth();
  const { user: clerkUser } = useUser();

  const [user, setUser] = useState<User | null>(null);
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [currentPage, setCurrentPageState] = useState(() => pageFromPath(window.location.pathname));
  const [authTab, setAuthTab] = useState<"signin" | "signup">("signin");
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [notificationsUnreadCount, setNotificationsUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  
  // 防止标签页切换时重复初始化
  const initializedRef = useRef(false);
  const refreshInFlightRef = useRef<{ mode: "public" | "mine" | "full" | "dashboard"; task: Promise<void> } | null>(null);
  const notificationsInFlightRef = useRef<Promise<void> | null>(null);
  const profileInFlightRef = useRef<Promise<User> | null>(null);
  const profileInFlightTokenRef = useRef<string | null>(null);
  const lastAppliedProfileTokenRef = useRef<string | null>(null);
  const bootstrapAuthInProgressRef = useRef(false);
  const hasBackendProfileRef = useRef(false);
  const recentProfileCacheRef = useRef<{ subject: string | null; user: User; at: number } | null>(null);

  const decodeJwtPayload = (token: string | null) => {
    if (!token) return null;
    try {
      const payload = token.split(".")[1];
      if (!payload) return null;
      const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
      const padded = base64.padEnd(base64.length + (4 - (base64.length % 4)) % 4, "=");
      return JSON.parse(atob(padded));
    } catch (error) {
      console.warn("Failed to decode JWT payload", error);
      return null;
    }
  };

  const normalizeWhitespace = (value: string) => value.trim().replace(/\s+/g, " ");

  const isGeneratedUsername = (value: string | null | undefined) => {
    if (!value) return true;
    const candidate = value.trim();
    if (!candidate) return true;
    return /^user([_\s-]|$)/i.test(candidate);
  };

  const refreshSessionToken = useCallback(async () => {
    const nextToken = await getToken({ template: "signupTemplate" });
    if (nextToken) {
      setSessionToken(nextToken);
    }
    return nextToken ?? null;
  }, [getToken]);

  const createWorkshop = useCreateWorkshopAction({
    isAuthenticated,
    user,
    sessionToken,
    refreshSessionToken,
  });

  const buildIdentityFallback = (backendUser: User): User => {
    const primaryEmail =
      clerkUser?.primaryEmailAddress?.emailAddress?.trim() ||
      clerkUser?.emailAddresses?.[0]?.emailAddress?.trim() ||
      "";

    const fullNameCandidate = normalizeWhitespace(
      clerkUser?.fullName ||
        [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(" ") ||
        ""
    );

    const usernameCandidate =
      (fullNameCandidate && !/^user([_\s-]|$)/i.test(fullNameCandidate) ? fullNameCandidate : "") ||
      clerkUser?.username?.trim() ||
      (primaryEmail.includes("@") ? primaryEmail.split("@")[0] : "");

    const nextEmail = backendUser.email?.trim() || primaryEmail || "";
    const nextUsername = isGeneratedUsername(backendUser.username)
      ? (usernameCandidate || backendUser.username)
      : backendUser.username;

    return {
      ...backendUser,
      email: nextEmail,
      username: nextUsername,
    };
  };


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

  // --------------------------
  // Theme Initialization
  // --------------------------
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPageState(pageFromPath(window.location.pathname));
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    const savedTheme = localStorage.getItem("skill-swap-theme");
    const systemPrefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;

    if (savedTheme === "dark" || (savedTheme === null && systemPrefersDark)) {
      setIsDarkMode(true);
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
    } else {
      setIsDarkMode(false);
      document.documentElement.classList.add("light");
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const fetchVisibleWorkshops = useCallback(async () => {
    if (isAuthenticated && sessionToken) {
      const [publicWorkshops, myWorkshops, attendingWorkshops] = await Promise.all([
        workshopDiscoveryService.getPublic(),
        workshopDiscoveryService.getMine(sessionToken),
        workshopDiscoveryService.getAttending(sessionToken),
      ]);
      const merged = new Map<string, Workshop>();
      [...publicWorkshops, ...myWorkshops, ...attendingWorkshops].forEach((workshop) => {
        merged.set(workshop.id, workshop);
      });
      return Array.from(merged.values());
    }

    return workshopDiscoveryService.getPublic();
  }, [isAuthenticated, sessionToken]);

  const fetchPublicWorkshops = useCallback(async () => {
    return workshopDiscoveryService.getPublic();
  }, []);

  const fetchMineWorkshops = useCallback(async () => {
    if (!isAuthenticated || !sessionToken) {
      return [];
    }
    return workshopDiscoveryService.getMine(sessionToken);
  }, [isAuthenticated, sessionToken]);

  const fetchDashboardWorkshops = useCallback(async () => {
    if (!isAuthenticated || !sessionToken) {
      return [];
    }

    const [myWorkshops, attendingWorkshops] = await Promise.all([
      workshopDiscoveryService.getMine(sessionToken),
      workshopDiscoveryService.getAttending(sessionToken),
    ]);

    const merged = new Map<string, Workshop>();
    [...myWorkshops, ...attendingWorkshops].forEach((workshop) => {
      merged.set(workshop.id, workshop);
    });
    return Array.from(merged.values());
  }, [isAuthenticated, sessionToken]);

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

    const clearAuthState = (targetPage: "hero" | "auth" = "hero") => {
      setUser(null);
      setIsAuthenticated(false);
      setSessionToken(null);
      lastAppliedProfileTokenRef.current = null;
      setWorkshops([]);
      setNotificationsUnreadCount(0);
      setIsAdmin(false);
      hasBackendProfileRef.current = false;
      recentProfileCacheRef.current = null;
      setCurrentPage(targetPage);
    };

    const detectClerkAuthError = () => {
      const raw = `${window.location.search} ${window.location.hash}`.toLowerCase();
      const hasExternalAccountNotFound = raw.includes("external_account_not_found");
      const hasOauthError = raw.includes("oauth") && (raw.includes("error") || raw.includes("failed"));
      if (!hasExternalAccountNotFound && !hasOauthError) {
        return null;
      }
      if (hasExternalAccountNotFound) {
        return "This Google account is not linked yet. Please click Sign Up once to create and link your account, then use Sign In.";
      }
      return "Third-party sign-in did not complete. Please try again. If this is your first time with Google, click Sign Up first.";
    };

    bootstrapAuthInProgressRef.current = true;
    void (async () => {
      try {
        if (!isSignedIn) {
          const currentPageFromPath = pageFromPath(window.location.pathname);
          const authErrorMessage = detectClerkAuthError();
          if (authErrorMessage) {
            sessionStorage.setItem("skill_swap_auth_error", authErrorMessage);
            clearAuthState("auth");
          } else if (currentPageFromPath === "auth") {
            clearAuthState("auth");
          } else {
            clearAuthState("hero");
          }
          setIsLoading(false);
          return;
        }

        const token = await getToken({ template: 'signupTemplate' });
        if (!token) {
          clearAuthState("auth");
          setIsLoading(false);
          return;
        }

        setSessionToken(token);

        try {
          const mapped = await fetchBackendUser(token);
          const hydrated = buildIdentityFallback(mapped);
          setUser(hydrated);
          setIsAuthenticated(true);
          setSessionToken(token);
          lastAppliedProfileTokenRef.current = token;
          hasBackendProfileRef.current = true;

          if (hydrated.username && hydrated.username !== mapped.username) {
            // Best effort: persist a friendlier username back to backend.
            try {
              await fetch(`${import.meta.env.VITE_API_BASE_URL || "http://localhost:8080"}/api/v1/users/me`, {
                method: "PATCH",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ username: hydrated.username }),
              });
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
  }, [clerkLoaded, isSignedIn, getToken, fetchBackendUser, clerkUser]);

  // --------------------------
  // Helpers
  // --------------------------
  // 历史保留：Supabase user 映射函数当前未被调用。
  // const mapSupabaseUser = (sbUser: any): User => ({
  //   ...mockUser, // fallback defaults
  //   id: sbUser.id,
  //   email: sbUser.email ?? "",
  //   username: sbUser.user_metadata?.full_name ?? sbUser.email?.split("@")[0],
  //   avatarUrl: sbUser.user_metadata?.avatar_url ?? mockUser.avatarUrl,
  // });

  async function fetchBackendProfile(accessToken: string) {
    // 统一用一个 endpoint（建议你用后端的 /me）
    const base = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

    // ✅ 这里请改成你后端真实的 endpoint：
    // 你之前 controller 是 /me，就用 `${base}/me`
    // 你现在代码用的是 /api/users/current
    const url = `${base}/api/v1/users/me`;

    const res = await fetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Fetch profile failed (${res.status}): ${text}`);
    }

    return res.json();
  }

  function mapBackendUser(userProfile: any): User {
    const rawAvatar =
      userProfile.avatarUrl ||
      userProfile.avatar_url ||
      userProfile.avatar ||
      "";
    const resolvedAvatar = resolveAssetUrl(rawAvatar);
    const avatarVersion =
      userProfile.updatedAt ||
      userProfile.updated_at ||
      userProfile.avatarUpdatedAt ||
      userProfile.avatar_updated_at ||
      "";

    const avatarUrl = resolvedAvatar
      ? (avatarVersion
          ? `${resolvedAvatar}${resolvedAvatar.includes("?") ? "&" : "?"}v=${encodeURIComponent(String(avatarVersion))}`
          : resolvedAvatar)
      : "";

    return {
      id: String(userProfile.id),
      email: userProfile.email,
      username: userProfile.username,
      avatarUrl,
      bio: userProfile.bio || "",
      // 积分系统已停用：默认值改为 0（保留旧默认值作为注释）。
      // creditBalance: userProfile.creditBalance ?? 100,
      creditBalance: userProfile.creditBalance ?? 0,
      skills: userProfile.skills || [],
      totalWorkshopsHosted: userProfile.totalWorkshopsHosted || 0,
      totalWorkshopsAttended: userProfile.totalWorkshopsAttended || 0,
      rating: userProfile.rating || 0,
      reviewCount: userProfile.reviewCount || 0,
      createdAt: userProfile.createdAt || new Date().toISOString(),
    };
  }

  // --------------------------
  // Cache
  // --------------------------
  const clearCache = () => {
    localStorage.clear();
    sessionStorage.clear();
    setUser(null);
    setWorkshops([]);
    setTransactions([]);
    setIsAuthenticated(false);
    setCurrentPage("hero");
    toast.success("Cache cleared! Refreshing...");
    setTimeout(() => window.location.reload(), 1000);
  };

  // --------------------------
  // Navigation
  // --------------------------
  const setCurrentPage = (page: string, authTabOption?: "signin" | "signup") => {
    setCurrentPageState(page);

    const targetPath = pathFromPage(page);
    if (normalizePath(window.location.pathname) !== targetPath) {
      window.history.pushState({ page }, "", targetPath);
    }

    if (authTabOption) setAuthTab(authTabOption);
  };

  const resolveRefreshModeByPage = (page: string): "public" | "mine" | "full" | "dashboard" => {
    if (page === "home" || page === "explore") {
      return "public";
    }
    if (page === "dashboard") {
      return "dashboard";
    }
    if (page === "create") {
      return "mine";
    }
    return "full";
  };

  // --------------------------
  // Data
  // --------------------------
  const refreshData = useCallback(async (mode: "public" | "mine" | "full" | "dashboard" = "full") => {
    if (refreshInFlightRef.current && refreshInFlightRef.current.mode === mode) {
      return refreshInFlightRef.current.task;
    }

    const task = (async () => {
      try {
        let backendWorkshops: Workshop[];
        if (mode === "public") {
          backendWorkshops = await fetchPublicWorkshops();
        } else if (mode === "mine") {
          backendWorkshops = await fetchMineWorkshops();
        } else if (mode === "dashboard") {
          backendWorkshops = await fetchDashboardWorkshops();
        } else {
          backendWorkshops = await fetchVisibleWorkshops();
        }
        setWorkshops(backendWorkshops);
      } catch (err) {
        console.warn("⚠️ Failed to fetch workshops", err);
      }

      // 积分系统已停用：不再加载 mock 交易历史。
      // setTransactions(mockTransactions);
      setTransactions([]);
    })();

    refreshInFlightRef.current = { mode, task };
    try {
      await task;
    } finally {
      if (refreshInFlightRef.current?.task === task) {
        refreshInFlightRef.current = null;
      }
    }
  }, [fetchDashboardWorkshops, fetchMineWorkshops, fetchPublicWorkshops, fetchVisibleWorkshops]);

  const refreshNotificationsUnreadCount = useCallback(async () => {
    if (!sessionToken) {
      setNotificationsUnreadCount(0);
      return;
    }

    if (notificationsInFlightRef.current) {
      return notificationsInFlightRef.current;
    }

    const task = (async () => {
      try {
        const count = await notificationAPI.getUnreadCount(sessionToken);
        setNotificationsUnreadCount(count);
      } catch (error) {
        console.warn("Failed to fetch notification count", error);
      }
    })();

    notificationsInFlightRef.current = task;
    try {
      await task;
    } finally {
      notificationsInFlightRef.current = null;
    }
  }, [sessionToken]);

  useEffect(() => {
    if (!sessionToken) {
      setNotificationsUnreadCount(0);
      return;
    }

    if (currentPage === "notifications") {
      return;
    }

    // 在非通知页面后台刷新未读数，避免阻塞当前页渲染。
    const timer = window.setTimeout(() => {
      void refreshNotificationsUnreadCount();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [currentPage, refreshNotificationsUnreadCount, sessionToken]);

  const upsertWorkshop = useCallback((workshop: Workshop) => {
    setWorkshops((prev) => {
      const index = prev.findIndex((item) => item.id === workshop.id);
      if (index === -1) {
        return [workshop, ...prev];
      }
      const next = [...prev];
      next[index] = workshop;
      return next;
    });
  }, []);

  // --------------------------
  // Auth Actions
  // --------------------------
  const signIn = async (email: string, password: string) => {
    // Clerk 登录/注册由 AuthPage 承载，这里仅保留接口兼容。
    console.debug("signIn called (delegated to Clerk)", { email, passwordLen: password?.length });
    setCurrentPage("auth");
    toast.info("Please sign in on the auth page.");
  };

  const signOut = async () => {
    await clerkSignOut();
    setUser(null);
    setWorkshops([]);
    setTransactions([]);
    setIsAuthenticated(false);
    setSessionToken(null);
    setIsAdmin(false);
    hasBackendProfileRef.current = false;
    lastAppliedProfileTokenRef.current = null;
    recentProfileCacheRef.current = null;
    setCurrentPage("hero");
    toast.success("Signed out successfully");
  };

  const parseApiErrorMessage = async (response: Response, fallbackMessage: string): Promise<string> => {
    const raw = await response.text();
    let message = raw;

    try {
      const parsed = JSON.parse(raw);
      message = parsed?.message || parsed?.error || raw;
    } catch {
      // Keep raw response text when not JSON.
    }

    const normalized = typeof message === "string" ? message.trim() : "";
    const lower = normalized.toLowerCase();

    if (
      response.status === 413 ||
      lower.includes("maximum upload size") ||
      lower.includes("size exceeds") ||
      lower.includes("payload too large")
    ) {
      return "Image is too large. Please upload an image up to 10MB.";
    }

    const cleaned = normalized
      .replace(/^an unexpected error occurred:\s*/i, "")
      .replace(/\s+caused by:.*/i, "")
      .trim();

    return cleaned || fallbackMessage;
  };

  const updateCurrentUserProfile = async (updates: {
    username?: string;
    avatarUrl?: string;
    bio?: string;
    skills?: string[];
  }): Promise<User> => {
    if (!sessionToken) {
      throw new Error("Please sign in again before updating your profile.");
    }

    const base = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";
    const response = await fetch(`${base}/api/v1/users/me`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sessionToken}`,
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      const message = await parseApiErrorMessage(response, `Failed to update profile (${response.status}).`);
      throw new Error(message || `Failed to update profile (${response.status}).`);
    }

    const profile = await response.json();
    const mapped = mapBackendUser(profile);

    setUser(mapped);
    localStorage.setItem("skill-swap-user", JSON.stringify(mapped));

    const payload = decodeJwtPayload(sessionToken) as { sub?: string } | null;
    recentProfileCacheRef.current = {
      subject: payload?.sub ?? null,
      user: mapped,
      at: Date.now(),
    };

    return mapped;
  };

  const uploadCurrentUserAvatar = async (file: File): Promise<User> => {
    if (!sessionToken) {
      throw new Error("Please sign in again before updating your avatar.");
    }

    const formData = new FormData();
    formData.append("file", file);

    const base = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";
    const response = await fetch(`${base}/api/v1/users/me/avatar`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${sessionToken}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const message = await parseApiErrorMessage(response, `Failed to upload avatar (${response.status}).`);
      throw new Error(message || `Failed to upload avatar (${response.status}).`);
    }

    const profile = await response.json();
    const mapped = mapBackendUser(profile);

    setUser(mapped);
    localStorage.setItem("skill-swap-user", JSON.stringify(mapped));

    const payload = decodeJwtPayload(sessionToken) as { sub?: string } | null;
    recentProfileCacheRef.current = {
      subject: payload?.sub ?? null,
      user: mapped,
      at: Date.now(),
    };

    return mapped;
  };

  // --------------------------
  // Workshop Actions
  // --------------------------
  const attendWorkshop = async (workshopId: string) => {
    if (!isAuthenticated || !user) {
      toast.error("Please sign in to attend workshops");
      return;
    }
    
    try {
      // 查找要 join 的 workshop
      // 尝试精确匹配，也支持数字ID格式
      let workshop = workshops.find((w) => w.id === workshopId);
      
      // 如果精确匹配失败，尝试转换为数字后再匹配
      if (!workshop && !isNaN(Number(workshopId))) {
        const numId = Number(workshopId);
        workshop = workshops.find((w) => String(w.id) === String(numId) || Number(w.id) === numId);
      }
      
      if (!workshop) {
        throw new Error(`Workshop with ID "${workshopId}" not found in loaded workshops`);
      }
      
      // 积分系统已停用：不再依赖 creditCost。
      // if (workshop.creditCost === undefined || workshop.creditCost === null) {
      //   throw new Error("Workshop has no credit cost defined");
      // }
      //
      // console.log("✅ Found workshop:", workshop.title, "Credit cost:", workshop.creditCost);
      
      // 调用后端 API，传递 JWT token
      await workshopAPI.join(workshopId, sessionToken);
      
      // 积分系统已停用：不再扣减本地余额。
      // const updatedUser = {
      //   ...user,
      //   creditBalance: (user.creditBalance || 0) - workshop.creditCost,
      // };
      // setUser(updatedUser);
      // localStorage.setItem("skill-swap-user", JSON.stringify(updatedUser));
      
      toast.success(`Joined "${workshop.title}"!`);

      // 成功后后台刷新，避免 toast 被全量拉取阻塞。
      setTimeout(() => {
        void refreshData(resolveRefreshModeByPage(currentPage));
      }, 0);
    } catch (error) {
      console.error("Failed to join workshop:", error);
      const message = error instanceof Error ? error.message : "Unknown error";
      const alreadyParticipant = message.toLowerCase().includes("already a participant");

      if (alreadyParticipant) {
        // 若后端返回“已参加”，将其视为幂等成功并后台刷新列表。
        void refreshData(resolveRefreshModeByPage(currentPage));
        toast.success("You are already attending this workshop.");
        return;
      }

      toast.error("Failed to join workshop: " + message);
    }
  };

  const cancelWorkshopAttendance = async (workshopId: string) => {
    if (!isAuthenticated || !user) return;
    
    try {
      // 查找要 leave 的 workshop
      const workshop = workshops.find((w) => w.id === workshopId);
      if (!workshop) {
        throw new Error("Workshop not found");
      }
      
      // 调用后端 API，传递 JWT token
      await workshopAPI.leave(workshopId, sessionToken);
      
      // 积分系统已停用：不再返还本地余额。
      // const updatedUser = {
      //   ...user,
      //   creditBalance: (user.creditBalance || 0) + workshop.creditCost,
      // };
      // setUser(updatedUser);
      // localStorage.setItem("skill-swap-user", JSON.stringify(updatedUser));
      
      toast.success("Workshop attendance cancelled");

      // 后台刷新，避免操作反馈被阻塞。
      setTimeout(() => {
        void refreshData(resolveRefreshModeByPage(currentPage));
      }, 0);
    } catch (error) {
      console.error("Failed to leave workshop:", error);
      toast.error("Failed to leave workshop: " + (error instanceof Error ? error.message : "Unknown error"));
    }
  };

  const deleteWorkshop = async (workshopId: string) => {
    if (!isAuthenticated || !user) {
      toast.error("Please sign in to delete workshops");
      return;
    }

    try {
      // 调用后端 API 删除 workshop，传递 JWT token
      await workshopAPI.delete(workshopId, sessionToken);

      // 删除成功后，从本地状态中移除该 workshop（处理 ID 类型不一致）
      setWorkshops((prev) => 
        prev.filter((w) => String(w.id) !== String(workshopId))
      );

      toast.success("Workshop deleted successfully!");
    } catch (error) {
      console.error("Failed to delete workshop:", error);
      toast.error("Failed to delete workshop: " + (error instanceof Error ? error.message : "Unknown error"));
      throw error;
    }
  };

  return (
    <AppContext.Provider
      value={{
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
        sessionToken,
        setCurrentPage,
        toggleDarkMode: () => {
          const newMode = !isDarkMode;
          setIsDarkMode(newMode);
          localStorage.setItem("skill-swap-theme", newMode ? "dark" : "light");
          document.documentElement.classList.toggle("dark", newMode);
          document.documentElement.classList.toggle("light", !newMode);
        },
        attendWorkshop,
        cancelWorkshopAttendance,
        createWorkshop,
        deleteWorkshop,
        signIn,
        signOut,
        updateCurrentUserProfile,
        uploadCurrentUserAvatar,
        refreshData,
        clearCache,
        upsertWorkshop,
      }}
    >
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
