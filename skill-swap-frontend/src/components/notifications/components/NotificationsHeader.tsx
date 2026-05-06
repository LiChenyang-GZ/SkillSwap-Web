import { CheckCheck } from "lucide-react";
import { Button } from "../../ui/button";
import {
  NOTIFICATIONS_MARK_ALL_READ_LABEL,
  NOTIFICATIONS_PAGE_SUBTITLE,
  NOTIFICATIONS_PAGE_TITLE,
} from "../constants/notificationMessages";

interface NotificationsHeaderProps {
  canMarkAllRead: boolean;
  onMarkAllRead: () => void;
}

export function NotificationsHeader({ canMarkAllRead, onMarkAllRead }: NotificationsHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-2xl font-bold">{NOTIFICATIONS_PAGE_TITLE}</h1>
        <p className="text-muted-foreground">{NOTIFICATIONS_PAGE_SUBTITLE}</p>
      </div>
      <Button variant="outline" size="sm" onClick={onMarkAllRead} disabled={!canMarkAllRead}>
        <CheckCheck className="w-4 h-4 mr-2" />
        {NOTIFICATIONS_MARK_ALL_READ_LABEL}
      </Button>
    </div>
  );
}
