import type { UniversityCode, User } from "../../../types/user";

export interface DashboardProfileUpdates {
  username?: string;
  avatarUrl?: string;
  bio?: string;
  universityCode?: UniversityCode;
  universityName?: string;
  skills?: string[];
}

export interface DashboardProfileApi {
  updateCurrentUserProfile: (updates: DashboardProfileUpdates) => Promise<User>;
  uploadCurrentUserAvatar: (file: File) => Promise<User>;
}
