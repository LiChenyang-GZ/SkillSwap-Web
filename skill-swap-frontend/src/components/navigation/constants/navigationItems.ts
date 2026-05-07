import { History, MessageSquare, Search } from "lucide-react";
import type { NavigationItem } from "../models/navigationItemModel";
import { NAVIGATION_PAGE_KEYS } from "./navigationPageKeys";

export const NAVIGATION_ITEMS: NavigationItem[] = [
  { id: NAVIGATION_PAGE_KEYS.explore, label: "Explore", icon: Search },
  { id: NAVIGATION_PAGE_KEYS.memory, label: "Memory", icon: History },
  { id: NAVIGATION_PAGE_KEYS.feedback, label: "Feedback", icon: MessageSquare },
];
