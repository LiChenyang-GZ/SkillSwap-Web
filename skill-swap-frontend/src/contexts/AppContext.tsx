import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  ReactNode,
} from "react";
import { User, Workshop, CreditTransaction } from "../types";
import {
  // mockWorkshops,
  // mockTransactions,
} from "../lib/mock-data";
import { authAPI, notificationAPI, resolveAssetUrl, workshopAPI } from "../lib/api";
import { supabase } from "../utils/supabase/supabase";
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
  createWorkshop: (workshopData: any) => Promise<void>;
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
  refreshData: (mode?: "public" | "mine" | "full") => Promise<void>;
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
  const refreshInFlightRef = useRef<{ mode: "public" | "mine" | "full"; task: Promise<void> } | null>(null);
  const notificationsInFlightRef = useRef<Promise<void> | null>(null);
  const profileInFlightRef = useRef<Promise<User> | null>(null);
  const profileInFlightTokenRef = useRef<string | null>(null);
  const lastAppliedProfileTokenRef = useRef<string | null>(null);
  const bootstrapAuthInProgressRef = useRef(false);
  const hasBackendProfileRef = useRef(false);
  const recentProfileCacheRef = useRef<{ subject: string | null; user: User; at: number } | null>(null);

  // Toggle mock vs real auth easily
  const USE_SUPABASE = true;

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

  const computeIsAdmin = (token: string | null) => {
    const payload = decodeJwtPayload(token);
    if (!payload) return false;

    const roleValue = payload.role || payload.roles;
    const appMetadata = payload.app_metadata || payload.appMetadata || {};
    const appRoles = appMetadata.roles || appMetadata.role;

    const rawRoles = ([] as string[]).concat(
      Array.isArray(roleValue) ? roleValue : roleValue ? [roleValue] : [],
      Array.isArray(appRoles) ? appRoles : appRoles ? [appRoles] : []
    );

    const normalized = rawRoles.map((role) => String(role).toLowerCase());
    return normalized.includes("admin") || normalized.includes("role_admin");
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
      const [publicWorkshops, myWorkshops] = await Promise.all([
        workshopAPI.getPublic(),
        workshopAPI.getMine(sessionToken),
      ]);
      const merged = new Map<string, Workshop>();
      [...publicWorkshops, ...myWorkshops].forEach((workshop) => {
        merged.set(workshop.id, workshop);
      });
      return Array.from(merged.values());
    }

    return workshopAPI.getPublic();
  }, [isAuthenticated, sessionToken]);

  const fetchPublicWorkshops = useCallback(async () => {
    return workshopAPI.getPublic();
  }, []);

  const fetchMineWorkshops = useCallback(async () => {
    if (!isAuthenticated || !sessionToken) {
      return [];
    }
    return workshopAPI.getMine(sessionToken);
  }, [isAuthenticated, sessionToken]);

  // --------------------------
  // Auth Initialization
  // --------------------------
  useEffect(() => {
    // 防止重复初始化（标签页切换时）
    if (initializedRef.current) return;
    initializedRef.current = true;

    if (!USE_SUPABASE) {
      (async () => {
        await restoreAuthStateFromStorage();
      })();
      return;
    }

    // 1) 启动时恢复 session（刷新页面也能保持登录态）
    void checkSupabaseAuthState();

    // 2) 订阅登录/登出变化
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      // INITIAL_SESSION 已由 checkSupabaseAuthState 处理，避免重复拉取。
      if (event === "INITIAL_SESSION") {
        return;
      }

      if (session) {
        setSessionToken(session.access_token);
        localStorage.setItem("skill-swap-sessionToken", session.access_token);

        if (
          bootstrapAuthInProgressRef.current &&
          event !== "USER_UPDATED"
        ) {
          return;
        }

        // token 轮换时仅更新 token，不重复拉 profile/页面跳转。
        if (event === "TOKEN_REFRESHED") {
          return;
        }

        if (hasBackendProfileRef.current && event !== "USER_UPDATED") {
          lastAppliedProfileTokenRef.current = session.access_token;
          return;
        }

        if (
          event !== "USER_UPDATED" &&
          lastAppliedProfileTokenRef.current === session.access_token
        ) {
          return;
        }

        try {
          const mapped = await fetchBackendUser(session.access_token);

          setUser(mapped);
          setIsAuthenticated(true);
          setSessionToken(session.access_token);
          lastAppliedProfileTokenRef.current = session.access_token;
          hasBackendProfileRef.current = true;

          localStorage.setItem("skill-swap-sessionToken", session.access_token);
          localStorage.setItem("skill-swap-user", JSON.stringify(mapped));

          if (event === "SIGNED_IN") {
            setCurrentPage("explore");
            toast.success(`Welcome, ${mapped.username}!`);
          }
        } catch (e) {
          console.error("❌ Failed to fetch backend profile after login:", e);

          setUser(null);
          setIsAuthenticated(false);
          setSessionToken(null);
          setWorkshops([]);
          setNotificationsUnreadCount(0);
          setIsAdmin(false);
          hasBackendProfileRef.current = false;

          localStorage.removeItem("skill-swap-sessionToken");
          localStorage.removeItem("skill-swap-user");

          setCurrentPage("auth"); // 或 hero
          toast.error("Login succeeded, but failed to load profile from backend.");
        }
      } else {
        setUser(null);
        setIsAuthenticated(false);
        setSessionToken(null);
        lastAppliedProfileTokenRef.current = null;
        setWorkshops([]);
        setNotificationsUnreadCount(0);
        setIsAdmin(false);
        hasBackendProfileRef.current = false;
        recentProfileCacheRef.current = null;

        localStorage.removeItem("skill-swap-sessionToken");
        localStorage.removeItem("skill-swap-user");

        setCurrentPage("hero");
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    setIsAdmin(computeIsAdmin(sessionToken));
  }, [sessionToken]);

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
    return {
      id: userProfile.id,
      email: userProfile.email,
      username: userProfile.username,
      avatarUrl: resolveAssetUrl(userProfile.avatarUrl || ""),
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

  function mapSessionUser(session: any): User {
    const sbUser = session?.user;
    const metadata = sbUser?.user_metadata || {};
    const email = sbUser?.email || "";
    const fallbackName = email.includes("@") ? email.split("@")[0] : "Member";
    const username = metadata.full_name || metadata.name || fallbackName;

    return {
      id: sbUser?.id || "",
      email,
      username,
      avatarUrl: resolveAssetUrl(metadata.avatar_url || ""),
      bio: "",
      creditBalance: 0,
      skills: [],
      totalWorkshopsHosted: 0,
      totalWorkshopsAttended: 0,
      rating: 0,
      reviewCount: 0,
      createdAt: sbUser?.created_at || new Date().toISOString(),
    };
  }

  const checkSupabaseAuthState = async () => {
    bootstrapAuthInProgressRef.current = true;
    const { data } = await supabase.auth.getSession();
    const session = data.session;

    if (!session) {
      setUser(null);
      setIsAuthenticated(false);
      setSessionToken(null);
      lastAppliedProfileTokenRef.current = null;
      setWorkshops([]);
      setNotificationsUnreadCount(0);
      setIsAdmin(false);
      hasBackendProfileRef.current = false;
      recentProfileCacheRef.current = null;
      localStorage.removeItem("skill-swap-sessionToken");
      localStorage.removeItem("skill-swap-user");
      setCurrentPage("hero");
      setIsLoading(false);
      bootstrapAuthInProgressRef.current = false;
      return;
    }

    setIsAuthenticated(true);
    setSessionToken(session.access_token);
    lastAppliedProfileTokenRef.current = session.access_token;
    localStorage.setItem("skill-swap-sessionToken", session.access_token);

    const savedUser = localStorage.getItem("skill-swap-user");
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        setUser(parsed);
        hasBackendProfileRef.current = true;
      } catch {
        const fallback = mapSessionUser(session);
        setUser(fallback);
        localStorage.setItem("skill-swap-user", JSON.stringify(fallback));
        hasBackendProfileRef.current = false;
      }
    } else {
      const fallback = mapSessionUser(session);
      setUser(fallback);
      localStorage.setItem("skill-swap-user", JSON.stringify(fallback));
      hasBackendProfileRef.current = false;
    }

    setCurrentPage(resolvePostLoginPage());
    bootstrapAuthInProgressRef.current = false;
    setIsLoading(false);
  };

  const restoreAuthStateFromStorage = async () => {
    const savedAuth = localStorage.getItem("skill-swap-auth");
    const savedUser = localStorage.getItem("skill-swap-user");
    const savedToken = localStorage.getItem("skill-swap-sessionToken");
    
    // workshops 现在在 useEffect 顶部单独加载
    
    if (savedAuth === "true" && savedUser) {
      try {
        const userData = JSON.parse(savedUser);
        setUser(userData);
        // 积分系统已停用：不再加载 mock 交易历史。
        // setTransactions(mockTransactions);
        setTransactions([]);
        setIsAuthenticated(true);
        setSessionToken(savedToken || null);
        setCurrentPage(resolvePostLoginPage());
      } catch {
        localStorage.removeItem("skill-swap-auth");
        localStorage.removeItem("skill-swap-user");
        localStorage.removeItem("skill-swap-sessionToken");
        setSessionToken(null);
        setCurrentPage("hero");
      }
    } else {
      setSessionToken(null);
      setCurrentPage("hero");
    }
    setIsLoading(false);
  };

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

  const resolveRefreshModeByPage = (page: string): "public" | "mine" | "full" => {
    if (page === "home" || page === "explore") {
      return "public";
    }
    if (page === "dashboard" || page === "create") {
      return "mine";
    }
    return "full";
  };

  // --------------------------
  // Data
  // --------------------------
  const refreshData = useCallback(async (mode: "public" | "mine" | "full" = "full") => {
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
  }, [fetchMineWorkshops, fetchPublicWorkshops, fetchVisibleWorkshops]);

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
    if (USE_SUPABASE) {
      toast.info("Use Google login button for Supabase auth");
      return;
    }

    // --- Mock Sign-In ---
    if (["demo", "password", "123456"].includes(password)) {
      const usernamePart = email
        .split("@")[0]
        .replace(/[._]/g, " ")
        .replace(/\b\w/g, (l) => l.toUpperCase());
      
      // 调用后端 dev-login 创建/获取用户和 JWT token
      try {
        const loginResult = await authAPI.devRegisterLogin(email, usernamePart);
        
        // 转换后端用户数据为前端 User 类型
        const userData: User = {
          id: loginResult.user.id,
          username: loginResult.user.username,
          email: loginResult.user.email,
          avatarUrl: loginResult.user.avatarUrl,
          bio: loginResult.user.bio,
          creditBalance: loginResult.user.creditBalance,
          skills: [],
          totalWorkshopsHosted: 0,
          totalWorkshopsAttended: 0,
          rating: 0,
          createdAt: new Date().toISOString(),
        };
        
        // 设置本地登录状态
        setUser(userData);
        const latestWorkshops = await fetchVisibleWorkshops();
        setWorkshops(latestWorkshops);
        // 积分系统已停用：不再加载 mock 交易历史。
        // setTransactions(mockTransactions);
        setTransactions([]);
        setIsAuthenticated(true);
        setSessionToken(loginResult.access_token);
        localStorage.setItem("skill-swap-auth", "true");
        localStorage.setItem("skill-swap-user", JSON.stringify(userData));
        localStorage.setItem("skill-swap-sessionToken", loginResult.access_token);
        setCurrentPage("explore");
        toast.success(`Welcome, ${userData.username}!`);
      } catch (error) {
        console.error("❌ Dev login failed:", error);
        toast.error("Login failed: " + (error instanceof Error ? error.message : "Unknown error"));
      }
    } else {
      throw new Error("Invalid email or password. Try password: demo");
    }
  };

  const signOut = async () => {
    if (USE_SUPABASE) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setWorkshops([]);
    setTransactions([]);
    setIsAuthenticated(false);
    setSessionToken(null);
    setIsAdmin(false);
    hasBackendProfileRef.current = false;
    lastAppliedProfileTokenRef.current = null;
    recentProfileCacheRef.current = null;
    localStorage.removeItem("skill-swap-auth");
    localStorage.removeItem("skill-swap-user");
    localStorage.removeItem("skill-swap-sessionToken");
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

  const createWorkshop = async (workshopData: any) => {
    if (!isAuthenticated || !user || !sessionToken) {
      toast.error("Please sign in to create workshops");
      return;
    }
    
    try {
      // 调用后端 API 创建 workshop
      await workshopAPI.create(workshopData, sessionToken);
      
      toast.success("Workshop created successfully!");
      setCurrentPage("dashboard");
    } catch (error) {
      console.error("Failed to create workshop:", error);
      toast.error("Failed to create workshop: " + (error instanceof Error ? error.message : "Unknown error"));
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
