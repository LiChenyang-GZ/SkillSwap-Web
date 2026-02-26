import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  ReactNode,
} from "react";
import { User, Workshop, CreditTransaction } from "../types";
import {
  mockUser,
  // mockWorkshops,
  mockTransactions,
} from "../lib/mock-data";
import { authAPI, workshopAPI } from "../lib/api";
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
  const [isLoading, setIsLoading] = useState(true);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  
  // 防止标签页切换时重复初始化
  const initializedRef = useRef(false);

  // Toggle mock vs real auth easily
  const USE_SUPABASE = true;

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

  // --------------------------
  // Workshop Loading (only once)
  // --------------------------
  useEffect(() => {
    // 只在挂载时加载一次，防止标签页切换时重复加载
    const loadWorkshops = async () => {
      try {
        console.log("🔄 Loading workshops...");
        const backendWorkshops = await workshopAPI.getAll();
        setWorkshops(backendWorkshops);
        console.log("✅ Loaded workshops from backend:", backendWorkshops.length);
      } catch (err) {
        console.warn("⚠️ Failed to fetch workshops", err);
        setWorkshops([]);
      }
    };

    loadWorkshops();
  }, []); // 空依赖数组，只在挂载时执行一次

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
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session) {
        console.log("🔑 Auth state changed: logged in", session.user);

        try {
          const profile = await fetchBackendProfile(session.access_token);
          const mapped = mapBackendUser(profile);

          setUser(mapped);
          setIsAuthenticated(true);
          setSessionToken(session.access_token);

          localStorage.setItem("skill-swap-sessionToken", session.access_token);
          localStorage.setItem("skill-swap-user", JSON.stringify(mapped));

          setCurrentPage("home");
          toast.success(`Welcome, ${mapped.username}!`);
        } catch (e) {
          console.error("❌ Failed to fetch backend profile after login:", e);

          setUser(null);
          setIsAuthenticated(false);
          setSessionToken(null);

          localStorage.removeItem("skill-swap-sessionToken");
          localStorage.removeItem("skill-swap-user");

          setCurrentPage("auth"); // 或 hero
          toast.error("Login succeeded, but failed to load profile from backend.");
        }
      } else {
        console.log("🚪 Auth state changed: logged out");
        setUser(null);
        setIsAuthenticated(false);
        setSessionToken(null);

        localStorage.removeItem("skill-swap-sessionToken");
        localStorage.removeItem("skill-swap-user");

        setCurrentPage("hero");
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // --------------------------
  // Helpers
  // --------------------------
  const mapSupabaseUser = (sbUser: any): User => ({
    ...mockUser, // fallback defaults
    id: sbUser.id,
    email: sbUser.email ?? "",
    username: sbUser.user_metadata?.full_name ?? sbUser.email?.split("@")[0],
    avatarUrl: sbUser.user_metadata?.avatar_url ?? mockUser.avatarUrl,
  });

  async function fetchBackendProfile(accessToken: string) {
    // 统一用一个 endpoint（建议你用后端的 /me）
    const base = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

    // ✅ 这里请改成你后端真实的 endpoint：
    // 你之前 controller 是 /me，就用 `${base}/me`
    // 你现在代码用的是 /api/users/current
    const url = `${base}/api/v1/users/me`;

    // DEBUG: 解码并打印 JWT header 查看算法
    try {
      const headerBase64 = accessToken.split('.')[0];
      const headerJson = atob(headerBase64);
      console.log('🔍 JWT Header:', headerJson);
    } catch (e) {
      console.log('Failed to decode JWT header:', e);
    }

    const res = await fetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}` },
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
      creditBalance: userProfile.creditBalance ?? 100,
      skills: userProfile.skills || [],
      totalWorkshopsHosted: userProfile.totalWorkshopsHosted || 0,
      totalWorkshopsAttended: userProfile.totalWorkshopsAttended || 0,
      rating: userProfile.rating || 0,
      reviewCount: userProfile.reviewCount || 0,
      createdAt: userProfile.createdAt || new Date().toISOString(),
    };
  }

  const checkSupabaseAuthState = async () => {
    console.log("🔍 Checking Supabase session...");

    const { data } = await supabase.auth.getSession();
    
    console.log("SESSION", data.session);
    console.log("ACCESS_TOKEN", data.session?.access_token);
    const session = data.session;
    if (data.session?.access_token) {
      const header = JSON.parse(atob(data.session.access_token.split(".")[0]));
      console.log("JWT_HEADER", header); // ✅ 看 alg / kid / typ
    }

    if (!session) {
      console.log("🚪 No Supabase session found");
      setUser(null);
      setIsAuthenticated(false);
      setSessionToken(null);
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
      setCurrentPage("auth");
    } finally {
      setIsLoading(false);
    }
  };

  const restoreAuthStateFromStorage = async () => {
    console.log("🔍 Checking mock auth...");
    const savedAuth = localStorage.getItem("skill-swap-auth");
    const savedUser = localStorage.getItem("skill-swap-user");
    const savedToken = localStorage.getItem("skill-swap-sessionToken");
    
    // workshops 现在在 useEffect 顶部单独加载
    
    if (savedAuth === "true" && savedUser) {
      try {
        const userData = JSON.parse(savedUser);
        setUser(userData);
        setTransactions(mockTransactions);
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
    console.log("🧹 Clearing cache...");
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
  const refreshData = async () => {
    try {
      const backendWorkshops = await workshopAPI.getAll();
      setWorkshops(backendWorkshops);
    } catch (err) {
      console.warn("⚠️ Failed to fetch workshops", err);
    }
    setTransactions(mockTransactions);
  };

  // --------------------------
  // Auth Actions
  // --------------------------
  const signIn = async (email: string, password: string) => {
    if (USE_SUPABASE) {
      console.log("🔐 Supabase login via Google should be handled separately");
      toast.info("Use Google login button for Supabase auth");
      return;
    }

    // --- Mock Sign-In ---
    console.log("🔐 Mock sign in with email:", email);
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
        const latestWorkshops = await workshopAPI.getAll();
        setWorkshops(latestWorkshops);
        setTransactions(mockTransactions);
        setIsAuthenticated(true);
        setSessionToken(loginResult.access_token);
        localStorage.setItem("skill-swap-auth", "true");
        localStorage.setItem("skill-swap-user", JSON.stringify(userData));
        localStorage.setItem("skill-swap-sessionToken", loginResult.access_token);
        setCurrentPage("home");
        console.log("✅ Dev login successful, JWT token obtained");
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
      console.log("🎯 Attempting to join workshop:", workshopId);
      console.log("📊 Available workshops:", workshops.map(w => ({ id: w.id, title: w.title })));
      
      // 查找要 join 的 workshop，获取 creditCost
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
      
      if (workshop.creditCost === undefined || workshop.creditCost === null) {
        throw new Error("Workshop has no credit cost defined");
      }
      
      console.log("✅ Found workshop:", workshop.title, "Credit cost:", workshop.creditCost);
      
      // 调用后端 API，传递 JWT token
      await workshopAPI.join(workshopId, sessionToken);
      
      // 更新本地用户状态：扣除 credit
      const updatedUser = {
        ...user,
        creditBalance: (user.creditBalance || 0) - workshop.creditCost,
      };
      setUser(updatedUser);
      localStorage.setItem("skill-swap-user", JSON.stringify(updatedUser));
      
      // 更新本地 workshop 状态
      setWorkshops((prev) =>
        prev.map((w) =>
          w.id === workshopId || String(w.id) === String(workshopId)
            ? {
                ...w,
                currentParticipants: (w.currentParticipants || 0) + 1,
                participants: [...(w.participants || []), user],
              }
            : w
        )
      );
      toast.success(`Joined "${workshop.title}"! -${workshop.creditCost} credits`);
    } catch (error) {
      console.error("Failed to join workshop:", error);
      toast.error("Failed to join workshop: " + (error instanceof Error ? error.message : "Unknown error"));
    }
  };

  const cancelWorkshopAttendance = async (workshopId: string) => {
    if (!isAuthenticated || !user) return;
    
    try {
      // 查找要 leave 的 workshop，获取 creditCost（退还）
      const workshop = workshops.find((w) => w.id === workshopId);
      if (!workshop || !workshop.creditCost) {
        throw new Error("Workshop not found or has no credit cost");
      }
      
      // 调用后端 API，传递 JWT token
      await workshopAPI.leave(workshopId, sessionToken);
      
      // 更新本地用户状态：退还 credit
      const updatedUser = {
        ...user,
        creditBalance: (user.creditBalance || 0) + workshop.creditCost,
      };
      setUser(updatedUser);
      localStorage.setItem("skill-swap-user", JSON.stringify(updatedUser));
      
      // 更新本地 workshop 状态
      setWorkshops((prev) =>
        prev.map((w) =>
          w.id === workshopId
            ? {
                ...w,
                currentParticipants: (w.currentParticipants || 1) - 1,
                participants: (w.participants || []).filter((p) => p.id !== user.id),
              }
            : w
        )
      );
      toast.success("Workshop attendance cancelled");
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
      
      // 创建成功后，重新从后端拉取所有 workshops
      const updatedWorkshops = await workshopAPI.getAll();
      setWorkshops(updatedWorkshops);
      
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
      console.log("🗑️ Attempting to delete workshop:", workshopId);
      // 调用后端 API 删除 workshop，传递 JWT token
      await workshopAPI.delete(workshopId, sessionToken);

      // 删除成功后，从本地状态中移除该 workshop（处理 ID 类型不一致）
      setWorkshops((prev) => 
        prev.filter((w) => String(w.id) !== String(workshopId))
      );

      toast.success("Workshop deleted successfully!");
      console.log("✅ Workshop deleted from local state");
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
