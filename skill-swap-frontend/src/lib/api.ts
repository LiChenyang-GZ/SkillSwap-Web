// lib/api.ts

import { NotificationItem, Workshop, User } from '@/types';
import { supabase } from '../utils/supabase/supabase';
import { mockUser, mockUsers, mockTransactions } from './mock-data';

// Backend API configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

// 默认图片（按类别）
function getDefaultImage(category: string): string {
  const images: Record<string, string> = {
    Technology:
      "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800",
    Business:
      "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800",
    Design:
      "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800",
    Creative: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=800",
    Language:
      "https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=800",
    'Health & Wellness':
      "https://static1.bigstockphoto.com/0/7/2/large1500/270519103.jpg?w=800",
      
  };
  return (
    images[category] ||
    "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800"
  );
}

// 后端返回的数据直接映射，转换字段名，添加 image 字段
function enrichWorkshop(workshop: any): Workshop {
  // 处理后端返回的蛇形命名字段，转换为驼峰命名
  const facilitator = workshop.facilitator 
    ? {
        id: workshop.facilitator.id,
        name: workshop.facilitator.username || workshop.facilitator.name,
        avatarUrl: workshop.facilitator.avatarUrl || workshop.facilitator.avatar_url || workshop.facilitator.avatar,
        bio: workshop.facilitator.bio,
      }
    : null;

  const participants = Array.isArray(workshop.participants)
    ? workshop.participants.map((p: any) => ({
        id: String(p.id),
        username: p.username || p.name || 'Unknown',
        avatarUrl: p.avatarUrl || p.avatar_url || p.avatar,
      }))
    : undefined;

  const normalizedStatus = String(workshop.status || '').toLowerCase();

  return {
    id: String(workshop.id),
    title: workshop.title,
    description: workshop.description,
    category: workshop.category,
    skillLevel: workshop.skillLevel,
    status: normalizedStatus as Workshop['status'],
    date: workshop.date,
    time: workshop.time,
    duration: workshop.duration,
    isOnline: workshop.isOnline,
    location: workshop.location || workshop.locations || [],
    maxParticipants: workshop.maxParticipants,
    currentParticipants: workshop.currentParticipants ?? (participants?.length ?? 0),
    creditCost: workshop.creditCost,
    creditReward: workshop.creditReward,
    facilitator,
    tags: workshop.tags,
    image: workshop.image || getDefaultImage(workshop.category),
    createdAt: workshop.createdAt,
    participants: participants as any,
    materials: workshop.materials,
    requirements: workshop.requirements,
  };
}

function toBackendWorkshopId(workshopId: string): string {
  // 兼容 mock id: workshop-1 -> 1
  const match = /^workshop-(\d+)$/.exec(workshopId);
  if (match) return match[1];
  return workshopId;
}

const workshopDetailInFlight = new Map<string, Promise<Workshop | null>>();

