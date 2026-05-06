import type { Workshop } from '../../../types/workshop';
import { apiCall, enrichWorkshop, toBackendWorkshopId } from '../../../lib/api';

const workshopDetailInFlight = new Map<string, Promise<Workshop | null>>();

export const workshopDiscoveryService = {
  getPublic: async (): Promise<Workshop[]> => {
    try {
      const data = await apiCall<any[]>('/api/v1/workshops/public');
      return data.map(enrichWorkshop);
    } catch (error) {
      console.error('Failed to fetch public workshops:', error);
      return [];
    }
  },

  getMine: async (token?: string | null): Promise<Workshop[]> => {
    try {
      const data = await apiCall<any[]>('/api/v1/workshops/mine', {}, token);
      return data.map(enrichWorkshop);
    } catch (error) {
      console.error('Failed to fetch my workshops:', error);
      return [];
    }
  },

  getAttending: async (token?: string | null): Promise<Workshop[]> => {
    try {
      const data = await apiCall<any[]>('/api/v1/workshops/attending', {}, token);
      return data.map(enrichWorkshop);
    } catch (error) {
      console.error('Failed to fetch attending workshops:', error);
      return [];
    }
  },

  getById: async (id: string, token?: string | null): Promise<Workshop | null> => {
    const cacheKey = `${token ?? 'anon'}:${toBackendWorkshopId(id)}`;
    const existingTask = workshopDetailInFlight.get(cacheKey);
    if (existingTask) {
      return existingTask;
    }

    const task = (async () => {
      try {
        const data = await apiCall<any>(`/api/v1/workshops/${toBackendWorkshopId(id)}`, {}, token);
        return enrichWorkshop(data);
      } catch (error) {
        console.warn('Backend unavailable for workshop', id, error);
        return null;
      }
    })();

    workshopDetailInFlight.set(cacheKey, task);
    try {
      return await task;
    } finally {
      workshopDetailInFlight.delete(cacheKey);
    }
  },

  requestApproval: async (workshopId: string, token?: string | null): Promise<void> => {
    await apiCall<void>(
      `/api/v1/workshops/${toBackendWorkshopId(workshopId)}/request-approval`,
      { method: 'POST' },
      token
    );
  },
};
