import { LayoutDashboard, PenSquare, Plus, ShieldCheck } from "lucide-react";
import type { NavigationMenuEntry } from "../models/navigationItemModel";
import { NAVIGATION_PAGE_KEYS } from "./navigationPageKeys";

export const NAVIGATION_MENU_ENTRIES: NavigationMenuEntry[] = [
  {
    page: NAVIGATION_PAGE_KEYS.dashboard,
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    page: NAVIGATION_PAGE_KEYS.create,
    label: "Host a Workshop",
    icon: Plus,
    preload: true,
  },
  {
    page: NAVIGATION_PAGE_KEYS.notifications,
    label: "Notifications",
    showUnreadDot: true,
  },
  {
    page: NAVIGATION_PAGE_KEYS.adminReview,
    label: "Admin Review",
    icon: ShieldCheck,
    adminOnly: true,
  },
  {
    page: NAVIGATION_PAGE_KEYS.adminMemory,
    label: "Memory Studio",
    icon: PenSquare,
    adminOnly: true,
  },
];
