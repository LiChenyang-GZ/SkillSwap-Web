import { Target } from "lucide-react";
import { Button } from "../../ui/button";
import type { User } from "../../../types/user";

interface DashboardHeaderProps {
  user: User;
  onHostWorkshop: () => void;
}

export function DashboardHeader({ user, onHostWorkshop }: DashboardHeaderProps) {
  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">My Dashboard</h1>
        <p className="text-muted-foreground">
          👋 Welcome back, {user.username.split(" ")[0] || "Member"}! Track your learning journey and workshop
          activities.
        </p>
      </div>
      <div className="flex flex-col sm:flex-row gap-3 mt-4 lg:mt-0">
        <Button onClick={onHostWorkshop} className="bg-secondary text-secondary-foreground hover:bg-secondary/90">
          <Target className="w-4 h-4 mr-2" />
          Host a Workshop
        </Button>
      </div>
    </div>
  );
}

