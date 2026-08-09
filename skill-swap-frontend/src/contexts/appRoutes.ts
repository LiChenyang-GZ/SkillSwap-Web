import {
  ADMIN_MEMORY_PAGE_ID,
  ADMIN_MEMORY_PATH,
  MEMORY_ENTRY_PAGE_PREFIX,
  MEMORY_PAGE_ID,
  MEMORY_PATH,
} from "../components/memory/constants/memoryRouteConstants";
import { pageFromMemoryPath, pathFromMemoryPage } from "../components/memory/utils/memoryRoute";
import type { RefreshDataMode } from "./appContextTypes";

export const WORKSHOP_PAGE_PREFIX = "workshop-";
const WORKSHOP_PATH_PREFIX = "/workshops/";

interface RouteDefinition {
  path: string;
  isPublic?: boolean;
  adminOnly?: boolean;
}

const ROUTES: Record<string, RouteDefinition> = {
  hero: { path: "/", isPublic: true },
  explore: { path: "/explore", isPublic: true },
  campuses: { path: "/campuses", isPublic: true },
  create: { path: "/create" },
  dashboard: { path: "/dashboard" },
  [MEMORY_PAGE_ID]: { path: MEMORY_PATH, isPublic: true },
  [ADMIN_MEMORY_PAGE_ID]: { path: ADMIN_MEMORY_PATH, adminOnly: true },
  notifications: { path: "/notifications" },
  adminReview: { path: "/admin/workshops", adminOnly: true },
  auth: { path: "/auth", isPublic: true },
  onboarding: { path: "/onboarding" },
};

const PATH_TO_PAGE: Record<string, string> = Object.fromEntries(
  Object.entries(ROUTES).map(([page, route]) => [route.path, page])
);

const PUBLIC_PAGE_PREFIXES = [WORKSHOP_PAGE_PREFIX, MEMORY_ENTRY_PAGE_PREFIX];

export const normalizePath = (pathname: string) => {
  if (!pathname) return "/";
  const trimmed = pathname.trim();
  if (!trimmed || trimmed === "/") return "/";
  return trimmed.endsWith("/") ? trimmed.slice(0, -1) : trimmed;
};

export const pageFromPath = (pathname: string) => {
  const normalizedPath = normalizePath(pathname);
  if (normalizedPath.startsWith(WORKSHOP_PATH_PREFIX)) {
    const workshopId = decodeURIComponent(normalizedPath.slice(WORKSHOP_PATH_PREFIX.length));
    return workshopId ? `${WORKSHOP_PAGE_PREFIX}${workshopId}` : "explore";
  }
  const memoryPage = pageFromMemoryPath(normalizedPath);
  if (memoryPage) {
    return memoryPage;
  }
  return PATH_TO_PAGE[normalizedPath] || "explore";
};

export const pathFromPage = (page: string) => {
  if (page.startsWith(WORKSHOP_PAGE_PREFIX)) {
    const workshopId = page.slice(WORKSHOP_PAGE_PREFIX.length);
    return `${WORKSHOP_PATH_PREFIX}${encodeURIComponent(workshopId)}`;
  }
  const memoryPath = pathFromMemoryPage(page);
  if (memoryPath) {
    return memoryPath;
  }
  return ROUTES[page]?.path || "/explore";
};

export const isPublicPage = (page: string) =>
  ROUTES[page]?.isPublic === true ||
  PUBLIC_PAGE_PREFIXES.some((prefix) => page.startsWith(prefix));

export const isAdminOnlyPage = (page: string) => ROUTES[page]?.adminOnly === true;

export const resolvePostLoginPage = () => {
  const requestedPage = pageFromPath(window.location.pathname);
  if (requestedPage === "hero" || requestedPage === "auth") {
    return "explore";
  }
  return requestedPage;
};

export const resolveRefreshModeByPage = (page: string): RefreshDataMode => {
  if (page === "explore") {
    return "public";
  }
  if (page === "dashboard") {
    return "dashboard";
  }
  if (page === "create") {
    return "mine";
  }
  return "full";
};
