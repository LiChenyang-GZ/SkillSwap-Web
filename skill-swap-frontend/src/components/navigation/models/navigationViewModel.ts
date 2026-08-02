import type { User } from "../../../types/user";
import type { NavigationItem } from "./navigationItemModel";

export interface NavigationPrimaryLinksProps {
  items: NavigationItem[];
  currentPage: string;
  onNavigate: (item: NavigationItem) => void;
  isMobile?: boolean;
}

export interface NavigationBrandProps {
  compact?: boolean;
  onClick?: () => void;
}

export interface NavigationNotificationDotProps {
  unreadCount: number;
}

export interface NavigationUserMenuProps {
  user: User | null;
  isAdmin: boolean;
  isAuthenticated: boolean;
  notificationsUnreadCount: number;
  onNavigate: (page: string) => void;
  onSignOut: () => Promise<void>;
  onPreloadCreate: () => void;
}

export interface NavigationDesktopNavProps {
  items: NavigationItem[];
  currentPage: string;
  user: User | null;
  isAdmin: boolean;
  isAuthenticated: boolean;
  notificationsUnreadCount: number;
  onNavigate: (page: string) => void;
  onNavigateToItem: (item: NavigationItem) => void;
  onHostSwap: () => void;
  onSignOut: () => Promise<void>;
  onPreloadCreate: () => void;
}

export interface NavigationMobileNavProps {
  items: NavigationItem[];
  currentPage: string;
  isMobileMenuOpen: boolean;
  user: User | null;
  isAdmin: boolean;
  isAuthenticated: boolean;
  notificationsUnreadCount: number;
  onToggleMobileMenu: () => void;
  onNavigateAndCloseMobile: (page: string) => void;
  onNavigateToItemAndCloseMobile: (item: NavigationItem) => void;
  onHostSwap: () => void;
  onSignOutAndCloseMobile: () => Promise<void>;
}
