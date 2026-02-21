import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { User, Workshop, CreditTransaction } from "../types";
import {
  mockUser,
  mockWorkshops,
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

  // Toggle mock vs real auth easily
  const USE_SUPABASE = false;

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
  // Auth Initialization
  // --------------------------
  useEffect(() => {
    if (USE_SUPABASE) {
      checkSupabaseAuthState();
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session) {
          console.log("🔑 Auth state changed: logged in", session.user);
          setUser(mapSupabaseUser(session.user));
          setIsAuthenticated(true);
          setCurrentPage("home");
        } else {
          console.log("🚪 Auth state changed: logged out");
          setUser(null);
          setIsAuthenticated(false);
          setCurrentPage("hero");
        }
      });
      return () => subscription.unsubscribe();
    } else {
      checkMockAuthState();
    }
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

  const checkSupabaseAuthState = async () => {
    console.log("🔍 Checking Supabase session...");
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      setUser(mapSupabaseUser(data.session.user));
      setWorkshops(mockWorkshops);
      setTransactions(mockTransactions);
      setIsAuthenticated(true);
      setSessionToken(data.session.access_token || null);
      localStorage.setItem("skill-swap-sessionToken", data.session.access_token || "");
      setCurrentPage("home");
    } else {
      setSessionToken(null);
      localStorage.removeItem("skill-swap-sessionToken");
      setCurrentPage("hero");
    }
    setIsLoading(false);
  };

  const checkMockAuthState = async () => {
    console.log("🔍 Checking mock auth...");
    const savedAuth = localStorage.getItem("skill-swap-auth");
    const savedUser = localStorage.getItem("skill-swap-user");
    const savedToken = localStorage.getItem("skill-swap-sessionToken");
    if (savedAuth === "true" && savedUser) {
      try {
        const userData = JSON.parse(savedUser);
        setUser(userData);
        // 登录状态下从后端拉取workshops
        try {
          const backendWorkshops = await workshopAPI.getAll();
          setWorkshops(backendWorkshops);
        } catch (err) {
          console.warn("⚠️ Failed to fetch workshops, using mock data", err);
          setWorkshops(mockWorkshops);
        }
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
    setWorkshops(mockWorkshops);
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
      
      // 调用后端 API
      await workshopAPI.join(workshopId);
      
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
      
      // 调用后端 API
      await workshopAPI.leave(workshopId);
      
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
    if (!isAuthenticated || !user) {
      toast.error("Please sign in to create workshops");
      return;
    }
    const newWorkshop: Workshop = {
      id: `workshop-${Date.now()}`,
      ...workshopData,
      facilitatorId: user.id,
      facilitator: user,
      currentParticipants: 0,
      participants: [],
      status: "upcoming",
    };
    setWorkshops((prev) => [newWorkshop, ...prev]);
    toast.success("Workshop created!");
    setCurrentPage("dashboard");
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
