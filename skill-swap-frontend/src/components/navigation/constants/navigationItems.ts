import type { NavigationItem } from "../models/navigationItemModel";

// The signed-in app shell is Explore-only, so the primary nav carries no page
// links — the brand logo returns you to Explore/home and the user menu covers
// the rest (dashboard, notifications, admin, sign out).
export const NAVIGATION_ITEMS: NavigationItem[] = [];
