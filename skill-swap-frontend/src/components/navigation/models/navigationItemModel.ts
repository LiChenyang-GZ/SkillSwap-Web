import type { LucideIcon } from "lucide-react";

export interface NavigationItem {
  key: string;
  page: string;
  label: string;
  icon?: LucideIcon;
  sectionId?: string;
}

export interface NavigationMenuEntry {
  page: string;
  label: string;
  icon?: LucideIcon;
  showUnreadDot?: boolean;
  adminOnly?: boolean;
  preload?: boolean;
}
