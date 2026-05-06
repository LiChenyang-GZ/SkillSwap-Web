import { apiCall } from "../../../lib/api";
import type { MemoryEntry } from "../../../types/memory";
import { mapMemoryEntry } from "./memoryMapper";

export const memoryQueryService = {
  getPublic: async (): Promise<MemoryEntry[]> => {
    const data = await apiCall<any[]>("/api/v1/memories");
    return data.map((item) => mapMemoryEntry(item));
  },

  getBySlug: async (slug: string): Promise<MemoryEntry | null> => {
    try {
      const data = await apiCall<any>(`/api/v1/memories/${encodeURIComponent(slug)}`);
      return mapMemoryEntry(data);
    } catch {
      return null;
    }
  },
};
