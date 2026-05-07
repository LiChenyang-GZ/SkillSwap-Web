import { useEffect, useMemo, useState } from "react";
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
  sessionToken: string | null;
  user: User | null;
  workshops: Workshop[];
}

export function useDashboardHostingMutations({
  sessionToken,
  user,
  workshops,
}: UseDashboardHostingMutationsParams) {
  const [hiddenHostedWorkshopIds, setHiddenHostedWorkshopIds] = useState<string[]>([]);
  const [hidingWorkshopIds, setHidingWorkshopIds] = useState<string[]>([]);

  const hostedWorkshopIds = useMemo(() => {
    return workshops.filter((workshop) => isHostedByCurrentUser(workshop, user)).map((workshop) => workshop.id);
  }, [user, workshops]);

  useEffect(() => {
    const currentHostingIds = new Set(hostedWorkshopIds);
    setHiddenHostedWorkshopIds((prev) => {
      const next = prev.filter((id) => currentHostingIds.has(id));
      const unchanged = next.length === prev.length && next.every((id, index) => id === prev[index]);
      return unchanged ? prev : next;
    });
  }, [hostedWorkshopIds]);

  const hideHostedWorkshopFromView = async (workshopId: string) => {
    if (!sessionToken) {
      toast.error(DASHBOARD_HIDE_SIGNIN_MESSAGE);
      return;
    }

    setHidingWorkshopIds((prev) => (prev.includes(workshopId) ? prev : [...prev, workshopId]));
    try {
      await workshopMutationService.hideHostingWorkshop(workshopId, sessionToken);
      setHiddenHostedWorkshopIds((prev) => (prev.includes(workshopId) ? prev : [...prev, workshopId]));
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
