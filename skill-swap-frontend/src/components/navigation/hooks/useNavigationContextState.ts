import { useApp } from "../../../contexts/AppContext";

export function useNavigationContextState() {
  const {
    currentPage,
    setCurrentPage,
    user,
    isAuthenticated,
    isAdmin,
    notificationsUnreadCount,
    signOut,
  } = useApp();

  return {
    currentPage,
    setCurrentPage,
    user,
    isAuthenticated,
    isAdmin,
    notificationsUnreadCount,
    signOut,
  };
}
