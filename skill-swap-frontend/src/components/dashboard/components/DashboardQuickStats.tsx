import { BookOpen, Calendar, Target } from "lucide-react";
import { Card, CardContent } from "../../ui/card";

interface DashboardQuickStatsProps {
  upcomingCount: number;
  attendedCount: number;
  hostingCount: number;
}

export function DashboardQuickStats({ upcomingCount, attendedCount, hostingCount }: DashboardQuickStatsProps) {
  return (
    <div className="mt-6 space-y-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">My Upcoming Workshops</p>
                <p className="text-xl font-bold">{upcomingCount}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-secondary/10 rounded-lg flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-secondary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Attended</p>
                <p className="text-xl font-bold">{attendedCount}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
                <Target className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Hosting Workshops</p>
                <p className="text-xl font-bold">{hostingCount}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

