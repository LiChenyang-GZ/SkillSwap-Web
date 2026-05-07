import { useMemo } from "react";
import type { User } from "../../../types/user";
import type { Workshop } from "../../../types/workshop";
import { buildDashboardWorkshopView } from "../utils/dashboardWorkshopUtils";

interface UseDashboardWorkshopViewParams {
  user: User | null;
  workshops: Workshop[];
  hiddenHostedWorkshopIds: string[];
}

export function useDashboardWorkshopView({
  user,
  workshops,
  hiddenHostedWorkshopIds,
}: UseDashboardWorkshopViewParams) {
  return useMemo(() => {
    return buildDashboardWorkshopView(workshops, user, hiddenHostedWorkshopIds);
  }, [hiddenHostedWorkshopIds, user, workshops]);
}

