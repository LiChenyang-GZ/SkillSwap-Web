import {
  ADMIN_MEMORY_PAGE_ID,
  ADMIN_MEMORY_PATH,
  MEMORY_ENTRY_PAGE_PREFIX,
  MEMORY_PAGE_ID,
  MEMORY_PATH,
} from "../components/memory/constants/memoryRouteConstants";
import { pageFromMemoryPath, pathFromMemoryPage } from "../components/memory/utils/memoryRoute";
import type { RefreshDataMode } from "./appContextTypes";

const PAGE_TO_PATH: Record<string, string> = {
  hero: "/",
  home: "/home",
  explore: "/explore",
  campuses: "/campuses",
  create: "/create",
  dashboard: "/dashboard",
  [MEMORY_PAGE_ID]: MEMORY_PATH,
  [ADMIN_MEMORY_PAGE_ID]: ADMIN_MEMORY_PATH,
  notifications: "/notifications",
  adminReview: "/admin/workshops",
  auth: "/auth",
  onboarding: "/onboarding",
};

const PATH_TO_PAGE: Record<string, string> = {
  "/": "hero",
  "/home": "home",
  "/explore": "explore",
  "/campuses": "campuses",
  "/create": "create",
  "/dashboard": "dashboard",
  [MEMORY_PATH]: MEMORY_PAGE_ID,
  [ADMIN_MEMORY_PATH]: ADMIN_MEMORY_PAGE_ID,
  "/notifications": "notifications",
  "/admin/workshops": "adminReview",
  "/auth": "auth",
  "/onboarding": "onboarding",
};

export const normalizePath = (pathname: string) => {
  if (!pathname) return "/";
  const trimmed = pathname.trim();
  if (!trimmed || trimmed === "/") return "/";
  return trimmed.endsWith("/") ? trimmed.slice(0, -1) : trimmed;
};

export const pageFromPath = (pathname: string) => {
  const normalizedPath = normalizePath(pathname);
  if (normalizedPath.startsWith("/workshops/")) {
    const workshopId = decodeURIComponent(normalizedPath.slice("/workshops/".length));
    return workshopId ? `workshop-${workshopId}` : "explore";
  }
  const memoryPage = pageFromMemoryPath(normalizedPath);
  if (memoryPage) {
    return memoryPage;
  }
  return PATH_TO_PAGE[normalizedPath] || "explore";
};

export const pathFromPage = (page: string) => {
  if (page.startsWith("workshop-")) {
    const workshopId = page.slice("workshop-".length);
    return `/workshops/${encodeURIComponent(workshopId)}`;
  }
  const memoryPath = pathFromMemoryPage(page);
  if (memoryPath) {
    return memoryPath;
  }
  return PAGE_TO_PATH[page] || "/explore";
};

// Public discovery surfaces a signed-out visitor may open directly by URL (or
// refresh on) without the auth bootstrap bouncing them to the hero landing page.
const SIGNED_OUT_PRESERVED_PAGES = new Set<string>([
  "hero",
  "home",
  "explore",
  "campuses",
  MEMORY_PAGE_ID,
]);

// Dynamic public routes resolve to prefixed page ids (e.g. `workshop-123`,
// `memory-entry-my-slug`), so they are matched by prefix rather than exact id.
const SIGNED_OUT_PRESERVED_PAGE_PREFIXES = ["workshop-", MEMORY_ENTRY_PAGE_PREFIX];

export const isSignedOutPreservedPage = (page: string) =>
  SIGNED_OUT_PRESERVED_PAGES.has(page) ||
  SIGNED_OUT_PRESERVED_PAGE_PREFIXES.some((prefix) => page.startsWith(prefix));

export const resolvePostLoginPage = () => {
  const requestedPage = pageFromPath(window.location.pathname);
  if (requestedPage === "hero" || requestedPage === "auth") {
    return "explore";
  }
  return requestedPage;
};

export const resolveRefreshModeByPage = (page: string): RefreshDataMode => {
  if (page === "home" || page === "explore") {
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
