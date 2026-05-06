import { useMemo } from "react";
import { useApp } from "../../../contexts/AppContext";
import { NotificationsAuthState } from "../components/NotificationsAuthState";
import { NotificationsHeader } from "../components/NotificationsHeader";
import { NotificationsList } from "../components/NotificationsList";
import { NotificationDetailsDialog } from "../components/NotificationDetailsDialog";
import { NOTIFICATIONS_PAGE_CONTENT_CLASS, NOTIFICATIONS_PAGE_WRAPPER_CLASS } from "../constants/notificationUiConstants";
import { useNotificationActions } from "../hooks/useNotificationActions";
import { useNotificationsMutations } from "../hooks/useNotificationsMutations";
import { useNotificationsQuery } from "../hooks/useNotificationsQuery";
import { useNotificationsSelection } from "../hooks/useNotificationsSelection";

export function NotificationsScreen() {
  const {
    sessionToken,
    refreshNotificationsUnreadCount,
    isAuthenticated,
    setCurrentPage,
    upsertWorkshop,
  } = useApp();

  const query = useNotificationsQuery({ isAuthenticated, sessionToken });
  const canMarkAllRead = Boolean(sessionToken) && !query.errorMessage && !query.isLoading;
  const mutations = useNotificationsMutations({
    sessionToken,
    canMarkAllRead,
    refreshNotificationsUnreadCount,
    replaceNotification: query.replaceNotification,
    markAllReadLocally: query.markAllReadLocally,
  });
  const selection = useNotificationsSelection({ onMarkRead: mutations.handleMarkRead });
  const actions = useNotificationActions({
    sessionToken,
    setCurrentPage,
    upsertWorkshop,
  });

  const dialogAction = useMemo(() => {
    if (!selection.selectedNotification) {
      return null;
    }
    return actions.getNotificationAction(selection.selectedNotification);
  }, [actions, selection.selectedNotification]);

  if (!isAuthenticated) {
    return (
      <div className={NOTIFICATIONS_PAGE_WRAPPER_CLASS}>
        <div className={NOTIFICATIONS_PAGE_CONTENT_CLASS}>
          <NotificationsAuthState />
        </div>
      </div>
    );
  }

  return (
    <div className={NOTIFICATIONS_PAGE_WRAPPER_CLASS}>
      <div className={NOTIFICATIONS_PAGE_CONTENT_CLASS}>
        <NotificationsHeader canMarkAllRead={canMarkAllRead} onMarkAllRead={mutations.handleMarkAllRead} />
        <NotificationsList
          notifications={query.sortedNotifications}
          isLoading={query.isLoading}
          errorMessage={query.errorMessage}
          onRetryLoad={query.retryLoad}
          onOpenNotification={selection.handleOpenNotification}
        />
      </div>

      <NotificationDetailsDialog
        isOpen={selection.isDialogOpen}
        selectedNotification={selection.selectedNotification}
        dialogAction={dialogAction}
        onClose={selection.handleCloseDialog}
      />
    </div>
  );
}
