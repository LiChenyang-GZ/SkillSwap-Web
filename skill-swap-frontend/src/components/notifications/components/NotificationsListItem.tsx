import type { NotificationItem } from "../../../types/notification";
import { formatNotificationTimestamp } from "../utils/notificationFormat";

interface NotificationsListItemProps {
  notification: NotificationItem;
  onOpenNotification: (notification: NotificationItem) => void | Promise<void>;
}

export function NotificationsListItem({ notification, onOpenNotification }: NotificationsListItemProps) {
  return (
    <button
      key={notification.id}
      type="button"
      onClick={() => onOpenNotification(notification)}
      className={
        "relative w-full p-5 flex flex-col gap-2 text-left transition-colors cursor-pointer hover:bg-muted/60 " +
        (notification.read ? "bg-card" : "bg-primary/5")
      }
    >
      {!notification.read && <span className="absolute top-4 right-4 h-2 w-2 rounded-full bg-red-500" />}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-semibold text-foreground">{notification.title}</p>
          <p className="text-sm text-muted-foreground">{notification.message}</p>
        </div>
      </div>
      {notification.timestamp && <p className="text-xs text-muted-foreground">{formatNotificationTimestamp(notification.timestamp)}</p>}
    </button>
  );
}
