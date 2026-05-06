import type { NotificationItem } from "../../../types/notification";
import { notificationMutationService } from "../../../shared/service/notification/notificationMutationService";

interface UseNotificationsMutationsParams {
  sessionToken: string | null;
  canMarkAllRead: boolean;
  refreshNotificationsUnreadCount: () => Promise<void>;
  replaceNotification: (notification: NotificationItem) => void;
  markAllReadLocally: () => void;
}

export function useNotificationsMutations({
  sessionToken,
  canMarkAllRead,
  refreshNotificationsUnreadCount,
  replaceNotification,
  markAllReadLocally,
}: UseNotificationsMutationsParams) {
  const handleMarkRead = async (notificationId: string) => {
    try {
      const updated = await notificationMutationService.markRead(notificationId, sessionToken);
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
      await notificationMutationService.markAllRead(sessionToken);
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
