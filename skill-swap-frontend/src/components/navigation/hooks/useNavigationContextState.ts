import { useApp } from "../../../contexts/AppContext";

export function useNavigationContextState() {
  const {
    currentPage,
    setCurrentPage,
    isDarkMode,
    toggleDarkMode,
    user,
    isAuthenticated,
    isAdmin,
    notificationsUnreadCount,
    signOut,
  } = useApp();

  return {
    currentPage,
    setCurrentPage,
    isDarkMode,
    toggleDarkMode,
    user,
    isAuthenticated,
    isAdmin,
    notificationsUnreadCount,
    signOut,
  };
}
