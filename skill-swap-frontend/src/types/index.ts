export interface User {
  id: string;
  username: string;
  email: string;
  creditBalance: number;
  avatarUrl?: string;
  bio?: string;
  skills: string[];
  totalWorkshopsHosted: number;
  totalWorkshopsAttended: number;
  rating: number;
  reviewCount?: number;
  createdAt: string;
}

// 简化的 facilitator 信息（来自 FacilitatorDto）
export interface Facilitator {
  id: string;
  name: string;
  avatarUrl?: string;
  bio?: string;
}

export interface Workshop {
  id: string;
  hostName?: string;
  title: string;
  description: string;
  category: string;
  skillLevel?: 'Beginner' | 'Intermediate' | 'Advanced';
  status: 'pending' | 'approved' | 'rejected' | 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  date: string;
  time: string;
  attendCloseAt?: string;
  duration?: number; // in minutes
  isOnline: boolean;
  location: string | string[];
  maxParticipants?: number;
  currentParticipants?: number;
  creditCost: number;      // 参与者付出的积分
  creditReward: number;    // 讲师获得的积分
  contactNumber?: string;
  materialsProvided?: string;
  materialsNeededFromClub?: string;
  venueRequirements?: string;
  otherImportantInfo?: string;
  detailsConfirmed?: boolean;
  submitterUsername?: string;
  submitterEmail?: string;
  weekNumber?: number;
  memberResponsible?: string;
  membersPresent?: string;
  eventSubmitted?: boolean;
  usuApprovalStatus?: 'pending' | 'approved';
  rejectionNote?: string;
  facilitator: Facilitator | null;
  tags?: string[];
  image?: string;
  createdAt?: string;
  // 以下是可选的扩展字段
  participants?: User[];
  materials?: string[];
  requirements?: string[];
}

export interface MemoryEntry {
  id: string;
  title: string;
  slug: string;
  coverUrl?: string;
  content?: string;
  mediaUrls: string[];
  status: 'draft' | 'published' | 'archived';
  publishedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
  editLockOwnerId?: string;
  editLockOwnerName?: string;
  editLockExpiresAt?: string;
}

export interface CreditTransaction {
  id: string;
  userId: string;
  workshopId: string;
  type: 'earned' | 'spent';
  amount: number;
  description: string;
  timestamp: string;
}

export interface Review {
  id: string;
  workshopId: string;
  reviewerId: string;
  reviewer: User;
  rating: number;
  comment: string;
  timestamp: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  timestamp?: string;
  read: boolean;
  actionUrl?: string;
  workshopId?: string | null;
}