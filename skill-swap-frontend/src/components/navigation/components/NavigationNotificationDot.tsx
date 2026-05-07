import { Bell } from "lucide-react";
import type { NavigationNotificationDotProps } from "../models/navigationViewModel";

export function NavigationNotificationDot({ unreadCount }: NavigationNotificationDotProps) {
  return (
    <div className="relative">
      <Bell className="w-4 h-4" />
      {unreadCount > 0 && <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-500" />}
    </div>
  );
}
