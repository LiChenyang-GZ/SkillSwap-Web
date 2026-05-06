import type { Workshop } from '../../../types/workshop';
import { apiCall, enrichWorkshop, toBackendWorkshopId } from '../../../lib/api';

export const workshopQueryService = {
  getAll: async (signal?: AbortSignal): Promise<Workshop[]> => {
    try {
      const data = await apiCall<any[]>('/api/v1/workshops', { signal });
      return data.map(enrichWorkshop);
    } catch (error) {
      console.error('Failed to fetch workshops:', error);
      return [];
    }
  },

  getPublic: async (signal?: AbortSignal): Promise<Workshop[]> => {
    try {
      const data = await apiCall<any[]>('/api/v1/workshops/public', { signal });
      return data.map(enrichWorkshop);
    } catch (error) {
      console.error('Failed to fetch public workshops:', error);
      return [];
    }
  },

  getMine: async (token?: string | null, signal?: AbortSignal): Promise<Workshop[]> => {
    try {
      const data = await apiCall<any[]>('/api/v1/workshops/mine', { signal }, token);
      return data.map(enrichWorkshop);
    } catch (error) {
      console.error('Failed to fetch my workshops:', error);
      return [];
    }
  },

  getAttending: async (token?: string | null, signal?: AbortSignal): Promise<Workshop[]> => {
    try {
      const data = await apiCall<any[]>('/api/v1/workshops/attending', { signal }, token);
      return data.map(enrichWorkshop);
    } catch (error) {
      console.error('Failed to fetch attending workshops:', error);
      return [];
    }
  },

  getById: async (id: string, token?: string | null, signal?: AbortSignal): Promise<Workshop | null> => {
    try {
      const data = await apiCall<any>(
        `/api/v1/workshops/${toBackendWorkshopId(id)}`,
        { signal },
        token
      );
      return enrichWorkshop(data);
    } catch (error) {
      if ((error as { name?: string })?.name === 'AbortError') {
        throw error;
      }
      const status = (error as { status?: number })?.status;
      console.warn('Failed to fetch workshop detail', {
        workshopId: id,
        backendId: toBackendWorkshopId(id),
        status: status ?? null,
        error,
      });
      return null;
    }
  },
};
