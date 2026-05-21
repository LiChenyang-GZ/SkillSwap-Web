import { useCallback, useEffect, useRef, useState } from "react";
import { notificationQueryService } from "../../shared/service/notification/notificationQueryService";
import type { GetAuthToken } from "./appContextTypes";

interface UseNotificationUnreadCountParams {
  currentPage: string;
  getAuthToken: GetAuthToken;
  isAuthenticated: boolean;
}

export const useNotificationUnreadCount = ({
  currentPage,
  getAuthToken,
  isAuthenticated,
}: UseNotificationUnreadCountParams) => {
  const [notificationsUnreadCount, setNotificationsUnreadCount] = useState(0);
  const notificationsInFlightRef = useRef<Promise<void> | null>(null);

  const resetNotificationsUnreadCount = useCallback(() => {
    setNotificationsUnreadCount(0);
  }, []);

  const refreshNotificationsUnreadCount = useCallback(async () => {
    if (!isAuthenticated) {
      setNotificationsUnreadCount(0);
      return;
    }

    if (notificationsInFlightRef.current) {
      return notificationsInFlightRef.current;
    }

    const task = (async () => {
      try {
        const token = await getAuthToken();
        if (!token) return;
        const count = await notificationQueryService.getUnreadCount(token);
        setNotificationsUnreadCount(count);
      } catch (error) {
        console.warn("Failed to fetch notification count", error);
      }
    })();

    notificationsInFlightRef.current = task;
    try {
      await task;
    } finally {
      notificationsInFlightRef.current = null;
    }
  }, [isAuthenticated, getAuthToken]);

  useEffect(() => {
    if (!isAuthenticated) {
      setNotificationsUnreadCount(0);
      return;
    }

    if (currentPage === "notifications") {
      return;
    }

    // 在非通知页面后台刷新未读数，避免阻塞当前页渲染。
    const timer = window.setTimeout(() => {
      void refreshNotificationsUnreadCount();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [currentPage, refreshNotificationsUnreadCount, isAuthenticated]);

  return {
    notificationsUnreadCount,
    refreshNotificationsUnreadCount,
    resetNotificationsUnreadCount,
  };
};
