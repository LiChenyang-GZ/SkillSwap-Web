import { CreditTransaction, User } from '../types';

const fallbackUser: User = {
  id: 'user-1',
  username: 'Sarah Chen',
  email: 'sarah.chen@example.com',
  creditBalance: 100,
  avatarUrl:
    'https://images.unsplash.com/photo-1494790108755-2616b9349867?w=150&h=150&fit=crop&crop=face',
  bio: 'Product designer passionate about design systems and user research',
  skills: ['UI/UX Design', 'Figma', 'User Research', 'Design Systems'],
  totalWorkshopsHosted: 0,
  totalWorkshopsAttended: 0,
  rating: 0,
  reviewCount: 0,
  createdAt: '2024-01-15',
};

const fallbackUsers: User[] = [
  fallbackUser,
  {
    id: 'user-2',
    username: 'Marcus Johnson',
    email: 'marcus.j@example.com',
    creditBalance: 120,
    avatarUrl:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
    bio: 'Full-stack developer with expertise in React and Node.js',
    skills: ['React', 'Node.js', 'TypeScript', 'GraphQL'],
    totalWorkshopsHosted: 18,
    totalWorkshopsAttended: 15,
    rating: 4.9,
    reviewCount: 22,
    createdAt: '2023-08-22',
  },
  {
    id: 'user-3',
    username: 'Elena Rodriguez',
    email: 'elena.r@example.com',
    creditBalance: 95,
    avatarUrl:
      'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
    bio: 'Data scientist specializing in machine learning and analytics',
    skills: ['Python', 'Machine Learning', 'Data Analysis', 'SQL'],
    totalWorkshopsHosted: 8,
    totalWorkshopsAttended: 22,
    rating: 4.7,
    reviewCount: 10,
    createdAt: '2023-11-10',
  },
  {
    id: 'user-4',
    username: 'David Kim',
    email: 'david.kim@example.com',
    creditBalance: 65,
    avatarUrl:
      'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
    bio: 'Marketing strategist with focus on digital campaigns',
    skills: ['Digital Marketing', 'SEO', 'Content Strategy', 'Analytics'],
    totalWorkshopsHosted: 6,
    totalWorkshopsAttended: 19,
    rating: 4.6,
    reviewCount: 8,
    createdAt: '2024-02-28',
  },
];

const fallbackTransactions: CreditTransaction[] = [
  {
    id: 'tx-1',
    userId: 'user-1',
    workshopId: 'workshop-1',
    type: 'spent',
    amount: 25,
    description: 'Attended: Advanced React Patterns & Performance',
    timestamp: '2024-12-15T14:00:00Z',
  },
  {
    id: 'tx-2',
    userId: 'user-1',
    workshopId: 'workshop-2',
    type: 'earned',
    amount: 35,
    description: 'Facilitated: Design Systems Workshop',
    timestamp: '2024-12-10T10:00:00Z',
  },
  {
    id: 'tx-3',
    userId: 'user-1',
    workshopId: 'workshop-3',
    type: 'spent',
    amount: 15,
    description: 'Attended: Machine Learning for Beginners',
    timestamp: '2024-12-05T13:00:00Z',
  },
];

export function getPrimaryFallbackUser(): User {
  return fallbackUsers[0];
}

export function addFallbackUser(user: User): void {
  fallbackUsers.push(user);
}

export function getFallbackUserById(id: string): User | null {
  return fallbackUsers.find((user) => user.id === id) || null;
}

export function getFallbackProfile(): User {
  return fallbackUser;
}

export function updateFallbackProfile(updates: Partial<User>): User {
  Object.assign(fallbackUser, updates);
  return { ...fallbackUser };
}

export function getFallbackTransactions(): CreditTransaction[] {
  return fallbackTransactions;
}

export function addFallbackTransaction(transaction: CreditTransaction): void {
  fallbackTransactions.push(transaction);
}
