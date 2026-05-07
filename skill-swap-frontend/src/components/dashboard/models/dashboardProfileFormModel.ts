import type { User } from "../../../types/user";

export interface DashboardProfileUpdates {
  username?: string;
  avatarUrl?: string;
  bio?: string;
  skills?: string[];
}

export interface DashboardProfileApi {
  updateCurrentUserProfile: (updates: DashboardProfileUpdates) => Promise<User>;
  uploadCurrentUserAvatar: (file: File) => Promise<User>;
}

