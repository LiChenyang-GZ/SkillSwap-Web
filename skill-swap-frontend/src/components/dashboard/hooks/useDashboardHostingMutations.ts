import { useMemo, useState } from "react";
import { toast } from "sonner";
import { workshopMutationService } from "../../../shared/service/workshop/workshopMutationService";
import type { User } from "../../../types/user";
import type { Workshop } from "../../../types/workshop";
import {
  DASHBOARD_HIDE_FAILURE_MESSAGE,
  DASHBOARD_HIDE_SIGNIN_MESSAGE,
  DASHBOARD_HIDE_SUCCESS_MESSAGE,
} from "../constants/dashboardMessages";
import { isHostedByCurrentUser } from "../utils/dashboardWorkshopUtils";

interface UseDashboardHostingMutationsParams {
  getAuthToken: () => Promise<string | null>;
  user: User | null;
  workshops: Workshop[];
}

export function useDashboardHostingMutations({
  getAuthToken,
  user,
  workshops,
}: UseDashboardHostingMutationsParams) {
  const [dismissedHostedWorkshopIds, setDismissedHostedWorkshopIds] = useState<string[]>([]);
  const [hidingWorkshopIds, setHidingWorkshopIds] = useState<string[]>([]);

  const hostedWorkshopIds = useMemo(() => {
    return workshops.filter((workshop) => isHostedByCurrentUser(workshop, user)).map((workshop) => workshop.id);
  }, [user, workshops]);

  const hiddenHostedWorkshopIds = useMemo(() => {
    const currentHostingIds = new Set(hostedWorkshopIds);
    return dismissedHostedWorkshopIds.filter((id) => currentHostingIds.has(id));
  }, [dismissedHostedWorkshopIds, hostedWorkshopIds]);

  const hideHostedWorkshopFromView = async (workshopId: string) => {
    const token = await getAuthToken();
    if (!token) {
      toast.error(DASHBOARD_HIDE_SIGNIN_MESSAGE);
      return;
    }

    setHidingWorkshopIds((prev) => (prev.includes(workshopId) ? prev : [...prev, workshopId]));
    try {
      await workshopMutationService.hideHostingWorkshop(workshopId, token);
      setDismissedHostedWorkshopIds((prev) => (prev.includes(workshopId) ? prev : [...prev, workshopId]));
      toast.success(DASHBOARD_HIDE_SUCCESS_MESSAGE);
    } catch (error) {
      const message = error instanceof Error ? error.message : DASHBOARD_HIDE_FAILURE_MESSAGE;
      toast.error(message);
    } finally {
      setHidingWorkshopIds((prev) => prev.filter((id) => id !== workshopId));
    }
  };

  return {
    hiddenHostedWorkshopIds,
    hidingWorkshopIds,
    hideHostedWorkshopFromView,
  };
}
