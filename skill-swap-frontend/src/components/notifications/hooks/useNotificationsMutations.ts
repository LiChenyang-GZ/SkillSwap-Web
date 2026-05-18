import type { NotificationItem } from "../../../types/notification";
import { notificationMutationService } from "../../../shared/service/notification/notificationMutationService";

interface UseNotificationsMutationsParams {
  getAuthToken: () => Promise<string | null>;
  canMarkAllRead: boolean;
  refreshNotificationsUnreadCount: () => Promise<void>;
  replaceNotification: (notification: NotificationItem) => void;
  markAllReadLocally: () => void;
}

export function useNotificationsMutations({
  getAuthToken,
  canMarkAllRead,
  refreshNotificationsUnreadCount,
  replaceNotification,
  markAllReadLocally,
}: UseNotificationsMutationsParams) {
  const handleMarkRead = async (notificationId: string) => {
    try {
      const token = await getAuthToken();
      if (!token) return;
      const updated = await notificationMutationService.markRead(notificationId, token);
      replaceNotification(updated);
      void refreshNotificationsUnreadCount();
    } catch (error) {
      console.warn("Failed to mark notification as read", error);
    }
  };

  const handleMarkAllRead = async () => {
    if (!canMarkAllRead) {
      return;
    }
    try {
      const token = await getAuthToken();
      if (!token) return;
      await notificationMutationService.markAllRead(token);
      markAllReadLocally();
      void refreshNotificationsUnreadCount();
    } catch (error) {
      console.warn("Failed to mark all notifications as read", error);
    }
  };

  return {
    handleMarkRead,
    handleMarkAllRead,
  };
}
