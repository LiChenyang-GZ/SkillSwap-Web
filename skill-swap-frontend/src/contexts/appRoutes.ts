import {
  ADMIN_MEMORY_PAGE_ID,
  ADMIN_MEMORY_PATH,
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
  credits: "/credits",
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
  "/credits": "credits",
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

// Pages a signed-out visitor may open directly by URL. The auth bootstrap
// keeps these instead of redirecting to the hero landing page.
const SIGNED_OUT_PRESERVED_PAGES = new Set(["campuses"]);

export const isSignedOutPreservedPage = (page: string) => SIGNED_OUT_PRESERVED_PAGES.has(page);

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
