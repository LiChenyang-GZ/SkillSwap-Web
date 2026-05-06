import { Bell } from "lucide-react";
import {
  NOTIFICATIONS_SIGNIN_DESCRIPTION,
  NOTIFICATIONS_SIGNIN_TITLE,
} from "../constants/notificationMessages";

export function NotificationsAuthState() {
  return (
    <div className="rounded-xl border border-border bg-card p-8 text-center">
      <Bell className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
      <h2 className="text-xl font-semibold mb-2">{NOTIFICATIONS_SIGNIN_TITLE}</h2>
      <p className="text-muted-foreground">{NOTIFICATIONS_SIGNIN_DESCRIPTION}</p>
    </div>
  );
}
