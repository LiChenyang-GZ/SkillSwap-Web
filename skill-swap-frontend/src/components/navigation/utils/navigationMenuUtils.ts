import { NAVIGATION_MENU_ENTRIES } from "../constants/navigationMenuEntries";
import type { NavigationMenuEntry } from "../models/navigationItemModel";

// Both the desktop dropdown and the mobile panel apply the same visibility rule.
export const selectVisibleMenuEntries = (isAdmin: boolean): NavigationMenuEntry[] =>
  NAVIGATION_MENU_ENTRIES.filter((entry) => !entry.adminOnly || isAdmin);
