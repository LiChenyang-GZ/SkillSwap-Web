import type { NavigationItem } from "./navigationItemModel";

export interface NavigationMenuActions {
  navigateToPage: (page: string) => void;
  navigateToItem: (item: NavigationItem) => void;
  signOutAndCloseMobile: () => Promise<void>;
}
