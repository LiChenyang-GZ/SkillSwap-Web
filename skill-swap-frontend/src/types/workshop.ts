import { Facilitator, User } from './user';

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
  duration?: number;
  isOnline: boolean;
  location: string | string[];
  maxParticipants?: number;
  currentParticipants?: number;
  creditCost: number;
  creditReward: number;
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
  hiddenByHost?: boolean;
  rejectionNote?: string;
  facilitator: Facilitator | null;
  tags?: string[];
  image?: string;
  createdAt?: string;
  participants?: User[];
  materials?: string[];
  requirements?: string[];
}

