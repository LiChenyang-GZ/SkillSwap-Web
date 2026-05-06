import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import type { Workshop } from '../../../types/workshop';
import { adminWorkshopService } from '../../../shared/service/workshop/adminWorkshopService';
import { AdminReviewStatusFilter } from '../models/adminReviewStatusModel';
import {
  ADMIN_REVIEW_DEFAULT_STATUS_FILTER,
} from '../constants/adminReviewStatusConstants';
import {
  ADMIN_REVIEW_PAGE_SIZE,
  ADMIN_REVIEW_TARGET_WORKSHOP_STORAGE_KEY,
} from '../constants/adminReviewUiConstants';
import { resolveAdminDisplayStatus } from '../utils/adminReviewUtils';

interface UseAdminReviewQueryParams {
  sessionToken: string | null;
  withAuthRetry: <T>(action: (token: string) => Promise<T>) => Promise<T>;
}

export function useAdminReviewQuery({ sessionToken, withAuthRetry }: UseAdminReviewQueryParams) {
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [loadedDetailIds, setLoadedDetailIds] = useState<Record<string, boolean>>({});
  const [detailLoadErrors, setDetailLoadErrors] = useState<Record<string, string | undefined>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<AdminReviewStatusFilter>(ADMIN_REVIEW_DEFAULT_STATUS_FILTER);
  const [currentPage, setCurrentPageState] = useState(1);
  const [targetWorkshopId, setTargetWorkshopId] = useState<string | null>(() => {
    const storedTarget = sessionStorage.getItem(ADMIN_REVIEW_TARGET_WORKSHOP_STORAGE_KEY);
    if (storedTarget) {
      sessionStorage.removeItem(ADMIN_REVIEW_TARGET_WORKSHOP_STORAGE_KEY);
      return storedTarget;
    }
    return null;
  });

  const detailInFlightRef = useRef<Set<string>>(new Set());
  const hasSession = Boolean(sessionToken);
  const pageSize = ADMIN_REVIEW_PAGE_SIZE;

  const filteredWorkshops =
    statusFilter === 'all'
      ? workshops
      : workshops.filter((workshop) => resolveAdminDisplayStatus(workshop) === statusFilter);

  const sortedWorkshops = [...filteredWorkshops].sort((a, b) => {
    const aTime = new Date(`${a.date || '0000-01-01'}T${a.time || '00:00'}`).getTime();
    const bTime = new Date(`${b.date || '0000-01-01'}T${b.time || '00:00'}`).getTime();
    return bTime - aTime;
  });

  const totalPages = Math.max(1, Math.ceil(sortedWorkshops.length / pageSize));
  const start = (currentPage - 1) * pageSize;
  const pagedWorkshops = sortedWorkshops.slice(start, start + pageSize);
  const selectedWorkshop = sortedWorkshops.find((workshop) => workshop.id === selectedId) || null;
  const selectedHasDetail = selectedWorkshop ? !!loadedDetailIds[selectedWorkshop.id] : false;
  const selectedDetailError = selectedWorkshop ? detailLoadErrors[selectedWorkshop.id] ?? null : null;

  const loadWorkshopDetail = async (workshopId: string, force = false) => {
    if (!sessionToken || !workshopId) return;
    if (!force && loadedDetailIds[workshopId]) return;
    if (detailInFlightRef.current.has(workshopId)) return;

    detailInFlightRef.current.add(workshopId);
    setDetailLoadErrors((prev) => ({ ...prev, [workshopId]: undefined }));
    setIsDetailLoading(true);

    try {
      const detail = await withAuthRetry((token) => adminWorkshopService.getById(workshopId, token));
      if (!detail || typeof detail.id !== 'string' || detail.id.length === 0 || detail.id !== workshopId) {
        throw new Error('Workshop detail response is invalid.');
      }
      setWorkshops((prev) => prev.map((workshop) => (workshop.id === detail.id ? { ...workshop, ...detail } : workshop)));
      setLoadedDetailIds((prev) => ({ ...prev, [workshopId]: true }));
    } catch (error) {
      console.error('Failed to load workshop details:', error);
      setDetailLoadErrors((prev) => ({ ...prev, [workshopId]: 'Failed to load workshop details.' }));
      toast.error('Failed to load workshop details.');
    } finally {
      detailInFlightRef.current.delete(workshopId);
      setIsDetailLoading(false);
    }
  };

  const loadWorkshops = async (mode: 'pending' | 'all') => {
    if (!sessionToken) {
      setErrorMessage('Please sign in to review workshops.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const data =
        mode === 'pending'
          ? await withAuthRetry((token) => adminWorkshopService.getPending(token))
          : await withAuthRetry((token) => adminWorkshopService.getAll(token));

      setLoadedDetailIds((previous) => {
        const next: Record<string, boolean> = {};
        data.forEach((workshop) => {
          if (previous[workshop.id]) {
            next[workshop.id] = true;
          }
        });
        return next;
      });
      setDetailLoadErrors((previous) => {
        const next: Record<string, string | undefined> = {};
        data.forEach((workshop) => {
          if (previous[workshop.id]) {
            next[workshop.id] = previous[workshop.id];
          }
        });
        return next;
      });
      setWorkshops(data);

      if (data.length > 0) {
        const fallbackId = data[0].id;
        const nextSelectedId =
          targetWorkshopId && data.some((workshop) => workshop.id === targetWorkshopId)
            ? targetWorkshopId
            : selectedId && data.some((workshop) => workshop.id === selectedId)
              ? selectedId
              : fallbackId;

        setSelectedId(nextSelectedId);
        void loadWorkshopDetail(nextSelectedId);
      } else {
        setSelectedId(null);
      }
    } catch (error) {
      console.error('Failed to load admin workshops:', error);
      const status = (error as Error & { status?: number }).status;
      if (status === 401) {
        setErrorMessage('Session expired. Please sign in again.');
      } else if (status === 403) {
        setErrorMessage('Admin access required.');
      } else if (status === 404) {
        setErrorMessage('Workshop data not found.');
      } else {
        setErrorMessage('Failed to load workshops. Please try again.');
      }
      setWorkshops([]);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshWorkshops = () => {
    const mode = statusFilter === 'pending' ? 'pending' : 'all';
    void loadWorkshops(mode);
  };

  useEffect(() => {
    if (!hasSession) {
      setWorkshops([]);
      setSelectedId(null);
      setLoadedDetailIds({});
      setDetailLoadErrors({});
      setErrorMessage(null);
    }
  }, [hasSession]);

  useEffect(() => {
    if (!hasSession) {
      return;
    }
    const mode = statusFilter === 'pending' ? 'pending' : 'all';
    void loadWorkshops(mode);
  }, [hasSession, statusFilter]);

  useEffect(() => {
    if (!selectedId) return;
    void loadWorkshopDetail(selectedId);
  }, [selectedId, sessionToken]);

  useEffect(() => {
    if (sortedWorkshops.length === 0) {
      setSelectedId(null);
      return;
    }
    const stillExists = sortedWorkshops.some((workshop) => workshop.id === selectedId);
    if (!stillExists) {
      setSelectedId(sortedWorkshops[0].id);
    }
  }, [sortedWorkshops, selectedId]);

  useEffect(() => {
    setCurrentPageState(1);
  }, [statusFilter]);

  useEffect(() => {
    if (!targetWorkshopId || sortedWorkshops.length === 0) return;

    const targetIndex = sortedWorkshops.findIndex((workshop) => workshop.id === targetWorkshopId);
    if (targetIndex === -1) return;

    setSelectedId(targetWorkshopId);
    setCurrentPageState(Math.floor(targetIndex / pageSize) + 1);
    setTargetWorkshopId(null);

    requestAnimationFrame(() => {
      const targetElement = document.querySelector(`[data-workshop-id="${targetWorkshopId}"]`);
      if (targetElement instanceof HTMLElement) {
        targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
  }, [sortedWorkshops, targetWorkshopId]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPageState(totalPages);
    }
  }, [currentPage, totalPages]);

  return {
    workshops,
    setWorkshops,
    selectedId,
    setSelectedId,
    isLoading,
    isDetailLoading,
    errorMessage,
    statusFilter,
    setStatusFilter,
    currentPage,
    totalPages,
    pagedWorkshops,
    sortedWorkshops,
    selectedWorkshop,
    selectedHasDetail,
    selectedDetailError,
    refreshWorkshops,
    loadWorkshopDetail,
    goToPrevPage: () => setCurrentPageState((prev) => Math.max(1, prev - 1)),
    goToNextPage: () => setCurrentPageState((prev) => Math.min(totalPages, prev + 1)),
  };
}
