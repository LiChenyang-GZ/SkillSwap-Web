import { ArrowLeft } from "lucide-react";
import { Button } from "../../ui/button";

interface AuthTopBarProps {
  onBackToHome: () => void;
}

export function AuthTopBar({ onBackToHome }: AuthTopBarProps) {
  return (
    <div className="mb-6 flex items-center">
      <Button
        variant="ghost"
        onClick={onBackToHome}
        className="flex items-center gap-2 text-slate-700 hover:text-slate-900"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Home
      </Button>
    </div>
  );
}
