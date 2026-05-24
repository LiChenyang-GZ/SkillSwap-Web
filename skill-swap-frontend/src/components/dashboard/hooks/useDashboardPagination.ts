import { useMemo, useState } from "react";
import type { SetStateAction } from "react";
import type { Workshop } from "../../../types/workshop";
import { DASHBOARD_PAGE_SIZE } from "../constants/dashboardUiConstants";
import { paginateWorkshops, totalPages } from "../utils/dashboardWorkshopUtils";

interface UseDashboardPaginationParams {
  sortedUpcomingWorkshops: Workshop[];
  sortedAttendedWorkshops: Workshop[];
  sortedHostingWorkshops: Workshop[];
}

export function useDashboardPagination({
  sortedUpcomingWorkshops,
  sortedAttendedWorkshops,
  sortedHostingWorkshops,
}: UseDashboardPaginationParams) {
  const [requestedUpcomingPage, setRequestedUpcomingPage] = useState(1);
  const [requestedAttendedPage, setRequestedAttendedPage] = useState(1);
  const [requestedHostingPage, setRequestedHostingPage] = useState(1);

  const upcomingTotalPages = useMemo(
    () => totalPages(sortedUpcomingWorkshops.length, DASHBOARD_PAGE_SIZE),
    [sortedUpcomingWorkshops.length]
  );
  const attendedTotalPages = useMemo(
    () => totalPages(sortedAttendedWorkshops.length, DASHBOARD_PAGE_SIZE),
    [sortedAttendedWorkshops.length]
  );
  const hostingTotalPages = useMemo(
    () => totalPages(sortedHostingWorkshops.length, DASHBOARD_PAGE_SIZE),
    [sortedHostingWorkshops.length]
  );

  const upcomingPage = Math.min(requestedUpcomingPage, upcomingTotalPages);
  const attendedPage = Math.min(requestedAttendedPage, attendedTotalPages);
  const hostingPage = Math.min(requestedHostingPage, hostingTotalPages);

  const setUpcomingPage = (nextPage: SetStateAction<number>) => {
    setRequestedUpcomingPage((previous) => {
      const next = typeof nextPage === "function" ? nextPage(previous) : nextPage;
      return Math.max(1, next);
    });
  };

  const setAttendedPage = (nextPage: SetStateAction<number>) => {
    setRequestedAttendedPage((previous) => {
      const next = typeof nextPage === "function" ? nextPage(previous) : nextPage;
      return Math.max(1, next);
    });
  };

  const setHostingPage = (nextPage: SetStateAction<number>) => {
    setRequestedHostingPage((previous) => {
      const next = typeof nextPage === "function" ? nextPage(previous) : nextPage;
      return Math.max(1, next);
    });
  };

  const pagedUpcomingWorkshops = useMemo(() => {
    return paginateWorkshops(sortedUpcomingWorkshops, upcomingPage, DASHBOARD_PAGE_SIZE);
  }, [sortedUpcomingWorkshops, upcomingPage]);

  const pagedAttendedWorkshops = useMemo(() => {
    return paginateWorkshops(sortedAttendedWorkshops, attendedPage, DASHBOARD_PAGE_SIZE);
  }, [sortedAttendedWorkshops, attendedPage]);

  const pagedHostingWorkshops = useMemo(() => {
    return paginateWorkshops(sortedHostingWorkshops, hostingPage, DASHBOARD_PAGE_SIZE);
  }, [sortedHostingWorkshops, hostingPage]);

  return {
    upcomingPage,
    setUpcomingPage,
    attendedPage,
    setAttendedPage,
    hostingPage,
    setHostingPage,
    upcomingTotalPages,
    attendedTotalPages,
    hostingTotalPages,
    pagedUpcomingWorkshops,
    pagedAttendedWorkshops,
    pagedHostingWorkshops,
  };
}

