import { useApp } from "../../../contexts/AppContext";

export function useNavigationAuthState() {
  const { user, isAuthenticated, isAdmin, notificationsUnreadCount, signOut } = useApp();

  return {
    user,
    isAuthenticated,
    isAdmin,
    notificationsUnreadCount,
    signOut,
  };
}
