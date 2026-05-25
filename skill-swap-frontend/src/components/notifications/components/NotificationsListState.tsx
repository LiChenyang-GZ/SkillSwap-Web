import { Bell } from "lucide-react";
import { Button } from "../../ui/button";
import {
  NOTIFICATIONS_EMPTY_MESSAGE,
  NOTIFICATIONS_LOADING_MESSAGE,
  NOTIFICATIONS_RETRY_LABEL,
} from "../constants/notificationMessages";

const FOX_EMPTY_NOTIFICATIONS_SRC = "/brand/fox-empty-notifications.png";
const LOADING_FOX_SRC = "/brand/fox-empty-search.png";

interface NotificationsListStateProps {
  state: "loading" | "error" | "empty";
  errorMessage?: string | null;
  onRetry?: () => void;
}

export function NotificationsListState({ state, errorMessage, onRetry }: NotificationsListStateProps) {
  if (state === "loading") {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <img
          src={LOADING_FOX_SRC}
          alt=""
          aria-hidden="true"
          className="mx-auto mb-3 h-20 w-20 object-contain animate-pulse"
        />
        <p className="animate-pulse">{NOTIFICATIONS_LOADING_MESSAGE}</p>
      </div>
    );
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
      <img
        src={FOX_EMPTY_NOTIFICATIONS_SRC}
        alt=""
        aria-hidden="true"
        className="mx-auto mb-4 h-32 w-32 object-contain sm:h-40 sm:w-40"
      />
      <p>{NOTIFICATIONS_EMPTY_MESSAGE}</p>
    </div>
  );
}