// Helper function to make API calls with authentication
async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {},
  token?: string | null
): Promise<T> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  // 如果没有显式传入 token，尝试从 localStorage 读取
  const tokenToUse = token ?? localStorage.getItem('dev_token');
  
  if (tokenToUse) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${tokenToUse}`;
  }

  const method = (options.method || "GET").toUpperCase();
  const requestOptions: RequestInit = {
    ...options,
    headers,
    cache: options.cache ?? (method === "GET" ? "no-store" : undefined),
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, requestOptions);

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || `API Error: ${response.status}`);
  }

  return response.json();
}

// ----------------------
// AUTH API
// ----------------------
export const authAPI = {
  // Real Google OAuth (works as sign-in & sign-up automatically)
  signInWithGoogle: async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/home` },
    });
    if (error) throw error;
    return data;
  },

  // Magic link authentication
  signInWithMagicLink: async (email: string) => {
    const { data, error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/home`,
      },
    });
    if (error) throw error;
    return data;
  },

  // 开发环境：调用后端 /dev/auth/dev-login，自动创建/获取用户并获取 JWT
  devRegisterLogin: async (email: string, username?: string): Promise<{ access_token: string; user: any; expiresIn: number }> => {
    try {
      const response = await fetch(`${API_BASE_URL}/dev/auth/dev-login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          username: username || email.split('@')[0],
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to dev login: ${response.status}`);
      }

      const data = await response.json();

      // 保存 token 到 localStorage
      localStorage.setItem('dev_token', data.access_token);
      localStorage.setItem('dev_token_user_id', data.user.id);
      localStorage.setItem('dev_token_username', data.user.username);

      return data;
    } catch (error) {
      console.error('❌ Dev register-login failed:', error);
      throw error;
    }
  },

  // 开发环境：从后端 /dev/token 获取 JWT token
  devLogin: async (userId?: string, username?: string): Promise<{ token: string; userId: string; username: string; expiresIn: number }> => {
    try {
      const params = new URLSearchParams();
      if (userId) params.append('userId', userId);
      if (username) params.append('username', username);
      
      const queryString = params.toString();
      const url = queryString ? `/dev/token?${queryString}` : '/dev/token';
      
      const response = await fetch(`${API_BASE_URL}${url}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get dev token: ${response.status}`);
      }

      const data = await response.json();
      
      // 保存 token 到 localStorage
      localStorage.setItem('dev_token', data.token);
      localStorage.setItem('dev_token_user_id', data.userId);
      localStorage.setItem('dev_token_username', data.username);
      
      return data;
    } catch (error) {
      console.error('❌ Dev login failed:', error);
      throw error;
    }
  },

  // Mock sign-in (just return the first mock user)
  signInMock: async () => {
    return mockUsers[0]; // ✅ always use the first mock user
  },

  // Mock sign-up (local only, creates a fake user object)
  signUpMock: async (email: string, name: string): Promise<User> => {
    const newUser: User = {
      id: 'mock-user-' + Date.now(),
      email,
      username: name,
      avatarUrl: 'https://placehold.co/150x150',
      creditBalance: 50,
      bio: '',
      skills: [],
      totalWorkshopsHosted: 0,
      totalWorkshopsAttended: 0,
      rating: 0,
      createdAt: new Date().toISOString(),
    };
    mockUsers.push(newUser); // add to in-memory list
    return newUser;
  },

  // Sign out (real 和 dev 都支持)
  signOut: async () => {
    // 清除 dev token
    localStorage.removeItem('dev_token');
    localStorage.removeItem('dev_token_user_id');
    localStorage.removeItem('dev_token_username');
    
    // 清除 Supabase 会话
    await supabase.auth.signOut();
  },

  // Get current Supabase session + JWT
  getSession: async () => {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;

    const session = data.session;
    return {
      session, // full session object
      accessToken: session?.access_token ?? null, // 🔑 JWT token
      user: session?.user ?? null, // basic user info
    };
  },

  // Always return a user (Supabase user if logged in, otherwise first mock user)
  getUser: async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session?.user) {
      return data.session.user;
    }
    return mockUsers[0]; // fallback mock user
  },
};

// ----------------------
// USER API
// ----------------------
export const userAPI = {
  // 获取当前用户 profile（需要认证）
  getProfile: async (): Promise<User> => {
    // TODO: 当后端 /api/v1/users/me 实现后，改为真实调用
    return mockUser;
  },

  // 根据 ID 获取用户
  getById: async (id: string): Promise<User | null> => {
    try {
      const data = await apiCall<User>(`/api/v1/users/${id}`);
      return data;
    } catch (error) {
      console.warn("⚠️ Backend unavailable, using mock data");
      return mockUsers.find((u) => u.id === id) || null;
    }
  },

  // Update profile locally
  updateProfile: async (updates: Partial<User>): Promise<User> => {
    Object.assign(mockUser, updates);
    return { ...mockUser };
  },
};

// ----------------------
// WORKSHOP API
// ----------------------
export const workshopAPI = {
  // 获取所有工作坊
  getAll: async (): Promise<Workshop[]> => {
    try {
      const data = await apiCall<any[]>("/api/v1/workshops");
      return data.map(enrichWorkshop);
    } catch (error) {
      console.error('Failed to fetch workshops:', error);
      return [];
    }
  },

  // 获取公开可展示工作坊（通过审核）
  getPublic: async (): Promise<Workshop[]> => {
    try {
      const data = await apiCall<any[]>("/api/v1/workshops/public");
      return data.map(enrichWorkshop);
    } catch (error) {
      console.error("❌ Failed to fetch public workshops:", error);
      return [];
    }
  },

  // 获取当前用户创建的工作坊（需要登录）
  getMine: async (token?: string | null): Promise<Workshop[]> => {
    try {
      const data = await apiCall<any[]>("/api/v1/workshops/mine", {}, token);
      return data.map(enrichWorkshop);
    } catch (error) {
      console.error("❌ Failed to fetch my workshops:", error);
      return [];
    }
  },

  // 获取单个工作坊
  getById: async (id: string, token?: string | null): Promise<Workshop | null> => {
    const cacheKey = `${token ?? "anon"}:${toBackendWorkshopId(id)}`;
    const existingTask = workshopDetailInFlight.get(cacheKey);
    if (existingTask) {
      return existingTask;
    }

    const task = (async () => {
    try {
      const data = await apiCall<Workshop>(
        `/api/v1/workshops/${toBackendWorkshopId(id)}`,
        {},
        token
      );
      return enrichWorkshop(data);
    } catch (error) {
      console.warn("⚠️ Backend unavailable for workshop", id);
      return null;
    }
    })();

    workshopDetailInFlight.set(cacheKey, task);
    try {
      return await task;
    } finally {
      workshopDetailInFlight.delete(cacheKey);
    }
  },

  requestApproval: async (workshopId: string, token?: string | null): Promise<void> => {
    const backendId = toBackendWorkshopId(workshopId);
    await apiCall<void>(
      `/api/v1/workshops/${backendId}/request-approval`,
      { method: "POST" },
      token
    );
  },

  // 创建工作坊（后端仅返回 success message）
  create: async (workshopData: Partial<Workshop>, token: string): Promise<void> => {
    try {
      await apiCall<{ message: string }>(
        "/api/v1/workshops",
        {
          method: "POST",
          body: JSON.stringify(workshopData),
        },
        token
      );
    } catch (error) {
      console.error('Failed to create workshop:', error);
      throw error;
    }
  },

  // 加入工作坊
  join: async (workshopId: string, token?: string | null): Promise<void> => {
    try {
      const backendId = toBackendWorkshopId(workshopId);
      await apiCall<void>(
        `/api/v1/workshops/${backendId}/join`,
        { method: "POST" },
        token
      );
    } catch (error) {
      console.error('Failed to join workshop:', error);
      throw error;
    }
  },

  // 离开工作坊
  leave: async (workshopId: string, token?: string | null): Promise<void> => {
    try {
      const backendId = toBackendWorkshopId(workshopId);
      await apiCall<void>(
        `/api/v1/workshops/${backendId}/leave`,
        { method: "POST" },
        token
      );
    } catch (error) {
      console.error('Failed to leave workshop:', error);
      throw error;
    }
  },

  // 删除工作坊
  delete: async (workshopId: string, token?: string | null): Promise<void> => {
    try {
      const backendId = toBackendWorkshopId(workshopId);
      await apiCall<void>(
        `/api/v1/workshops/${backendId}`,
        { method: "DELETE" },
        token
      );
    } catch (error) {
      console.error('Failed to delete workshop:', error);
      throw error;
    }
  },

  // 管理员：获取待审核工作坊
  getPendingForAdmin: async (token?: string | null): Promise<Workshop[]> => {
    const data = await apiCall<any[]>("/api/v1/admin/workshops/pending", {}, token);
    return data.map(enrichWorkshop);
  },

  // 管理员：获取全部工作坊
  getAllForAdmin: async (token?: string | null): Promise<Workshop[]> => {
    const data = await apiCall<any[]>("/api/v1/admin/workshops", {}, token);
    return data.map(enrichWorkshop);
  },

  // 管理员：编辑待审核工作坊
  updatePendingByAdmin: async (workshopId: string, workshopData: Partial<Workshop>, token?: string | null): Promise<Workshop> => {
    const backendId = toBackendWorkshopId(workshopId);
    const data = await apiCall<any>(
      `/api/v1/admin/workshops/${backendId}`,
      {
        method: "PUT",
        body: JSON.stringify(workshopData),
      },
      token
    );
    return enrichWorkshop(data);
  },

  // 管理员：通过待审核工作坊
  approveByAdmin: async (workshopId: string, token?: string | null): Promise<void> => {
    const backendId = toBackendWorkshopId(workshopId);
    await apiCall<{ message: string }>(
      `/api/v1/admin/workshops/${backendId}/approve`,
      { method: "POST" },
      token
    );
  },

  // 管理员：拒绝待审核工作坊
  rejectByAdmin: async (workshopId: string, comment?: string, token?: string | null): Promise<void> => {
    const backendId = toBackendWorkshopId(workshopId);
    await apiCall<{ message: string }>(
      `/api/v1/admin/workshops/${backendId}/reject`,
      {
        method: "POST",
        body: JSON.stringify({ comment: comment || null }),
      },
      token
    );
  },

  // 管理员：取消工作坊
  cancelByAdmin: async (workshopId: string, token?: string | null): Promise<void> => {
    const backendId = toBackendWorkshopId(workshopId);
    await apiCall<{ message: string }>(
      `/api/v1/admin/workshops/${backendId}/cancel`,
      { method: "POST" },
      token
    );
  },
};

// ----------------------
// TRANSACTION API
// ----------------------
export const transactionAPI = {
  getAll: async () => mockTransactions,

  add: async (tx: any) => {
    const newTx = {
      id: 'tx-' + Date.now(),
      timestamp: new Date().toISOString(),
      ...tx,
    };
    mockTransactions.push(newTx);
    return newTx;
  },
};

// ----------------------
// NOTIFICATION API
// ----------------------
export const notificationAPI = {
  getAll: async (token?: string | null): Promise<NotificationItem[]> => {
    const data = await apiCall<NotificationItem[]>("/api/v1/notifications", {}, token);
    return data.map((item: any) => ({
      id: String(item.id),
      userId: item.userId || item.recipientId,
      type: item.type,
      title: item.title,
      message: item.message,
      timestamp: item.timestamp || item.createdAt,
      read: item.read ?? item.isRead ?? false,
      workshopId: item.workshopId ?? null,
    }));
  },

  getUnreadCount: async (token?: string | null): Promise<number> => {
    const data = await apiCall<{ count: number }>("/api/v1/notifications/unread-count", {}, token);
    return data.count;
  },

  markRead: async (notificationId: string, token?: string | null): Promise<NotificationItem> => {
    const data = await apiCall<NotificationItem>(
      `/api/v1/notifications/${notificationId}/read`,
      { method: "POST" },
      token
    );
    return {
      id: String((data as any).id),
      userId: (data as any).userId || (data as any).recipientId,
      type: (data as any).type,
      title: (data as any).title,
      message: (data as any).message,
      timestamp: (data as any).timestamp || (data as any).createdAt,
      read: (data as any).read ?? (data as any).isRead ?? false,
      workshopId: (data as any).workshopId ?? null,
    };
  },

  markAllRead: async (token?: string | null): Promise<void> => {
    await apiCall<void>("/api/v1/notifications/read-all", { method: "POST" }, token);
  },
};