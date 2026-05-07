import { useApp } from "../../../contexts/AppContext";

export function useNavigationThemeState() {
  const { isDarkMode, toggleDarkMode } = useApp();

  return {
    isDarkMode,
    toggleDarkMode,
  };
}
