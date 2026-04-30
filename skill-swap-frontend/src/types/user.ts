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

export interface Facilitator {
  id: string;
  name: string;
  avatarUrl?: string;
  bio?: string;
}

