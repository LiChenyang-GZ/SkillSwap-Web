import { useEffect, useMemo, useState } from "react";
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
  const [upcomingPage, setUpcomingPage] = useState(1);
  const [attendedPage, setAttendedPage] = useState(1);
  const [hostingPage, setHostingPage] = useState(1);

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

  useEffect(() => {
    setUpcomingPage((page) => Math.min(page, upcomingTotalPages));
  }, [upcomingTotalPages]);

  useEffect(() => {
    setAttendedPage((page) => Math.min(page, attendedTotalPages));
  }, [attendedTotalPages]);

  useEffect(() => {
    setHostingPage((page) => Math.min(page, hostingTotalPages));
  }, [hostingTotalPages]);

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

