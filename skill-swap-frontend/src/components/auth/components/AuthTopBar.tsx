import { ArrowLeft, Moon, Sun } from "lucide-react";
import { Button } from "../../ui/button";

interface AuthTopBarProps {
  isDarkMode: boolean;
  onBackToHome: () => void;
  onToggleTheme: () => void;
}

export function AuthTopBar({ isDarkMode, onBackToHome, onToggleTheme }: AuthTopBarProps) {
  return (
    <div className="mb-6 flex items-center justify-between">
      <Button
        variant="ghost"
        onClick={onBackToHome}
        className={
          isDarkMode
            ? "flex items-center gap-2 text-slate-300 hover:text-white"
            : "flex items-center gap-2 text-slate-700 hover:text-slate-900"
        }
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Home
      </Button>
      <Button
        variant="outline"
        onClick={onToggleTheme}
        className={
          isDarkMode
            ? "border-slate-300/60 bg-slate-700/90 text-white hover:bg-slate-600"
            : "border-slate-300 bg-white/70 text-slate-900 hover:bg-white"
        }
      >
        {isDarkMode ? <Sun className="w-4 h-4 mr-2" /> : <Moon className="w-4 h-4 mr-2" />}
        {isDarkMode ? "Light Mode" : "Dark Mode"}
      </Button>
    </div>
  );
}
