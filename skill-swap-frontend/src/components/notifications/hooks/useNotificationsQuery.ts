import { useEffect, useMemo, useState } from "react";
import type { NotificationItem } from "../../../types/notification";
import { notificationQueryService } from "../../../shared/service/notification/notificationQueryService";
import {
  NOTIFICATIONS_SESSION_EXPIRED_MESSAGE,
} from "../constants/notificationMessages";
import { sortNotifications } from "../utils/notificationSort";
import { resolveNotificationErrorMessage } from "../utils/notificationError";

interface UseNotificationsQueryParams {
  isAuthenticated: boolean;
  sessionToken: string | null;
}

export function useNotificationsQuery({ isAuthenticated, sessionToken }: UseNotificationsQueryParams) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reloadNonce, setReloadNonce] = useState(0);

  const sortedNotifications = useMemo(() => {
    return sortNotifications(notifications);
  }, [notifications]);

  useEffect(() => {
    let isCancelled = false;

    const loadNotifications = async () => {
      if (!isAuthenticated) {
        if (!isCancelled) {
          setNotifications([]);
          setErrorMessage(null);
          setIsLoading(false);
        }
        return;
      }

      if (!sessionToken) {
        if (!isCancelled) {
          setNotifications([]);
          setErrorMessage(NOTIFICATIONS_SESSION_EXPIRED_MESSAGE);
          setIsLoading(false);
        }
        return;
      }

      if (!isCancelled) {
        setIsLoading(true);
        setErrorMessage(null);
      }

      try {
        const data = await notificationQueryService.getAll(sessionToken);
        if (!isCancelled) {
          setNotifications(data);
        }
      } catch (error) {
        console.warn("Failed to load notifications", error);
        const status = (error as Error & { status?: number }).status;
        if (!isCancelled) {
          if (status === 401 || status === 403) {
            setErrorMessage(resolveNotificationErrorMessage(status));
          } else {
            setErrorMessage(resolveNotificationErrorMessage("unknown"));
          }
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadNotifications();

    return () => {
      isCancelled = true;
    };
  }, [isAuthenticated, sessionToken, reloadNonce]);

  const replaceNotification = (updatedNotification: NotificationItem) => {
    setNotifications((previous) =>
      previous.map((item) => (item.id === updatedNotification.id ? updatedNotification : item))
    );
  };

  const markAllReadLocally = () => {
    setNotifications((previous) => previous.map((item) => ({ ...item, read: true })));
  };

  const retryLoad = () => {
    setReloadNonce((previous) => previous + 1);
  };

  return {
    notifications,
    sortedNotifications,
    isLoading,
    errorMessage,
    replaceNotification,
    markAllReadLocally,
    retryLoad,
  };
}
