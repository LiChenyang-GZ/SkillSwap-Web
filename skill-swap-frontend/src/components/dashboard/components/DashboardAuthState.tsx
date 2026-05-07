import { DASHBOARD_AUTH_REQUIRED_MESSAGE } from "../constants/dashboardMessages";

export function DashboardAuthState() {
  return (
    <div className="min-h-screen bg-background pt-20 lg:pt-24 flex items-center justify-center">
      <p className="text-muted-foreground">{DASHBOARD_AUTH_REQUIRED_MESSAGE}</p>
    </div>
  );
}

