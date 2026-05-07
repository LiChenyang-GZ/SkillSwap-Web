// lib/api.ts

import type { Workshop } from '@/types/workshop';
import type { User } from '@/types/user';

export interface WorkshopUpsertPayload {
  hostName: string;
  title: string;
  description?: string;
  category: string;
  duration: number;
  maxParticipants?: number | null;
  date: string;
  time: string;
  attendCloseAt?: string | null;
  isOnline: boolean;
  location?: string;
  contactNumber: string;
  materialsProvided?: string;
  materialsNeededFromClub?: string;
  venueRequirements?: string;
  otherImportantInfo?: string;
  weekNumber?: number | null;
  memberResponsible?: string;
  membersPresent?: string;
  eventSubmitted?: boolean;
  usuApprovalStatus?: 'pending' | 'approved';
  detailsConfirmed: boolean;
}

// Backend API configuration
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

export function resolveAssetUrl(url?: string): string {
  if (!url) return '';

  const trimmed = String(url).trim();
  if (!trimmed) return '';

  if (/^(https?:)?\/\//i.test(trimmed) || trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
    return trimmed;
  }

  if (trimmed.startsWith('/')) {
    return `${API_BASE_URL}${trimmed}`;
  }

  return `${API_BASE_URL}/${trimmed}`;
}

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
export function enrichWorkshop(workshop: any): Workshop {
  // 处理后端返回的蛇形命名字段，转换为驼峰命名
  const facilitator = workshop.facilitator 
    ? {
        id: workshop.facilitator.id,
        name: workshop.facilitator.username || workshop.facilitator.name,
        avatarUrl: resolveAssetUrl(
          workshop.facilitator.avatarUrl ||
            workshop.facilitator.avatar_url ||
            workshop.facilitator.avatar
        ),
        bio: workshop.facilitator.bio,
      }
    : null;

  const participants = Array.isArray(workshop.participants)
    ? workshop.participants.map((p: any) => ({
        id: String(p.id),
        username: p.username || p.name || 'Unknown',
        email: p.email || p.userEmail || p.user_email || p.mail || '',
        avatarUrl: resolveAssetUrl(p.avatarUrl || p.avatar_url || p.avatar),
      }))
    : undefined;

  const normalizedStatus = String(workshop.status || '').toLowerCase();
  const resolvedImage = resolveAssetUrl(workshop.image || workshop.imageUrl || workshop.image_url);
  const usuApprovalStatusRaw = String(workshop.usuApprovalStatus || workshop.usu_approval_status || 'pending').toLowerCase();

  return {
    id: String(workshop.id),
    hostName: workshop.hostName,
    title: workshop.title,
    description: workshop.description || '',
    category: workshop.category,
    skillLevel: workshop.skillLevel,
    status: normalizedStatus as Workshop['status'],
    date: workshop.date,
    time: workshop.time,
    attendCloseAt: workshop.attendCloseAt || workshop.attend_close_at,
    duration: workshop.duration,
    isOnline: workshop.isOnline,
    location: workshop.location || workshop.locations || '',
    maxParticipants: workshop.maxParticipants,
    currentParticipants: workshop.currentParticipants ?? (participants?.length ?? 0),
    creditCost: workshop.creditCost,
    creditReward: workshop.creditReward,
    contactNumber: workshop.contactNumber,
    materialsProvided: workshop.materialsProvided,
    materialsNeededFromClub: workshop.materialsNeededFromClub,
    venueRequirements: workshop.venueRequirements,
    otherImportantInfo: workshop.otherImportantInfo,
    detailsConfirmed: workshop.detailsConfirmed,
    submitterUsername: workshop.submitterUsername,
    submitterEmail: workshop.submitterEmail,
    weekNumber: workshop.weekNumber ?? workshop.week_number,
    memberResponsible: workshop.memberResponsible ?? workshop.member_responsible,
    membersPresent: workshop.membersPresent ?? workshop.members_present,
    eventSubmitted: Boolean(workshop.eventSubmitted ?? workshop.event_submitted),
    usuApprovalStatus: usuApprovalStatusRaw === 'approved' ? 'approved' : 'pending',
    hiddenByHost: Boolean(workshop.hiddenByHost ?? workshop.hidden_by_host),
    rejectionNote:
      workshop.rejectionNote ||
      workshop.rejection_note ||
      workshop.rejectComment ||
      workshop.reject_comment ||
      workshop.adminComment ||
      workshop.admin_comment ||
      '',
    facilitator,
    tags: workshop.tags,
    image: resolvedImage || getDefaultImage(workshop.category),
    createdAt: workshop.createdAt,
    participants,
    materials: workshop.materials,
    requirements: workshop.requirements,
  };
}

export function toBackendWorkshopId(workshopId: string): string {
  // 兼容 mock id: workshop-1 -> 1
  const match = /^workshop-(\d+)$/.exec(workshopId);
  if (match) return match[1];
  return workshopId;
}

// Helper function to make API calls with authentication
export async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {},
  token?: string | null
): Promise<T> {
  const isFormDataBody = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const headers: HeadersInit = {
    ...(isFormDataBody ? {} : { "Content-Type": "application/json" }),
    ...options.headers,
  };

  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
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
    const apiError = new Error(error || `API Error: ${response.status}`) as Error & { status?: number };
    apiError.status = response.status;
    throw apiError;
  }

  const raw = await response.text();
  if (!raw) {
    return undefined as T;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return raw as T;
  }
}

// ----------------------
// USER API
// ----------------------
export const userAPI = {
  getProfile: async (token?: string | null): Promise<User> => {
    return apiCall<User>('/api/v1/users/me', {}, token);
  },

  // 根据 ID 获取用户
  getById: async (id: string): Promise<User | null> => {
    const data = await apiCall<User>(`/api/v1/users/${id}`);
    return data;
  },

  updateProfile: async (updates: Partial<User>, token?: string | null): Promise<User> => {
    return apiCall<User>('/api/v1/users/me', {
      method: 'PATCH',
      body: JSON.stringify(updates),
    }, token);
  },
};

// ----------------------
// TRANSACTION API
// ----------------------
export const transactionAPI = {
  getAll: async () => {
    throw new Error('transactionAPI.getAll requires a backend endpoint and is not implemented.');
  },

  add: async (_tx: any) => {
    throw new Error('transactionAPI.add requires a backend endpoint and is not implemented.');
  },
};
