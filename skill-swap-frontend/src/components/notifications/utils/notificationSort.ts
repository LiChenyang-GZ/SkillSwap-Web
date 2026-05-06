import type { NotificationItem } from "../../../types/notification";
import type { NotificationSortDirection, NotificationSortableItem } from "../models/notificationSortModel";

function resolveTimestampValue(item: NotificationSortableItem): number {
  return item.timestamp ? new Date(item.timestamp).getTime() : 0;
}

export function sortNotifications(
  notifications: NotificationItem[],
  direction: NotificationSortDirection = "desc"
): NotificationItem[] {
  const sign = direction === "desc" ? -1 : 1;
  return [...notifications].sort((a, b) => {
    return sign * (resolveTimestampValue(a) - resolveTimestampValue(b));
  });
}
