export type UniversityCode = 'USYD' | 'UNSW' | 'UTS' | 'OTHER';

export interface User {
  id: string;
  username: string;
  email: string;
  creditBalance: number;
  avatarUrl?: string;
  bio?: string;
  universityCode?: UniversityCode;
  universityName?: string;
  skills: string[];
  totalWorkshopsHosted: number;
  totalWorkshopsAttended: number;
  rating: number;
  reviewCount?: number;
  createdAt: string;
}

export interface Facilitator {
  id: string;
  name: string;
  avatarUrl?: string;
  bio?: string;
}
