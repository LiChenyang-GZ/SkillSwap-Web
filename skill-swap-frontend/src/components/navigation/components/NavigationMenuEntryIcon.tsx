import type { NavigationMenuEntry } from "../models/navigationItemModel";
import { NavigationNotificationDot } from "./NavigationNotificationDot";

interface NavigationMenuEntryIconProps {
  entry: NavigationMenuEntry;
  notificationsUnreadCount: number;
}

export function NavigationMenuEntryIcon({ entry, notificationsUnreadCount }: NavigationMenuEntryIconProps) {
  if (entry.showUnreadDot) {
    return <NavigationNotificationDot unreadCount={notificationsUnreadCount} />;
  }

  const Icon = entry.icon;
  return Icon ? <Icon className="w-4 h-4" /> : null;
}
