import { LayoutDashboard, Menu, Moon, PenSquare, ShieldCheck, Sun, Target, X } from "lucide-react";
import { Button } from "../../ui/button";
import { NAVIGATION_PAGE_KEYS } from "../constants/navigationPageKeys";
import type { NavigationMobileNavProps } from "../models/navigationViewModel";
import { NavigationBrand } from "./NavigationBrand";
import { NavigationNotificationDot } from "./NavigationNotificationDot";
import { NavigationPrimaryLinks } from "./NavigationPrimaryLinks";

export function NavigationMobileNav({
  items,
  currentPage,
  isDarkMode,
  isMobileMenuOpen,
  user,
  isAdmin,
  isAuthenticated,
  notificationsUnreadCount,
  onToggleDarkMode,
  onToggleMobileMenu,
  onNavigateAndCloseMobile,
  onNavigateToCreateAndCloseMobile,
  onSignOutAndCloseMobile,
}: NavigationMobileNavProps) {
  return (
    <nav className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="px-4 py-3 flex items-center justify-between">
        <NavigationBrand compact />

        <div className="flex items-center space-x-3">
          {/* 积分系统已停用：移动端导航不再展示积分入口。 */}
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
              onNavigate={onNavigateAndCloseMobile}
              isMobile
            />

            <div className="pt-3 border-t border-border">
              {user && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onNavigateAndCloseMobile(NAVIGATION_PAGE_KEYS.dashboard)}
                    className="w-full justify-start flex items-center space-x-3"
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    <span>Dashboard</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onNavigateToCreateAndCloseMobile}
                    className="w-full justify-start flex items-center space-x-3"
                  >
                    <Target className="w-4 h-4" />
                    <span>Host a Workshop</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onNavigateAndCloseMobile(NAVIGATION_PAGE_KEYS.notifications)}
                    className="w-full justify-start flex items-center space-x-3"
                  >
                    <NavigationNotificationDot unreadCount={notificationsUnreadCount} />
                    <span>Notifications</span>
                  </Button>
                  {isAdmin && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onNavigateAndCloseMobile(NAVIGATION_PAGE_KEYS.adminReview)}
                      className="w-full justify-start flex items-center space-x-3"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      <span>Admin Review</span>
                    </Button>
                  )}
                  {isAdmin && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onNavigateAndCloseMobile(NAVIGATION_PAGE_KEYS.adminMemory)}
                      className="w-full justify-start flex items-center space-x-3"
                    >
                      <PenSquare className="w-4 h-4" />
                      <span>Memory Studio</span>
                    </Button>
                  )}
                </>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleDarkMode}
                className="w-full justify-start flex items-center space-x-3"
              >
                {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                <span>{isDarkMode ? "Light Mode" : "Dark Mode"}</span>
              </Button>

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
