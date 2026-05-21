import type { WorkshopUpsertPayload } from "../../lib/api";
import type { CreditTransaction } from "../../types/creditTransaction";
import type { User } from "../../types/user";
import type { Workshop } from "../../types/workshop";

export type AuthTab = "signin" | "signup";

export type GetAuthToken = () => Promise<string | null>;

export type RefreshDataMode = "public" | "mine" | "full" | "dashboard";

export interface CurrentUserProfileUpdates {
  username?: string;
  avatarUrl?: string;
  bio?: string;
  skills?: string[];
}

export interface RecentProfileCache {
  subject: string | null;
  user: User;
  at: number;
}

export interface AppContextType {
  user: User | null;
  workshops: Workshop[];
  transactions: CreditTransaction[];
  currentPage: string;
  authTab: AuthTab;
  isDarkMode: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  notificationsUnreadCount: number;
  refreshNotificationsUnreadCount: () => Promise<void>;
  isLoading: boolean;
  getAuthToken: GetAuthToken;
  setCurrentPage: (page: string, authTab?: AuthTab) => void;
  toggleDarkMode: () => void;
  attendWorkshop: (workshopId: string) => Promise<void>;
  cancelWorkshopAttendance: (workshopId: string) => Promise<void>;
  createWorkshop: (workshopData: WorkshopUpsertPayload) => Promise<boolean>;
  deleteWorkshop: (workshopId: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateCurrentUserProfile: (updates: CurrentUserProfileUpdates) => Promise<User>;
  uploadCurrentUserAvatar: (file: File) => Promise<User>;
  refreshData: (mode?: RefreshDataMode) => Promise<void>;
  clearCache: () => void;
  upsertWorkshop: (workshop: Workshop) => void;
}
