export interface CreditTransaction {
  id: string;
  userId: string;
  workshopId: string;
  type: 'earned' | 'spent';
  amount: number;
  description: string;
  timestamp: string;
}

