import type { Workshop } from "../../../types/workshop";

export interface DashboardWorkshopView {
  allHostedWorkshops: Workshop[];
  upcomingWorkshops: Workshop[];
  attendedWorkshops: Workshop[];
  hostingWorkshops: Workshop[];
  sortedUpcomingWorkshops: Workshop[];
  sortedAttendedWorkshops: Workshop[];
  sortedHostingWorkshops: Workshop[];
}

