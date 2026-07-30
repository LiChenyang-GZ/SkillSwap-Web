import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { useCreateWorkshopAction } from "../shared/hooks/workshop/useCreateWorkshopAction";
import { workshopMutationService } from "../shared/service/workshop/workshopMutationService";
import { workshopQueryService } from "../shared/service/workshop/workshopQueryService";
import type { User } from "../types/user";
import type { Workshop } from "../types/workshop";
import type { GetAuthToken, RefreshDataMode } from "./appContextTypes";
import { resolveRefreshModeByPage } from "./appRoutes";

interface UseWorkshopStateParams {
  currentPage: string;
  getAuthToken: GetAuthToken;
  isAuthenticated: boolean;
  user: User | null;
}

const findLoadedWorkshop = (workshops: Workshop[], workshopId: string) => {
  let workshop = workshops.find((item) => item.id === workshopId);

  if (!workshop && !Number.isNaN(Number(workshopId))) {
    const numericWorkshopId = Number(workshopId);
    workshop = workshops.find(
      (item) => String(item.id) === String(numericWorkshopId) || Number(item.id) === numericWorkshopId
    );
  }

  return workshop;
};

export const useWorkshopState = ({
  currentPage,
  getAuthToken,
  isAuthenticated,
  user,
}: UseWorkshopStateParams) => {
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const refreshInFlightRef = useRef<{ mode: RefreshDataMode; task: Promise<void> } | null>(null);
  const workshopGenerationRef = useRef(0);

  const createWorkshop = useCreateWorkshopAction({
    isAuthenticated,
    user,
    getAuthToken,
  });

  const invalidateWorkshopRequests = useCallback(() => {
    workshopGenerationRef.current += 1;
    refreshInFlightRef.current = null;
  }, []);

  const clearWorkshopList = useCallback(() => {
    invalidateWorkshopRequests();
    setWorkshops([]);
  }, [invalidateWorkshopRequests]);

  const resetWorkshopState = useCallback(() => {
    invalidateWorkshopRequests();
    setWorkshops([]);
  }, [invalidateWorkshopRequests]);

  const fetchVisibleWorkshops = useCallback(async () => {
    if (isAuthenticated) {
      const token = await getAuthToken();
      // No token (Clerk session momentarily unavailable): skip the auth-only
      // endpoints and fall back to public results instead of calling them
      // unauthenticated.
      if (token) {
        const [publicWorkshops, myWorkshops, attendingWorkshops] = await Promise.all([
          workshopQueryService.getPublic(),
          workshopQueryService.getMine(token),
          workshopQueryService.getAttending(token),
        ]);
        const merged = new Map<string, Workshop>();
        [...publicWorkshops, ...myWorkshops, ...attendingWorkshops].forEach((workshop) => {
          merged.set(workshop.id, workshop);
        });
        return Array.from(merged.values());
      }
    }

    return workshopQueryService.getPublic();
  }, [isAuthenticated, getAuthToken]);

  const fetchPublicWorkshops = useCallback(async () => {
    return workshopQueryService.getPublic();
  }, []);

  const fetchMineWorkshops = useCallback(async () => {
    if (!isAuthenticated) {
      return [];
    }
    const token = await getAuthToken();
    if (!token) {
      return [];
    }
    return workshopQueryService.getMine(token);
  }, [isAuthenticated, getAuthToken]);

  const fetchDashboardWorkshops = useCallback(async () => {
    if (!isAuthenticated) {
      return [];
    }

    const token = await getAuthToken();
    if (!token) {
      return [];
    }
    const [myWorkshops, attendingWorkshops] = await Promise.all([
      workshopQueryService.getMine(token),
      workshopQueryService.getAttending(token),
    ]);

    const merged = new Map<string, Workshop>();
    [...myWorkshops, ...attendingWorkshops].forEach((workshop) => {
      merged.set(workshop.id, workshop);
    });
    return Array.from(merged.values());
  }, [isAuthenticated, getAuthToken]);

  const refreshData = useCallback(async (mode: RefreshDataMode = "full") => {
    if (refreshInFlightRef.current && refreshInFlightRef.current.mode === mode) {
      return refreshInFlightRef.current.task;
    }

    const requestGeneration = workshopGenerationRef.current;
    const task = (async () => {
      try {
        let backendWorkshops: Workshop[];
        if (mode === "public") {
          backendWorkshops = await fetchPublicWorkshops();
        } else if (mode === "mine") {
          backendWorkshops = await fetchMineWorkshops();
        } else if (mode === "dashboard") {
          backendWorkshops = await fetchDashboardWorkshops();
        } else {
          backendWorkshops = await fetchVisibleWorkshops();
        }
        if (requestGeneration !== workshopGenerationRef.current) return;
        setWorkshops(backendWorkshops);
      } catch (err) {
        if (requestGeneration === workshopGenerationRef.current) {
          console.warn("⚠️ Failed to fetch workshops", err);
        }
      }
    })();

    refreshInFlightRef.current = { mode, task };
    try {
      await task;
    } finally {
      if (refreshInFlightRef.current?.task === task) {
        refreshInFlightRef.current = null;
      }
    }
  }, [fetchDashboardWorkshops, fetchMineWorkshops, fetchPublicWorkshops, fetchVisibleWorkshops]);

  const upsertWorkshop = useCallback((workshop: Workshop) => {
    setWorkshops((prev) => {
      const index = prev.findIndex((item) => item.id === workshop.id);
      if (index === -1) {
        return [workshop, ...prev];
      }
      const next = [...prev];
      next[index] = workshop;
      return next;
    });
  }, []);

  const attendWorkshop = useCallback(
    async (workshopId: string) => {
      if (!isAuthenticated || !user) {
        toast.error("Please sign in to attend workshops");
        return;
      }

      try {
        const workshop = findLoadedWorkshop(workshops, workshopId);

        if (!workshop) {
          throw new Error(`Workshop with ID "${workshopId}" not found in loaded workshops`);
        }

        const token = await getAuthToken();
        if (!token) {
          toast.error("Your session expired. Please sign in again.");
          return;
        }
        await workshopMutationService.join(workshopId, token);

        toast.success(`Joined "${workshop.title}"!`);

        // 成功后后台刷新，避免 toast 被全量拉取阻塞。
        setTimeout(() => {
          void refreshData(resolveRefreshModeByPage(currentPage));
        }, 0);
      } catch (error) {
        console.error("Failed to join workshop:", error);
        const message = error instanceof Error ? error.message : "Unknown error";
        const alreadyParticipant = message.toLowerCase().includes("already a participant");

        if (alreadyParticipant) {
          // 若后端返回“已参加”，将其视为幂等成功并后台刷新列表。
          void refreshData(resolveRefreshModeByPage(currentPage));
          toast.success("You are already attending this workshop.");
          return;
        }

        toast.error("Failed to join workshop: " + message);
      }
    },
    [currentPage, getAuthToken, isAuthenticated, refreshData, user, workshops]
  );

  const cancelWorkshopAttendance = useCallback(
    async (workshopId: string) => {
      if (!isAuthenticated || !user) return;

      try {
        const workshop = findLoadedWorkshop(workshops, workshopId);
        if (!workshop) {
          throw new Error("Workshop not found");
        }

        const token = await getAuthToken();
        if (!token) {
          toast.error("Your session expired. Please sign in again.");
          return;
        }
        await workshopMutationService.leave(workshopId, token);

        toast.success("Workshop attendance cancelled");

        // 后台刷新，避免操作反馈被阻塞。
        setTimeout(() => {
          void refreshData(resolveRefreshModeByPage(currentPage));
        }, 0);
      } catch (error) {
        console.error("Failed to leave workshop:", error);
        toast.error("Failed to leave workshop: " + (error instanceof Error ? error.message : "Unknown error"));
      }
    },
    [currentPage, getAuthToken, isAuthenticated, refreshData, user, workshops]
  );

  const deleteWorkshop = useCallback(
    async (workshopId: string) => {
      if (!isAuthenticated || !user) {
        toast.error("Please sign in to delete workshops");
        return;
      }

      try {
        const token = await getAuthToken();
        if (!token) {
          toast.error("Your session expired. Please sign in again.");
          return;
        }
        await workshopMutationService.delete(workshopId, token);

        // 删除成功后，从本地状态中移除该 workshop（处理 ID 类型不一致）
        setWorkshops((prev) =>
          prev.filter((workshop) => String(workshop.id) !== String(workshopId))
        );

        toast.success("Workshop deleted successfully!");
      } catch (error) {
        console.error("Failed to delete workshop:", error);
        toast.error("Failed to delete workshop: " + (error instanceof Error ? error.message : "Unknown error"));
        throw error;
      }
    },
    [getAuthToken, isAuthenticated, user]
  );

  return {
    attendWorkshop,
    cancelWorkshopAttendance,
    clearWorkshopList,
    createWorkshop,
    deleteWorkshop,
    refreshData,
    resetWorkshopState,
    upsertWorkshop,
    workshops,
  };
};
