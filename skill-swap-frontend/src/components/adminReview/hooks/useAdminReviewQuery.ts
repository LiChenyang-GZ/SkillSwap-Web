import { useCallback, useEffect, useRef, useState } from 'react';
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
  isAuthenticated: boolean;
  getAuthToken: () => Promise<string | null>;
}

const readStoredTargetWorkshopId = () => {
  const storedTarget = sessionStorage.getItem(ADMIN_REVIEW_TARGET_WORKSHOP_STORAGE_KEY);
  const trimmedTarget = storedTarget?.trim();
  return trimmedTarget || null;
};

const normalizeWorkshopId = (workshopId: string | null | undefined) => {
  const normalized = String(workshopId || '').trim();
  const mockIdMatch = /^workshop-(\d+)$/.exec(normalized);
  return mockIdMatch ? mockIdMatch[1] : normalized;
};

const isMatchingWorkshopId = (workshopId: string, targetWorkshopId: string | null) =>
  normalizeWorkshopId(workshopId) === normalizeWorkshopId(targetWorkshopId);

const getErrorStatus = (error: unknown) => (error as { status?: number })?.status;

export function useAdminReviewQuery({ isAuthenticated, getAuthToken }: UseAdminReviewQueryParams) {
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [selectedIdState, setSelectedIdState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [loadedDetailIds, setLoadedDetailIdsState] = useState<Record<string, boolean>>({});
  const [detailLoadErrors, setDetailLoadErrors] = useState<Record<string, string | undefined>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusFilter, setStatusFilterState] = useState<AdminReviewStatusFilter>(() =>
    readStoredTargetWorkshopId() ? 'all' : ADMIN_REVIEW_DEFAULT_STATUS_FILTER
  );
  const [requestedPage, setRequestedPage] = useState(1);
  const [targetWorkshopId, setTargetWorkshopIdState] = useState<string | null>(() => readStoredTargetWorkshopId());

  const detailInFlightRef = useRef<Set<string>>(new Set());
  const selectedIdRef = useRef<string | null>(selectedIdState);
  const targetWorkshopIdRef = useRef<string | null>(targetWorkshopId);
  const loadedDetailIdsRef = useRef<Record<string, boolean>>({});
  const statusFilterRef = useRef<AdminReviewStatusFilter>(statusFilter);
  const hasSession = isAuthenticated;

  const setSelectedIdValue = useCallback((workshopId: string | null) => {
    selectedIdRef.current = workshopId;
    setSelectedIdState(workshopId);
  }, []);

  const setTargetWorkshopId = useCallback((workshopId: string | null) => {
    targetWorkshopIdRef.current = workshopId;
    setTargetWorkshopIdState(workshopId);
  }, []);

  const setLoadedDetailIds = useCallback((nextLoadedDetailIds: Record<string, boolean>) => {
    loadedDetailIdsRef.current = nextLoadedDetailIds;
    setLoadedDetailIdsState(nextLoadedDetailIds);
  }, []);

  const filteredWorkshops =
    statusFilter === 'all'
      ? workshops
      : workshops.filter((workshop) => resolveAdminDisplayStatus(workshop) === statusFilter);

  const sortedWorkshops = filteredWorkshops.toSorted((a, b) => {
    const aTime = new Date(`${a.date || '0000-01-01'}T${a.time || '00:00'}`).getTime();
    const bTime = new Date(`${b.date || '0000-01-01'}T${b.time || '00:00'}`).getTime();
    return bTime - aTime;
  });

  const totalPages = Math.max(1, Math.ceil(sortedWorkshops.length / ADMIN_REVIEW_PAGE_SIZE));
  const currentPage = Math.min(requestedPage, totalPages);
  const selectedId =
    selectedIdState && sortedWorkshops.some((workshop) => workshop.id === selectedIdState)
      ? selectedIdState
      : targetWorkshopId
        ? null
        : sortedWorkshops[0]?.id ?? null;

  selectedIdRef.current = selectedId;
  targetWorkshopIdRef.current = targetWorkshopId;
  loadedDetailIdsRef.current = loadedDetailIds;
  statusFilterRef.current = statusFilter;

  const start = (currentPage - 1) * ADMIN_REVIEW_PAGE_SIZE;
  const pagedWorkshops = sortedWorkshops.slice(start, start + ADMIN_REVIEW_PAGE_SIZE);
  const selectedWorkshop = sortedWorkshops.find((workshop) => workshop.id === selectedId) || null;
  const selectedHasDetail = selectedWorkshop ? !!loadedDetailIds[selectedWorkshop.id] : false;
  const selectedDetailError = selectedWorkshop ? detailLoadErrors[selectedWorkshop.id] ?? null : null;

  const loadWorkshopDetail = useCallback(async (workshopId: string, force = false) => {
    if (!isAuthenticated || !workshopId) return;
    if (!force && loadedDetailIdsRef.current[workshopId]) return;
    if (detailInFlightRef.current.has(workshopId)) return;

    detailInFlightRef.current.add(workshopId);
    setDetailLoadErrors((prev) => ({ ...prev, [workshopId]: undefined }));
    setIsDetailLoading(true);

    try {
      const token = await getAuthToken();
      if (!token) throw new Error('Authentication token unavailable');
      const detail = await adminWorkshopService.getById(workshopId, token);
      if (!detail || typeof detail.id !== 'string' || detail.id.length === 0 || detail.id !== workshopId) {
        throw new Error('Workshop detail response is invalid.');
      }
      setWorkshops((prev) => prev.map((workshop) => (workshop.id === detail.id ? { ...workshop, ...detail } : workshop)));
      setLoadedDetailIds({ ...loadedDetailIdsRef.current, [workshopId]: true });
    } catch (error) {
      console.error('Failed to load workshop details:', error);
      setDetailLoadErrors((prev) => ({ ...prev, [workshopId]: 'Failed to load workshop details.' }));
      toast.error('Failed to load workshop details.');
    } finally {
      detailInFlightRef.current.delete(workshopId);
      setIsDetailLoading(false);
    }
  }, [getAuthToken, isAuthenticated, setLoadedDetailIds]);

  const loadWorkshops = useCallback(async (mode: 'pending' | 'all') => {
    if (!isAuthenticated) {
      setErrorMessage('Please sign in to review workshops.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const token = await getAuthToken();
      if (!token) throw new Error('Authentication token unavailable');
      const data =
        mode === 'pending'
          ? await adminWorkshopService.getPending(token)
          : await adminWorkshopService.getAll(token);
      let nextWorkshops = data;
      let targetDetail: Workshop | null = null;
      const currentTargetWorkshopId = targetWorkshopIdRef.current;
      const currentSelectedId = selectedIdRef.current;

      if (currentTargetWorkshopId && !data.some((workshop) => isMatchingWorkshopId(workshop.id, currentTargetWorkshopId))) {
        try {
          targetDetail = await adminWorkshopService.getById(currentTargetWorkshopId, token);
          nextWorkshops = [
            targetDetail,
            ...data.filter((workshop) => !isMatchingWorkshopId(workshop.id, targetDetail?.id || null)),
          ];
        } catch (targetError) {
          if (getErrorStatus(targetError) !== 404) {
            throw targetError;
          }
          console.warn('Failed to load target workshop from notification:', targetError);
        }
      }

      const nextLoadedDetailIds: Record<string, boolean> = {};
      nextWorkshops.forEach((workshop) => {
        if (loadedDetailIdsRef.current[workshop.id]) {
          nextLoadedDetailIds[workshop.id] = true;
        }
      });
      if (targetDetail) {
        nextLoadedDetailIds[targetDetail.id] = true;
      }
      setLoadedDetailIds(nextLoadedDetailIds);
      setDetailLoadErrors((previous) => {
        const next: Record<string, string | undefined> = {};
        nextWorkshops.forEach((workshop) => {
          if (previous[workshop.id]) {
            next[workshop.id] = previous[workshop.id];
          }
        });
        return next;
      });
      setWorkshops(nextWorkshops);

      const targetWorkshop = currentTargetWorkshopId
        ? nextWorkshops.find((workshop) => isMatchingWorkshopId(workshop.id, currentTargetWorkshopId))
        : null;

      if (currentTargetWorkshopId && !targetWorkshop) {
        setSelectedIdValue(null);
        setErrorMessage('The workshop from this notification could not be found. It may have been deleted.');
      } else if (nextWorkshops.length > 0) {
        const fallbackId = nextWorkshops[0].id;
        const nextSelectedId =
          targetWorkshop
            ? targetWorkshop.id
            : currentSelectedId && nextWorkshops.some((workshop) => workshop.id === currentSelectedId)
              ? currentSelectedId
              : fallbackId;

        setSelectedIdValue(nextSelectedId);
        if (targetDetail && nextSelectedId === targetDetail.id) {
          setWorkshops((prev) => prev.map((workshop) => (workshop.id === targetDetail.id ? { ...workshop, ...targetDetail } : workshop)));
        } else {
          void loadWorkshopDetail(nextSelectedId);
        }
      } else {
        setSelectedIdValue(null);
      }
    } catch (error) {
      console.error('Failed to load admin workshops:', error);
      const status = getErrorStatus(error);
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
  }, [getAuthToken, isAuthenticated, loadWorkshopDetail, setLoadedDetailIds, setSelectedIdValue]);

  const setStatusFilter = useCallback((nextStatusFilter: AdminReviewStatusFilter) => {
    setStatusFilterState(nextStatusFilter);
    setRequestedPage(1);
    if (hasSession) {
      const mode = nextStatusFilter === 'pending' ? 'pending' : 'all';
      void loadWorkshops(mode);
    }
  }, [hasSession, loadWorkshops]);

  const selectWorkshop = useCallback((workshopId: string | null) => {
    setTargetWorkshopId(null);
    setSelectedIdValue(workshopId);
    if (workshopId) {
      void loadWorkshopDetail(workshopId);
    }
  }, [loadWorkshopDetail, setSelectedIdValue, setTargetWorkshopId]);

  const refreshWorkshops = useCallback(() => {
    const mode = statusFilter === 'pending' ? 'pending' : 'all';
    void loadWorkshops(mode);
  }, [loadWorkshops, statusFilter]);

  useEffect(() => {
    if (!hasSession) {
      setWorkshops([]);
      setSelectedIdValue(null);
      setLoadedDetailIds({});
      setDetailLoadErrors({});
      setErrorMessage(null);
    }
  }, [hasSession, setLoadedDetailIds, setSelectedIdValue]);

  useEffect(() => {
    if (targetWorkshopId) {
      sessionStorage.removeItem(ADMIN_REVIEW_TARGET_WORKSHOP_STORAGE_KEY);
    }
  }, [targetWorkshopId]);

  useEffect(() => {
    if (!hasSession) {
      return;
    }
    const mode = statusFilterRef.current === 'pending' ? 'pending' : 'all';
    void loadWorkshops(mode);
  }, [hasSession, loadWorkshops]);

  useEffect(() => {
    if (!hasSession || !selectedId) {
      return;
    }
    // The selected id is derived from the current list, so list changes can select
    // a new workshop without going through selectWorkshop.
    void loadWorkshopDetail(selectedId);
  }, [hasSession, selectedId, loadWorkshopDetail]);

  useEffect(() => {
    if (!targetWorkshopId || sortedWorkshops.length === 0) return;

    const targetIndex = sortedWorkshops.findIndex((workshop) => isMatchingWorkshopId(workshop.id, targetWorkshopId));
    if (targetIndex === -1) return;

    const targetId = sortedWorkshops[targetIndex].id;
    setSelectedIdValue(targetId);
    setRequestedPage(Math.floor(targetIndex / ADMIN_REVIEW_PAGE_SIZE) + 1);
    setTargetWorkshopId(null);

    requestAnimationFrame(() => {
      const targetElement = document.querySelector(`[data-workshop-id="${targetId}"]`);
      if (targetElement instanceof HTMLElement) {
        targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
  }, [sortedWorkshops, targetWorkshopId, setSelectedIdValue, setTargetWorkshopId]);

  return {
    workshops,
    setWorkshops,
    selectedId,
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
    setSelectedId: selectWorkshop,
    goToPrevPage: () => setRequestedPage((prev) => Math.max(1, prev - 1)),
    goToNextPage: () => setRequestedPage((prev) => Math.min(totalPages, prev + 1)),
  };
}
