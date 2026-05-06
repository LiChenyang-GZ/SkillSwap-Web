import type { NotificationItem } from "../../../types/notification";
import { NotificationsListItem } from "./NotificationsListItem";
import { NotificationsListState } from "./NotificationsListState";

interface NotificationsListProps {
  notifications: NotificationItem[];
  isLoading: boolean;
  errorMessage: string | null;
  onRetryLoad: () => void;
  onOpenNotification: (notification: NotificationItem) => void | Promise<void>;
}

export function NotificationsList({
  notifications,
  isLoading,
  errorMessage,
  onRetryLoad,
  onOpenNotification,
}: NotificationsListProps) {
  return (
    <div className="rounded-xl border border-border bg-card divide-y divide-border overflow-hidden">
      {isLoading ? (
        <NotificationsListState state="loading" />
      ) : errorMessage ? (
        <NotificationsListState state="error" errorMessage={errorMessage} onRetry={onRetryLoad} />
      ) : notifications.length === 0 ? (
        <NotificationsListState state="empty" />
      ) : (
        notifications.map((notification) => (
          <NotificationsListItem
            key={notification.id}
            notification={notification}
            onOpenNotification={onOpenNotification}
          />
        ))
      )}
    </div>
  );
}
