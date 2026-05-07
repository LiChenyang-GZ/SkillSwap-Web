import { apiCall, resolveAssetUrl } from "../../../lib/api";
import type { MemoryEntry } from "../../../types/memory";
import { mapMemoryEntry } from "./memoryMapper";

export const memoryAdminService = {
  getAllForAdmin: async (token?: string | null): Promise<MemoryEntry[]> => {
    const data = await apiCall<any[]>("/api/v1/admin/memories", {}, token);
    return data.map((item) => mapMemoryEntry(item));
  },

  createByAdmin: async (payload: Partial<MemoryEntry>, token?: string | null): Promise<MemoryEntry> => {
    const data = await apiCall<any>(
      "/api/v1/admin/memories",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      token
    );
    return mapMemoryEntry(data);
  },

  updateByAdmin: async (id: string, payload: Partial<MemoryEntry>, token?: string | null): Promise<MemoryEntry> => {
    const data = await apiCall<any>(
      `/api/v1/admin/memories/${id}`,
      {
        method: "PUT",
        body: JSON.stringify(payload),
      },
      token
    );
    return mapMemoryEntry(data);
  },

  deleteByAdmin: async (id: string, token?: string | null): Promise<void> => {
    await apiCall<void>(
      `/api/v1/admin/memories/${id}`,
      {
        method: "DELETE",
      },
      token
    );
  },

  acquireLockByAdmin: async (id: string, token?: string | null): Promise<MemoryEntry> => {
    const data = await apiCall<any>(
      `/api/v1/admin/memories/${id}/lock`,
      {
        method: "POST",
      },
      token
    );
    return mapMemoryEntry(data);
  },

  releaseLockByAdmin: async (id: string, token?: string | null): Promise<void> => {
    await apiCall<void>(
      `/api/v1/admin/memories/${id}/lock`,
      {
        method: "DELETE",
      },
      token
    );
  },

  uploadMediaByAdmin: async (file: File, token?: string | null): Promise<{ url: string; path: string }> => {
    const formData = new FormData();
    formData.append("file", file);

    const response = await apiCall<{ url: string; path: string }>(
      "/api/v1/admin/memories/media",
      {
        method: "POST",
        body: formData,
      },
      token
    );

    return {
      ...response,
      url: resolveAssetUrl(response.url || response.path),
    };
  },
};
