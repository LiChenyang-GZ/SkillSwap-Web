import type { NotificationItem } from "../../../types/notification";
import type { Workshop } from "../../../types/workshop";
import { workshopQueryService } from "../../../shared/service/workshop/workshopQueryService";
import type { NotificationActionView } from "../models/notificationActionModel";
import { ADMIN_REVIEW_TARGET_WORKSHOP_STORAGE_KEY } from "../constants/notificationKeys";
import {
  NOTIFICATION_ACTION_LABELS,
  REVIEW_WORKSHOP_NOTIFICATION_TYPES,
  VIEW_WORKSHOP_NOTIFICATION_TYPES,
} from "../constants/notificationOptions";

interface UseNotificationActionsParams {
  isAuthenticated: boolean;
  getAuthToken: () => Promise<string | null>;
  setCurrentPage: (page: string) => void;
  upsertWorkshop: (workshop: Workshop) => void;
}

export function useNotificationActions({
  isAuthenticated,
  getAuthToken,
  setCurrentPage,
  upsertWorkshop,
}: UseNotificationActionsParams) {
  const openWorkshopFromNotification = (workshopId: string) => {
    if (isAuthenticated) {
      void (async () => {
        try {
          const token = await getAuthToken();
          if (!token) return;
          const latest = await workshopQueryService.getById(workshopId, token);
          if (latest) {
            upsertWorkshop(latest);
          }
        } catch (error) {
          console.warn("Failed to preload workshop from notification", error);
        }
      })();
    }
    setCurrentPage(`workshop-${workshopId}`);
  };

  const getNotificationAction = (notification: NotificationItem): NotificationActionView | null => {
    if (!notification.workshopId) {
      return null;
    }

    if (REVIEW_WORKSHOP_NOTIFICATION_TYPES.includes(notification.type as (typeof REVIEW_WORKSHOP_NOTIFICATION_TYPES)[number])) {
      return {
        label: NOTIFICATION_ACTION_LABELS.review_workshop,
        action: () => {
          sessionStorage.setItem(ADMIN_REVIEW_TARGET_WORKSHOP_STORAGE_KEY, notification.workshopId!);
          setCurrentPage("adminReview");
        },
      };
    }

    if (VIEW_WORKSHOP_NOTIFICATION_TYPES.includes(notification.type as (typeof VIEW_WORKSHOP_NOTIFICATION_TYPES)[number])) {
      return {
        label: NOTIFICATION_ACTION_LABELS.view_workshop,
        action: () => openWorkshopFromNotification(notification.workshopId!),
      };
    }

    return null;
  };

  return {
    getNotificationAction,
  };
}
