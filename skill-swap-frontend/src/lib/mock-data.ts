// Featured workshops for Hero page and other components
export const mockFeaturedWorkshops = [
  {
    id: 1,
    title: "Advanced React Patterns",
    instructor: "Sarah Chen",
    date: "Oct 2, 2024",
    time: "2:00 PM - 4:00 PM",
    participants: 24,
    maxParticipants: 30,
    credits: 3,
    image: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80",
    skills: ["React", "JavaScript", "Frontend"]
  },
  {
    id: 2,
    title: "Digital Marketing Fundamentals",
    instructor: "Marcus Rodriguez",
    date: "Oct 5, 2024",
    time: "10:00 AM - 12:00 PM",
    participants: 18,
    maxParticipants: 25,
    credits: 2,
    image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80",
    skills: ["Marketing", "Analytics", "Strategy"]
  },
  {
    id: 3,
    title: "Introduction to UX Design",
    instructor: "Lisa Park",
    date: "Oct 8, 2024",
    time: "6:00 PM - 8:00 PM",
    participants: 15,
    maxParticipants: 20,
    credits: 2,
    image: "https://images.unsplash.com/photo-1561070791-2526d30994b5?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80",
    skills: ["UX Design", "Research", "Prototyping"]
  }
];
// src/mocks/mockData.ts

import { User, Workshop, CreditTransaction, Review } from '../types';

export const mockUser: User = {
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

export const mockUsers: User[] = [
  mockUser,
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

export const mockWorkshops: Workshop[] = [];
// 原始数据已注释掉用于测试
/*
[
  {
    id: 'workshop-1',
    title: 'Advanced React Patterns & Performance',
    description:
      'Deep dive into advanced React patterns including render props, compound components, and performance optimization techniques.',
    category: 'Development',
    skillLevel: 'Advanced',
    status: 'upcoming',
    date: '2024-12-28',
    time: '14:00',
    duration: 120,
    isOnline: true,
    location: 'Virtual',
    maxParticipants: 15,
    currentParticipants: 8,
    creditCost: 25,
    creditReward: 40,
    facilitator: { id: 'user-2', name: mockUsers[1].username, avatarUrl: mockUsers[1].avatarUrl },
    tags: ['React', 'JavaScript', 'Performance', 'Frontend'],
    image:
      'https://images.unsplash.com/photo-1569693799105-4eb645d89aea?fit=crop&w=1080&q=80',
    participants: [mockUser],
    materials: ['Code repository', 'Slides', 'Practice exercises'],
    requirements: ['Strong JavaScript knowledge', 'React experience'],
  },
  {
    id: 'workshop-2',
    title: 'Design Systems Workshop',
    description:
      'Learn how to build scalable design systems from scratch, including component libraries and design tokens.',
    category: 'Design',
    skillLevel: 'Intermediate',
    status: 'upcoming',
    date: '2024-12-30',
    time: '10:00',
    duration: 90,
    isOnline: false,
    location: 'Creative Hub, Downtown',
    maxParticipants: 12,
    currentParticipants: 6,
    creditCost: 20,
    creditReward: 35,
    facilitator: { id: 'user-1', name: mockUser.username, avatarUrl: mockUser.avatarUrl },
    tags: ['Design Systems', 'Figma', 'UI/UX', 'Components'],
    image:
      'https://images.unsplash.com/photo-1611773060335-a3983045bf4e?fit=crop&w=1080&q=80',
    participants: [mockUsers[1], mockUsers[3]],
    materials: ['Figma templates', 'Component library', 'Guidelines document'],
    requirements: ['Basic Figma knowledge', 'Design fundamentals'],
  },
  {
    id: 'workshop-3',
    title: 'Machine Learning for Beginners',
    description:
      'Introduction to machine learning concepts with hands-on Python examples.',
    category: 'Data Science',
    skillLevel: 'Beginner',
    status: 'upcoming',
    date: '2025-01-05',
    time: '13:00',
    duration: 150,
    isOnline: true,
    location: 'Virtual',
    maxParticipants: 20,
    currentParticipants: 12,
    creditCost: 15,
    creditReward: 30,
    facilitator: { id: 'user-3', name: mockUsers[2].username, avatarUrl: mockUsers[2].avatarUrl },
    tags: ['Machine Learning', 'Python', 'Data Science', 'AI'],
    image:
      'https://images.unsplash.com/photo-1532622785990-d2c36a76f5a6?fit=crop&w=1080&q=80',
    participants: [mockUser, mockUsers[3]],
    materials: ['Jupyter notebooks', 'Dataset files', 'Reference materials'],
    requirements: ['Basic Python knowledge'],
  },
  {
    id: 'workshop-4',
    title: 'Digital Marketing Strategy 2025',
    description:
      'Latest trends and strategies in digital marketing including AI tools and automation.',
    category: 'Marketing',
    skillLevel: 'Intermediate',
    status: 'upcoming',
    date: '2025-01-08',
    time: '16:00',
    duration: 100,
    isOnline: false,
    location: 'Business Center, Room 205',
    maxParticipants: 18,
    currentParticipants: 15,
    creditCost: 22,
    creditReward: 32,
    facilitator: { id: 'user-4', name: mockUsers[3].username, avatarUrl: mockUsers[3].avatarUrl },
    tags: ['Digital Marketing', 'Strategy', 'AI Tools', 'Analytics'],
    image:
      'https://images.unsplash.com/photo-1707301280380-56f7e7a00aef?fit=crop&w=1080&q=80',
    participants: [mockUser, mockUsers[1], mockUsers[2]],
    materials: ['Strategy templates', 'Tool recommendations', 'Case studies'],
    requirements: ['Marketing basics'],
  },
]
*/

export const mockTransactions: CreditTransaction[] = [
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

export const mockReviews: Review[] = [
  {
    id: 'review-1',
    workshopId: 'workshop-2',
    reviewerId: 'user-2',
    reviewer: mockUsers[1],
    rating: 5,
    comment:
      "Excellent workshop! Sarah's explanation of design tokens was incredibly clear.",
    timestamp: '2024-12-11T15:30:00Z',
  },
  {
    id: 'review-2',
    workshopId: 'workshop-2',
    reviewerId: 'user-4',
    reviewer: mockUsers[3],
    rating: 4,
    comment:
      'Great hands-on experience building components. Would love a follow-up session.',
    timestamp: '2024-12-11T16:15:00Z',
  },
];

export const categories = [
  'Design',
  'Business',
  'Creative',
  'Technology',
  'Health & Wellness',
];

export const skillLevels = ['Beginner', 'Intermediate', 'Advanced'];
