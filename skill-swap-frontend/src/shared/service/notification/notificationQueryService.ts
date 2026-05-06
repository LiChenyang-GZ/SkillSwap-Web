import { apiCall } from '../../../lib/api';
import type { NotificationItem } from '../../../types/notification';
import { mapNotificationItem } from './notificationMapper';

export const notificationQueryService = {
  getAll: async (token?: string | null): Promise<NotificationItem[]> => {
    const data = await apiCall<any[]>('/api/v1/notifications', {}, token);
    return data.map((item) => mapNotificationItem(item));
  },

  getUnreadCount: async (token?: string | null): Promise<number> => {
    const data = await apiCall<{ count: number }>('/api/v1/notifications/unread-count', {}, token);
    return data.count;
  },
};
