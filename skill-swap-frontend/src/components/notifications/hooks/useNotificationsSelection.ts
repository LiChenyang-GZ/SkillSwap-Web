import { useState } from "react";
import type { NotificationItem } from "../../../types/notification";
import type { NotificationDialogState } from "../models/notificationViewModel";

interface UseNotificationsSelectionParams {
  onMarkRead: (notificationId: string) => Promise<void>;
}

export function useNotificationsSelection({ onMarkRead }: UseNotificationsSelectionParams) {
  const [dialogState, setDialogState] = useState<NotificationDialogState>({
    isDialogOpen: false,
    selectedNotification: null,
  });

  const handleOpenNotification = async (notification: NotificationItem) => {
    setDialogState({
      isDialogOpen: true,
      selectedNotification: notification,
    });

    if (!notification.read) {
      await onMarkRead(notification.id);
      setDialogState((previous) => ({
        ...previous,
        selectedNotification:
          previous.selectedNotification && previous.selectedNotification.id === notification.id
            ? { ...previous.selectedNotification, read: true }
            : previous.selectedNotification,
      }));
    }
  };

  const handleCloseDialog = () => {
    setDialogState({
      isDialogOpen: false,
      selectedNotification: null,
    });
  };

  return {
    selectedNotification: dialogState.selectedNotification,
    isDialogOpen: dialogState.isDialogOpen,
    handleOpenNotification,
    handleCloseDialog,
  };
}
