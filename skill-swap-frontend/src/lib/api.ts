// lib/api.ts

import { Workshop, User } from '@/types';
import { supabase } from '../utils/supabase/supabase';
import { mockUser, mockUsers, mockWorkshops, mockTransactions } from './mock-data';

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
    Art: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=800",
    Music:
      "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=800",
    Language:
      "https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=800",
  };
  return (
    images[category] ||
    "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800"
  );
}

// 后端返回的数据直接映射，只添加 image 字段
function enrichWorkshop(workshop: any): Workshop {
  return {
    ...workshop,
    image: workshop.image || getDefaultImage(workshop.category),
  };
}

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

  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

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

  // Sign out (real Supabase)
  signOut: async () => {
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
      const data = await apiCall<Workshop[]>("/api/v1/workshops");
      console.log("✅ Fetched workshops from backend:", data.length);
      return data.map(enrichWorkshop);
    } catch (error) {
      console.warn("⚠️ Backend unavailable, using mock data:", error);
      return mockWorkshops;
    }
  },

  // 获取单个工作坊
  getById: async (id: string): Promise<Workshop | null> => {
    try {
      const data = await apiCall<Workshop>(`/api/v1/workshops/${id}`);
      return enrichWorkshop(data);
    } catch (error) {
      console.warn("⚠️ Backend unavailable, using mock data");
      return mockWorkshops.find((w) => w.id === id) || null;
    }
  },

  // 创建工作坊
  create: async (workshopData: Partial<Workshop>, token: string): Promise<Workshop> => {
    try {
      const created = await apiCall<Workshop>(
        "/api/v1/workshops",
        {
          method: "POST",
          body: JSON.stringify(workshopData),
        },
        token
      );
      console.log("✅ Workshop created:", created);
      return enrichWorkshop(created);
    } catch (error) {
      console.error("❌ Failed to create workshop:", error);
      throw error;
    }
  },

  // 加入工作坊
  join: async (workshopId: string, token: string): Promise<void> => {
    try {
      await apiCall<void>(
        `/api/v1/workshops/${workshopId}/join`,
        { method: "POST" },
        token
      );
      console.log("✅ Joined workshop:", workshopId);
    } catch (error) {
      console.error("❌ Failed to join workshop:", error);
      throw error;
    }
  },

  // 离开工作坊
  leave: async (workshopId: string, token: string): Promise<void> => {
    try {
      await apiCall<void>(
        `/api/v1/workshops/${workshopId}/leave`,
        { method: "POST" },
        token
      );
      console.log("✅ Left workshop:", workshopId);
    } catch (error) {
      console.error("❌ Failed to leave workshop:", error);
      throw error;
    }
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