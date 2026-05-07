import {
  MEMORY_ENTRY_PAGE_PREFIX,
  MEMORY_PAGE_ID,
  MEMORY_PATH,
  MEMORY_PATH_PREFIX,
} from "../constants/memoryRouteConstants";

export function pageFromMemoryPath(pathname: string): string | null {
  if (!pathname.startsWith(MEMORY_PATH_PREFIX)) {
    return null;
  }

  const slug = decodeURIComponent(pathname.slice(MEMORY_PATH_PREFIX.length));
  return slug ? `${MEMORY_ENTRY_PAGE_PREFIX}${slug}` : MEMORY_PAGE_ID;
}

export function pathFromMemoryPage(page: string): string | null {
  if (!page.startsWith(MEMORY_ENTRY_PAGE_PREFIX)) {
    return null;
  }

  const slug = page.slice(MEMORY_ENTRY_PAGE_PREFIX.length);
  return `${MEMORY_PATH}/${encodeURIComponent(slug)}`;
}
