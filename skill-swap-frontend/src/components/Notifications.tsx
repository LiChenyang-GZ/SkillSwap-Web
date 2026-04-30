import { useEffect, useMemo, useState } from "react";
import { notificationAPI, workshopAPI } from "../lib/api";
import type { NotificationItem } from "../types/notification";
import { useApp } from "../contexts/AppContext";
import { Button } from "./ui/button";
import { Bell, CheckCheck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

export function Notifications() {
  const { sessionToken, refreshNotificationsUnreadCount, isAuthenticated, setCurrentPage, upsertWorkshop } = useApp();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedNotification, setSelectedNotification] = useState<NotificationItem | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const sortedNotifications = useMemo(() => {
    return [...notifications].sort((a, b) => {
      const aTime = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const bTime = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return bTime - aTime;
    });
  }, [notifications]);

  const loadNotifications = async (isMounted: () => boolean) => {
    if (!isAuthenticated) {
      if (isMounted()) {
        setNotifications([]);
        setErrorMessage(null);
        setIsLoading(false);
      }
      return;
    }

    if (!sessionToken) {
      if (isMounted()) {
        setNotifications([]);
        setErrorMessage("Please sign in again to view your notifications.");
        setIsLoading(false);
      }
      return;
    }

    if (isMounted()) {
      setIsLoading(true);
      setErrorMessage(null);
    }

    try {
      const data = await notificationAPI.getAll(sessionToken);
      if (isMounted()) {
        setNotifications(data);
      }
    } catch (error) {
      console.warn("Failed to load notifications", error);
      const status = (error as Error & { status?: number }).status;
      if (isMounted()) {
        if (status === 401) {
          setErrorMessage("Please sign in again to view your notifications.");
        } else if (status === 403) {
          setErrorMessage("You do not have permission to view notifications.");
        } else {
          setErrorMessage("Failed to load notifications. Please try again.");
        }
      }
    } finally {
      if (isMounted()) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    let isMounted = true;

    const mounted = () => isMounted;
    void loadNotifications(mounted);

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, sessionToken]);

  const handleMarkRead = async (notificationId: string) => {
    try {
      const updated = await notificationAPI.markRead(notificationId, sessionToken);
      setNotifications((prev) =>
        prev.map((item) => (item.id === notificationId ? updated : item))
      );
      void refreshNotificationsUnreadCount();
    } catch (error) {
      console.warn("Failed to mark notification as read", error);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationAPI.markAllRead(sessionToken);
      setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
      void refreshNotificationsUnreadCount();
    } catch (error) {
      console.warn("Failed to mark all notifications as read", error);
    }
  };

  const openWorkshopFromNotification = (workshopId: string) => {
    if (sessionToken) {
      void workshopAPI.getById(workshopId, sessionToken).then((latest) => {
        if (latest) {
          upsertWorkshop(latest);
        }
      });
    }
    setCurrentPage(`workshop-${workshopId}`);
  };

  const handleOpenNotification = async (notification: NotificationItem) => {
    setSelectedNotification(notification);
    setIsDialogOpen(true);
    if (!notification.read) {
      await handleMarkRead(notification.id);
    }
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedNotification(null);
  };

  const getNotificationAction = (notification: NotificationItem) => {
    if (!notification.workshopId) {
      return null;
    }

    switch (notification.type) {
      case "workshop_submission":
        return {
          label: "Review workshop",
          action: () => {
            if (notification.workshopId) {
              sessionStorage.setItem("adminReviewTargetId", notification.workshopId);
            }
            setCurrentPage("adminReview");
          },
        };
      case "workshop_approved":
      case "workshop_updated":
      case "workshop_updated_by_admin":
      case "workshop_cancelled":
        return {
          label: "View workshop",
          action: () => openWorkshopFromNotification(notification.workshopId!),
        };
      default:
        return null;
    }
  };

  const dialogAction = selectedNotification
    ? getNotificationAction(selectedNotification)
    : null;

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background pt-20 lg:pt-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="rounded-xl border border-border bg-card p-8 text-center">
            <Bell className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <h2 className="text-xl font-semibold mb-2">Sign in to view notifications</h2>
            <p className="text-muted-foreground">Your updates will appear here once you are logged in.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-20 lg:pt-24 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Notifications</h1>
            <p className="text-muted-foreground">Stay on top of workshop updates.</p>
          </div>
          <Button variant="outline" size="sm" onClick={handleMarkAllRead}>
            <CheckCheck className="w-4 h-4 mr-2" />
            Mark all read
          </Button>
        </div>

        <div className="rounded-xl border border-border bg-card divide-y divide-border overflow-hidden">
          {isLoading ? (
            <div className="p-6 text-center text-muted-foreground">Loading notifications...</div>
          ) : errorMessage ? (
            <div className="p-10 text-center text-muted-foreground space-y-3">
              <Bell className="w-10 h-10 mx-auto mb-1" />
              <p>{errorMessage}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const mounted = () => true;
                  void loadNotifications(mounted);
                }}
              >
                Retry
              </Button>
            </div>
          ) : sortedNotifications.length === 0 ? (
            <div className="p-10 text-center text-muted-foreground">
              <Bell className="w-10 h-10 mx-auto mb-3" />
              <p>No notifications yet.</p>
            </div>
          ) : (
            sortedNotifications.map((notification) => (
              <div
                key={notification.id}
                role="button"
                tabIndex={0}
                onClick={() => handleOpenNotification(notification)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    handleOpenNotification(notification);
                  }
                }}
                className={
                  "relative p-5 flex flex-col gap-2 transition-colors cursor-pointer hover:bg-muted/60 " +
                  (notification.read ? "bg-card" : "bg-primary/5")
                }
              >
                {!notification.read && (
                  <span className="absolute top-4 right-4 h-2 w-2 rounded-full bg-red-500" />
                )}
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-foreground">{notification.title}</p>
                    <p className="text-sm text-muted-foreground">{notification.message}</p>
                  </div>
                </div>
                {notification.timestamp && (
                  <p className="text-xs text-muted-foreground">
                    {new Date(notification.timestamp).toLocaleString()}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={(open) => (!open ? handleCloseDialog() : null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedNotification?.title}</DialogTitle>
            {selectedNotification?.timestamp && (
              <DialogDescription>
                {new Date(selectedNotification.timestamp).toLocaleString()}
              </DialogDescription>
            )}
          </DialogHeader>
          <div className="text-sm text-muted-foreground">
            {selectedNotification?.message}
          </div>
          <DialogFooter>
            {selectedNotification && dialogAction && (
              <Button
                onClick={() => {
                  dialogAction.action();
                  handleCloseDialog();
                }}
              >
                {dialogAction.label}
              </Button>
            )}
            <Button variant="outline" onClick={handleCloseDialog}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
