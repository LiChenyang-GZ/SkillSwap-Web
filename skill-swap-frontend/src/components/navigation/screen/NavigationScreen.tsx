import { NAVIGATION_ITEMS } from "../constants/navigationItems";
import { useNavigationAuthState } from "../hooks/useNavigationAuthState";
import { useNavigationCreateWorkshopPreload } from "../hooks/useNavigationCreateWorkshopPreload";
import { useNavigationMenuActions } from "../hooks/useNavigationMenuActions";
import { useNavigationPageState } from "../hooks/useNavigationPageState";
import { useNavigationResponsiveState } from "../hooks/useNavigationResponsiveState";
import { useNavigationThemeState } from "../hooks/useNavigationThemeState";
import { NavigationDesktopNav } from "../components/NavigationDesktopNav";
import { NavigationMobileNav } from "../components/NavigationMobileNav";

export function NavigationScreen() {
  const { currentPage, setCurrentPage } = useNavigationPageState();
  const { isDarkMode, toggleDarkMode } = useNavigationThemeState();
  const { user, isAuthenticated, isAdmin, notificationsUnreadCount, signOut } = useNavigationAuthState();
  const { isMobileMenuOpen, closeMobileMenu, toggleMobileMenu } = useNavigationResponsiveState();
  const { preloadCreateWorkshopScreen } = useNavigationCreateWorkshopPreload(isAuthenticated);
  const { navigateToPage, navigateToPageAndCloseMobile, navigateToCreateAndCloseMobile, signOutAndCloseMobile } =
    useNavigationMenuActions({
      setCurrentPage,
      closeMobileMenu,
      preloadCreateWorkshopScreen,
      signOut,
    });

  return (
    <>
      <NavigationDesktopNav
        items={NAVIGATION_ITEMS}
        currentPage={currentPage}
        isDarkMode={isDarkMode}
        onToggleDarkMode={toggleDarkMode}
        user={user}
        isAdmin={isAdmin}
        isAuthenticated={isAuthenticated}
        notificationsUnreadCount={notificationsUnreadCount}
        onNavigate={navigateToPage}
        onSignOut={signOut}
        onPreloadCreate={preloadCreateWorkshopScreen}
      />

      <NavigationMobileNav
        items={NAVIGATION_ITEMS}
        currentPage={currentPage}
        isDarkMode={isDarkMode}
        isMobileMenuOpen={isMobileMenuOpen}
        user={user}
        isAdmin={isAdmin}
        isAuthenticated={isAuthenticated}
        notificationsUnreadCount={notificationsUnreadCount}
        onToggleDarkMode={toggleDarkMode}
        onToggleMobileMenu={toggleMobileMenu}
        onNavigateAndCloseMobile={navigateToPageAndCloseMobile}
        onNavigateToCreateAndCloseMobile={navigateToCreateAndCloseMobile}
        onSignOutAndCloseMobile={signOutAndCloseMobile}
      />
    </>
  );
}
