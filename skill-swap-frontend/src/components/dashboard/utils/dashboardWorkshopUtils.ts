import type { User } from "../../../types/user";
import type { Workshop } from "../../../types/workshop";
import type { HostingDisplayStatus, HostingStatusMeta } from "../models/dashboardStatusModel";
import type { DashboardWorkshopView } from "../models/dashboardViewModel";
import {
  isUserWorkshopVisible,
  normalizeAdminWorkshopStatus,
  resolveUserWorkshopStatus,
} from "../../workshop/utils/workshopStatusPublicApi";

export const parseWorkshopStartTime = (workshop: Workshop) => {
  const rawDate = String(workshop.date || "").trim();
  const rawTime = String(workshop.time || "").trim();

  if (!rawDate) {
    return null;
  }

  const datePart = rawDate.includes("T") ? rawDate.split("T")[0] : rawDate;
  const timePart = rawTime ? (rawTime.length === 5 ? `${rawTime}:00` : rawTime) : "00:00:00";
  const parsed = new Date(`${datePart}T${timePart}`);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
};

export const resolveHostingDisplayStatus = (workshop: Workshop): HostingDisplayStatus => {
  const adminStatus = normalizeAdminWorkshopStatus(workshop.status);

  if (
    adminStatus === "pending" ||
    adminStatus === "rejected" ||
    adminStatus === "cancelled" ||
    adminStatus === "completed"
  ) {
    return adminStatus;
  }

  const start = parseWorkshopStartTime(workshop);
  if (!start) {
    return "approved";
  }

  const durationMinutes = Number(workshop.duration);
  if (Number.isFinite(durationMinutes) && durationMinutes > 0) {
    const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
    if (new Date() >= end) {
      return "completed";
    }
  }

  const now = new Date();
  const isSameCalendarDay =
    now.getFullYear() === start.getFullYear() &&
    now.getMonth() === start.getMonth() &&
    now.getDate() === start.getDate();

  if (now > start && !isSameCalendarDay && (!Number.isFinite(durationMinutes) || durationMinutes <= 0)) {
    return "completed";
  }

  return "approved";
};

export const getHostingStatusMeta = (workshop: Workshop): HostingStatusMeta => {
  const status = resolveHostingDisplayStatus(workshop);

  if (status === "pending") {
    return { label: "Pending", variant: "secondary", removable: false };
  }
  if (status === "approved") {
    return { label: "Approved", variant: "default", removable: false };
  }
  if (status === "rejected") {
    return { label: "Rejected", variant: "destructive", removable: true };
  }
  if (status === "cancelled") {
    return { label: "Cancelled", variant: "destructive", removable: true };
  }

  return { label: "Completed", variant: "outline", removable: false };
};

export const dedupeWorkshopsById = (list: Workshop[]) => {
  const byId = new Map<string, Workshop>();
  list.forEach((workshop) => byId.set(workshop.id, workshop));
  return Array.from(byId.values());
};

export const getWorkshopStartMillis = (workshop: Workshop) => {
  const start = parseWorkshopStartTime(workshop);
  return start ? start.getTime() : Number.MAX_SAFE_INTEGER;
};

export const sortByStartAsc = (list: Workshop[]) => {
  return [...list].sort((a, b) => getWorkshopStartMillis(a) - getWorkshopStartMillis(b));
};

export const sortByStartDesc = (list: Workshop[]) => {
  return [...list].sort((a, b) => getWorkshopStartMillis(b) - getWorkshopStartMillis(a));
};

export const totalPages = (count: number, pageSize: number) => Math.max(1, Math.ceil(count / pageSize));

export const paginateWorkshops = (list: Workshop[], page: number, pageSize: number) => {
  const startIndex = (page - 1) * pageSize;
  return list.slice(startIndex, startIndex + pageSize);
};

export const isHostedByCurrentUser = (workshop: Workshop, user: User | null) => {
  if (!user) {
    return false;
  }
  return Boolean(workshop.facilitator?.id && String(workshop.facilitator.id) === String(user.id));
};

export const buildDashboardWorkshopView = (
  workshops: Workshop[],
  user: User | null,
  hiddenHostedWorkshopIds: string[]
): DashboardWorkshopView => {
  if (!user) {
    return {
      allHostedWorkshops: [],
      upcomingWorkshops: [],
      attendedWorkshops: [],
      hostingWorkshops: [],
      sortedUpcomingWorkshops: [],
      sortedAttendedWorkshops: [],
      sortedHostingWorkshops: [],
    };
  }

  const participantWorkshops = workshops
    .filter((w) => !isHostedByCurrentUser(w, user))
    .filter((w) => isUserWorkshopVisible(w));

  const participantUpcomingWorkshops = participantWorkshops.filter((w) => {
    const status = resolveUserWorkshopStatus(w);
    return status === "upcoming" || status === "ongoing";
  });

  const participantAttendedWorkshops = participantWorkshops.filter(
    (w) => resolveUserWorkshopStatus(w) === "completed"
  );

  const allHostedWorkshops = workshops.filter((w) => isHostedByCurrentUser(w, user));
  const hostedUpcomingWorkshops = allHostedWorkshops.filter((w) => resolveHostingDisplayStatus(w) === "approved");
  const hostedAttendedWorkshops = allHostedWorkshops.filter((w) => resolveHostingDisplayStatus(w) === "completed");

  const upcomingWorkshops = dedupeWorkshopsById([...participantUpcomingWorkshops, ...hostedUpcomingWorkshops]);
  const attendedWorkshops = dedupeWorkshopsById([...participantAttendedWorkshops, ...hostedAttendedWorkshops]);
  const hostingWorkshops = allHostedWorkshops.filter(
    (w) => !Boolean(w.hiddenByHost) && !hiddenHostedWorkshopIds.includes(w.id)
  );

  return {
    allHostedWorkshops,
    upcomingWorkshops,
    attendedWorkshops,
    hostingWorkshops,
    sortedUpcomingWorkshops: sortByStartAsc(upcomingWorkshops),
    sortedAttendedWorkshops: sortByStartDesc(attendedWorkshops),
    sortedHostingWorkshops: sortByStartDesc(hostingWorkshops),
  };
};

