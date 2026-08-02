import { Menu, X } from "lucide-react";
import { Button } from "../../ui/button";
import { NAVIGATION_PAGE_KEYS } from "../constants/navigationPageKeys";
import type { NavigationMobileNavProps } from "../models/navigationViewModel";
import { selectVisibleMenuEntries } from "../utils/navigationMenuUtils";
import { NavigationBrand } from "./NavigationBrand";
import { NavigationMenuEntryIcon } from "./NavigationMenuEntryIcon";
import { NavigationPrimaryLinks } from "./NavigationPrimaryLinks";

export function NavigationMobileNav({
  items,
  currentPage,
  isMobileMenuOpen,
  user,
  isAdmin,
  isAuthenticated,
  notificationsUnreadCount,
  onToggleMobileMenu,
  onNavigateAndCloseMobile,
  onNavigateToItemAndCloseMobile,
  onHostSwap,
  onSignOutAndCloseMobile,
}: NavigationMobileNavProps) {
  return (
    <nav className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="px-4 py-3 flex items-center justify-between">
        <NavigationBrand compact onClick={() => onNavigateAndCloseMobile(isAuthenticated ? "explore" : "hero")} />

        <div className="flex items-center space-x-2">
          <Button onClick={onHostSwap} size="sm" className="rounded-full px-4">
            Host a swap
          </Button>
          <Button variant="ghost" size="sm" onClick={onToggleMobileMenu} className="w-8 h-8 p-0">
            {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {isMobileMenuOpen && (
        <div className="absolute top-full left-0 right-0 bg-background border-b border-border">
          <div className="px-4 py-4 space-y-2">
            <NavigationPrimaryLinks
              items={items}
              currentPage={currentPage}
              onNavigate={onNavigateToItemAndCloseMobile}
              isMobile
            />

            <div className="pt-3 border-t border-border">
              {user &&
                selectVisibleMenuEntries(isAdmin).map((entry) => (
                  <Button
                    key={entry.page}
                    variant="ghost"
                    size="sm"
                    onClick={() => onNavigateAndCloseMobile(entry.page)}
                    className="w-full justify-start flex items-center space-x-3"
                  >
                    <NavigationMenuEntryIcon entry={entry} notificationsUnreadCount={notificationsUnreadCount} />
                    <span>{entry.label}</span>
                  </Button>
                ))}
              {isAuthenticated ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onSignOutAndCloseMobile}
                  className="w-full justify-start flex items-center space-x-3"
                >
                  <span>Sign Out</span>
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onNavigateAndCloseMobile(NAVIGATION_PAGE_KEYS.auth)}
                  className="w-full justify-start flex items-center space-x-3"
                >
                  <span>Sign In</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
