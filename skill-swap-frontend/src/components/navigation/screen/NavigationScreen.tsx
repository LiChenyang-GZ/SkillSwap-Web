import { NAVIGATION_ITEMS } from "../constants/navigationItems";
import { useNavigationCreateWorkshopPreload } from "../hooks/useNavigationCreateWorkshopPreload";
import { useNavigationContextState } from "../hooks/useNavigationContextState";
import { useNavigationMenuActions } from "../hooks/useNavigationMenuActions";
import { useNavigationResponsiveState } from "../hooks/useNavigationResponsiveState";
import { NavigationDesktopNav } from "../components/NavigationDesktopNav";
import { NavigationMobileNav } from "../components/NavigationMobileNav";

export function NavigationScreen() {
  const {
    currentPage,
    setCurrentPage,
    user,
    isAuthenticated,
    isAdmin,
    notificationsUnreadCount,
    signOut,
  } = useNavigationContextState();
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
        isMobileMenuOpen={isMobileMenuOpen}
        user={user}
        isAdmin={isAdmin}
        isAuthenticated={isAuthenticated}
        notificationsUnreadCount={notificationsUnreadCount}
        onToggleMobileMenu={toggleMobileMenu}
        onNavigateAndCloseMobile={navigateToPageAndCloseMobile}
        onNavigateToCreateAndCloseMobile={navigateToCreateAndCloseMobile}
        onSignOutAndCloseMobile={signOutAndCloseMobile}
      />
    </>
  );
}
