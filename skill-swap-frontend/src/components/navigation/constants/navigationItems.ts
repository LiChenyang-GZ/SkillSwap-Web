import type { NavigationItem } from "../models/navigationItemModel";
import { NAVIGATION_PAGE_KEYS } from "./navigationPageKeys";

export const NAVIGATION_ITEMS: NavigationItem[] = [
  { key: "how-it-works", page: NAVIGATION_PAGE_KEYS.hero, sectionId: "how-it-works", label: "How it works" },
  { key: NAVIGATION_PAGE_KEYS.memory, page: NAVIGATION_PAGE_KEYS.memory, label: "Our stories" },
  { key: NAVIGATION_PAGE_KEYS.explore, page: NAVIGATION_PAGE_KEYS.explore, label: "Explore" },
];
