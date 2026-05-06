import type { NotificationItem } from '../../../types/notification';

export interface NotificationApiPayload {
  id: string | number;
  userId?: string;
  recipientId?: string;
  type: string;
  title: string;
  message: string;
  timestamp?: string;
  createdAt?: string;
  read?: boolean;
  isRead?: boolean;
  workshopId?: string | null;
}

export function mapNotificationItem(payload: NotificationApiPayload): NotificationItem {
  return {
    id: String(payload.id),
    userId: payload.userId || payload.recipientId || '',
    type: payload.type,
    title: payload.title,
    message: payload.message,
    timestamp: payload.timestamp || payload.createdAt,
    read: payload.read ?? payload.isRead ?? false,
    workshopId: payload.workshopId ?? null,
  };
}
