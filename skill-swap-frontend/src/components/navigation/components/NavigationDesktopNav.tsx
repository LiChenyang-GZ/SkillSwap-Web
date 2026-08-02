import { ArrowRight } from "lucide-react";
import type { NavigationDesktopNavProps } from "../models/navigationViewModel";
import { Button } from "../../ui/button";
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
  onNavigateToItem,
  onHostSwap,
  onSignOut,
  onPreloadCreate,
}: NavigationDesktopNavProps) {
  return (
    <nav className="hidden lg:flex fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="max-w-7xl mx-auto w-full px-6 py-4 flex items-center justify-between">
        <NavigationBrand onClick={() => onNavigate(isAuthenticated ? "explore" : "hero")} />

        <div className="flex items-center space-x-1">
          <NavigationPrimaryLinks items={items} currentPage={currentPage} onNavigate={onNavigateToItem} />
        </div>

        <div className="flex items-center space-x-4">
          <Button
            onClick={onHostSwap}
            onMouseEnter={onPreloadCreate}
            onFocus={onPreloadCreate}
            size="sm"
            className="rounded-full px-5"
          >
            Host a swap
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
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
