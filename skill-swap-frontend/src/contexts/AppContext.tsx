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
import { authAPI, notificationAPI, workshopAPI } from "../lib/api";
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
  refreshData: () => Promise<void>;
  clearCache: () => void;
  upsertWorkshop: (workshop: Workshop) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [currentPage, setCurrentPageState] = useState("hero");
  const [authTab, setAuthTab] = useState<"signin" | "signup">("signin");
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [notificationsUnreadCount, setNotificationsUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  
  // 防止标签页切换时重复初始化
  const initializedRef = useRef(false);
  const refreshInFlightRef = useRef<Promise<void> | null>(null);

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

  // --------------------------
  // Theme Initialization
  // --------------------------
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
    if (isAdmin && sessionToken) {
      return workshopAPI.getAllForAdmin(sessionToken);
    }

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
  }, [isAdmin, isAuthenticated, sessionToken]);

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
    checkSupabaseAuthState();

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

        // token 轮换时仅更新 token，不重复拉 profile/页面跳转。
        if (event === "TOKEN_REFRESHED") {
          return;
        }

        try {
          const profile = await fetchBackendProfile(session.access_token);
          const mapped = mapBackendUser(profile);

          setUser(mapped);
          setIsAuthenticated(true);
          setSessionToken(session.access_token);

          localStorage.setItem("skill-swap-sessionToken", session.access_token);
          localStorage.setItem("skill-swap-user", JSON.stringify(mapped));

          if (event === "SIGNED_IN") {
            setCurrentPage("home");
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

          localStorage.removeItem("skill-swap-sessionToken");
          localStorage.removeItem("skill-swap-user");

          setCurrentPage("auth"); // 或 hero
          toast.error("Login succeeded, but failed to load profile from backend.");
        }
      } else {
        setUser(null);
        setIsAuthenticated(false);
        setSessionToken(null);
        setWorkshops([]);
        setNotificationsUnreadCount(0);
        setIsAdmin(false);

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

  useEffect(() => {
    if (!sessionToken) {
      setNotificationsUnreadCount(0);
      return;
    }

    refreshNotificationsUnreadCount();
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
      avatarUrl: userProfile.avatarUrl || "",
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

  const checkSupabaseAuthState = async () => {
    const { data } = await supabase.auth.getSession();
    const session = data.session;

    if (!session) {
      setUser(null);
      setIsAuthenticated(false);
      setSessionToken(null);
      setWorkshops([]);
      setNotificationsUnreadCount(0);
      setIsAdmin(false);
      localStorage.removeItem("skill-swap-sessionToken");
      localStorage.removeItem("skill-swap-user");
      setCurrentPage("hero");
      setIsLoading(false);
      return;
    }

    try {
      const profile = await fetchBackendProfile(session.access_token);
      const mapped = mapBackendUser(profile);

      setUser(mapped);
      setIsAuthenticated(true);
      setSessionToken(session.access_token);

      localStorage.setItem("skill-swap-sessionToken", session.access_token);
      localStorage.setItem("skill-swap-user", JSON.stringify(mapped));
      setCurrentPage("home");
    } catch (e) {
      console.error("❌ Failed to fetch backend profile on startup:", e);
      setUser(null);
      setIsAuthenticated(false);
      setSessionToken(null);
      setWorkshops([]);
      setNotificationsUnreadCount(0);
      setIsAdmin(false);
      setCurrentPage("auth");
    } finally {
      setIsLoading(false);
    }
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
        setCurrentPage("home");
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
    if (authTabOption) setAuthTab(authTabOption);
  };

  // --------------------------
  // Data
  // --------------------------
  const refreshData = useCallback(async () => {
    if (refreshInFlightRef.current) {
      return refreshInFlightRef.current;
    }

    const task = (async () => {
      try {
        const backendWorkshops = await fetchVisibleWorkshops();
        setWorkshops(backendWorkshops);
      } catch (err) {
        console.warn("⚠️ Failed to fetch workshops", err);
      }

      // 积分系统已停用：不再加载 mock 交易历史。
      // setTransactions(mockTransactions);
      setTransactions([]);
    })();

    refreshInFlightRef.current = task;
    try {
      await task;
    } finally {
      refreshInFlightRef.current = null;
    }
  }, [fetchVisibleWorkshops]);

  const refreshNotificationsUnreadCount = async () => {
    if (!sessionToken) {
      setNotificationsUnreadCount(0);
      return;
    }
    try {
      const count = await notificationAPI.getUnreadCount(sessionToken);
      setNotificationsUnreadCount(count);
    } catch (error) {
      console.warn("Failed to fetch notification count", error);
    }
  };

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
        setCurrentPage("home");
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
    localStorage.removeItem("skill-swap-auth");
    localStorage.removeItem("skill-swap-user");
    localStorage.removeItem("skill-swap-sessionToken");
    setCurrentPage("hero");
    toast.success("Signed out successfully");
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
        void refreshData();
      }, 0);
    } catch (error) {
      console.error("Failed to join workshop:", error);
      const message = error instanceof Error ? error.message : "Unknown error";
      const alreadyParticipant = message.toLowerCase().includes("already a participant");

      if (alreadyParticipant) {
        // 若后端返回“已参加”，将其视为幂等成功并后台刷新列表。
        void refreshData();
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
        void refreshData();
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
      const createdWorkshop = await workshopAPI.create(workshopData, sessionToken);
      upsertWorkshop(createdWorkshop);
      
      toast.success("Workshop created successfully!");
      setCurrentPage("dashboard");

      // 切页后由页面按需刷新，这里额外后台拉一次保证全局列表最终一致。
      setTimeout(() => {
        void refreshData();
      }, 0);
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
