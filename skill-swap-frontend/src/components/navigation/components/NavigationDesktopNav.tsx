import { Moon, Sun } from "lucide-react";
import { Button } from "../../ui/button";
import type { NavigationDesktopNavProps } from "../models/navigationViewModel";
import { NavigationBrand } from "./NavigationBrand";
import { NavigationPrimaryLinks } from "./NavigationPrimaryLinks";
import { NavigationUserMenu } from "./NavigationUserMenu";

export function NavigationDesktopNav({
  items,
  currentPage,
  isDarkMode,
  onToggleDarkMode,
  user,
  isAdmin,
  isAuthenticated,
  notificationsUnreadCount,
  onNavigate,
  onSignOut,
  onPreloadCreate,
}: NavigationDesktopNavProps) {
  return (
    <nav className="hidden lg:flex fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="max-w-7xl mx-auto w-full px-6 py-4 flex items-center justify-between">
        <NavigationBrand />

        <div className="flex items-center space-x-1">
          <NavigationPrimaryLinks items={items} currentPage={currentPage} onNavigate={onNavigate} />
        </div>

        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" onClick={onToggleDarkMode} className="w-9 h-9 p-0">
            {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>

          <NavigationUserMenu
            user={user}
            isAdmin={isAdmin}
            isAuthenticated={isAuthenticated}
            notificationsUnreadCount={notificationsUnreadCount}
            onNavigate={onNavigate}
            onSignOut={onSignOut}
            onPreloadCreate={onPreloadCreate}
          />
        </div>
      </div>
    </nav>
  );
}
