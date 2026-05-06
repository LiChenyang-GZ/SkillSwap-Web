import type { NotificationItem } from "../../../types/notification";
import { Button } from "../../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../ui/dialog";
import { NOTIFICATIONS_CLOSE_LABEL } from "../constants/notificationMessages";
import type { NotificationActionView } from "../models/notificationActionModel";
import { formatNotificationTimestamp } from "../utils/notificationFormat";

interface NotificationDetailsDialogProps {
  isOpen: boolean;
  selectedNotification: NotificationItem | null;
  dialogAction: NotificationActionView | null;
  onClose: () => void;
}

export function NotificationDetailsDialog({
  isOpen,
  selectedNotification,
  dialogAction,
  onClose,
}: NotificationDetailsDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => (!open ? onClose() : null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{selectedNotification?.title}</DialogTitle>
          {selectedNotification?.timestamp && (
            <DialogDescription>{formatNotificationTimestamp(selectedNotification.timestamp)}</DialogDescription>
          )}
        </DialogHeader>
        <div className="text-sm text-muted-foreground">{selectedNotification?.message}</div>
        <DialogFooter>
          {selectedNotification && dialogAction && (
            <Button
              onClick={() => {
                dialogAction.action();
                onClose();
              }}
            >
              {dialogAction.label}
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>
            {NOTIFICATIONS_CLOSE_LABEL}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
