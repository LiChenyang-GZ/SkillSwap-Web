import { Bell } from "lucide-react";
import { Button } from "../../ui/button";
import {
  NOTIFICATIONS_EMPTY_MESSAGE,
  NOTIFICATIONS_LOADING_MESSAGE,
  NOTIFICATIONS_RETRY_LABEL,
} from "../constants/notificationMessages";

interface NotificationsListStateProps {
  state: "loading" | "error" | "empty";
  errorMessage?: string | null;
  onRetry?: () => void;
}

export function NotificationsListState({ state, errorMessage, onRetry }: NotificationsListStateProps) {
  if (state === "loading") {
    return <div className="p-6 text-center text-muted-foreground">{NOTIFICATIONS_LOADING_MESSAGE}</div>;
  }

  if (state === "error") {
    return (
      <div className="p-10 text-center text-muted-foreground space-y-3">
        <Bell className="w-10 h-10 mx-auto mb-1" />
        <p>{errorMessage}</p>
        <Button variant="outline" size="sm" onClick={onRetry}>
          {NOTIFICATIONS_RETRY_LABEL}
        </Button>
      </div>
    );
  }

  return (
    <div className="p-10 text-center text-muted-foreground">
      <Bell className="w-10 h-10 mx-auto mb-3" />
      <p>{NOTIFICATIONS_EMPTY_MESSAGE}</p>
    </div>
  );
}
