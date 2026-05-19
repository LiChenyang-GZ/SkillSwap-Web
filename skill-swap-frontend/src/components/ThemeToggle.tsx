import { Moon, Sun } from 'lucide-react';
import { Button } from './ui/button';
import { useApp } from '../contexts/AppContext';

export function ThemeToggle() {
  const { isDarkMode, toggleDarkMode } = useApp();

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleDarkMode}
      className="h-9 w-9 p-0"
      aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDarkMode ? (
        <Sun className="h-4 w-4 transition-all" />
      ) : (
        <Moon className="h-4 w-4 transition-all" />
      )}
    </Button>
  );
}
