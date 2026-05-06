import type { NotificationItem } from "../../../types/notification";

export interface NotificationDialogState {
  isDialogOpen: boolean;
  selectedNotification: NotificationItem | null;
}
