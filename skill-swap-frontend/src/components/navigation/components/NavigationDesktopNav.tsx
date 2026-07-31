import type { NavigationDesktopNavProps } from "../models/navigationViewModel";
import { NavigationBrand } from "./NavigationBrand";
import { NavigationPrimaryLinks } from "./NavigationPrimaryLinks";
import { NavigationUserMenu } from "./NavigationUserMenu";

export function NavigationDesktopNav({
  items,
  currentPage,
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
        <NavigationBrand onClick={() => onNavigate(isAuthenticated ? "explore" : "hero")} />

        <div className="flex items-center space-x-1">
          <NavigationPrimaryLinks items={items} currentPage={currentPage} onNavigate={onNavigate} />
        </div>

        <div className="flex items-center space-x-4">
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
