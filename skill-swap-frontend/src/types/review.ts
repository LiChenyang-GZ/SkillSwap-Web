import { User } from './user';

export interface Review {
  id: string;
  workshopId: string;
  reviewerId: string;
  reviewer: User;
  rating: number;
  comment: string;
  timestamp: string;
}

