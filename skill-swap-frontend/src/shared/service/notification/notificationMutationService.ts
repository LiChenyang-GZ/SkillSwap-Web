import { apiCall } from '../../../lib/api';
import type { NotificationItem } from '../../../types/notification';
import { mapNotificationItem } from './notificationMapper';

export const notificationMutationService = {
  markRead: async (notificationId: string, token?: string | null): Promise<NotificationItem> => {
    const data = await apiCall<any>(`/api/v1/notifications/${notificationId}/read`, { method: 'POST' }, token);
    return mapNotificationItem(data);
  },

  markAllRead: async (token?: string | null): Promise<void> => {
    await apiCall<void>('/api/v1/notifications/read-all', { method: 'POST' }, token);
  },
};
