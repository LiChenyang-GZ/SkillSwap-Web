import type { User } from "../../../types/user";
import type { NavigationItem } from "./navigationItemModel";

export interface NavigationPrimaryLinksProps {
  items: NavigationItem[];
  currentPage: string;
  onNavigate: (page: string) => void;
  isMobile?: boolean;
}

export interface NavigationBrandProps {
  compact?: boolean;
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
  onSignOut: () => void;
  onPreloadCreate: () => void;
}

export interface NavigationDesktopNavProps {
  items: NavigationItem[];
  currentPage: string;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  user: User | null;
  isAdmin: boolean;
  isAuthenticated: boolean;
  notificationsUnreadCount: number;
  onNavigate: (page: string) => void;
  onSignOut: () => void;
  onPreloadCreate: () => void;
}

export interface NavigationMobileNavProps {
  items: NavigationItem[];
  currentPage: string;
  isDarkMode: boolean;
  isMobileMenuOpen: boolean;
  user: User | null;
  isAdmin: boolean;
  isAuthenticated: boolean;
  notificationsUnreadCount: number;
  onToggleDarkMode: () => void;
  onToggleMobileMenu: () => void;
  onNavigateAndCloseMobile: (page: string) => void;
  onNavigateToCreateAndCloseMobile: () => void;
  onSignOutAndCloseMobile: () => void;
}
