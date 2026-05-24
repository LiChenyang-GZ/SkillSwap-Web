import { useCallback, useEffect, useState } from "react";

const THEME_STORAGE_KEY = "skill-swap-theme";

const applyThemeClass = (isDarkMode: boolean) => {
  document.documentElement.classList.toggle("dark", isDarkMode);
  document.documentElement.classList.toggle("light", !isDarkMode);
};

export const useThemeMode = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    const systemPrefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;
    const shouldUseDarkTheme = savedTheme === "dark" || (savedTheme === null && systemPrefersDark);

    setIsDarkMode(shouldUseDarkTheme);
    applyThemeClass(shouldUseDarkTheme);
  }, []);

  const toggleDarkMode = useCallback(() => {
    setIsDarkMode((currentMode) => {
      const nextMode = !currentMode;
      localStorage.setItem(THEME_STORAGE_KEY, nextMode ? "dark" : "light");
      applyThemeClass(nextMode);
      return nextMode;
    });
  }, []);

  return {
    isDarkMode,
    toggleDarkMode,
  };
};
