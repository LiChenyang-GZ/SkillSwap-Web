export interface NotificationItem {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  timestamp?: string;
  read: boolean;
  actionUrl?: string;
  workshopId?: string | null;
}

