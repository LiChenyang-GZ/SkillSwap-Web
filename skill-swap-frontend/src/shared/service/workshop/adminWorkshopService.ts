import { apiCall, enrichWorkshop, toBackendWorkshopId, WorkshopUpsertPayload } from '../../../lib/api';
import { Workshop } from '../../../types';

export const adminWorkshopService = {
  getPending: async (token?: string | null): Promise<Workshop[]> => {
    const data = await apiCall<any[]>('/api/v1/admin/workshops/pending', {}, token);
    return data.map(enrichWorkshop);
  },
  getAll: async (token?: string | null): Promise<Workshop[]> => {
    const data = await apiCall<any[]>('/api/v1/admin/workshops', {}, token);
    return data.map(enrichWorkshop);
  },
  getById: async (id: string, token?: string | null): Promise<Workshop | null> => {
    const data = await apiCall<any>(`/api/v1/workshops/${toBackendWorkshopId(id)}`, {}, token);
    return enrichWorkshop(data);
  },
  update: async (workshopId: string, payload: WorkshopUpsertPayload, token?: string | null): Promise<Workshop> => {
    const data = await apiCall<any>(
      `/api/v1/admin/workshops/${toBackendWorkshopId(workshopId)}`,
      { method: 'PUT', body: JSON.stringify(payload) },
      token
    );
    return enrichWorkshop(data);
  },
  uploadImage: async (workshopId: string, file: File, token?: string | null): Promise<Workshop> => {
    const formData = new FormData();
    formData.append('file', file);
    const data = await apiCall<any>(
      `/api/v1/admin/workshops/${toBackendWorkshopId(workshopId)}/image`,
      { method: 'POST', body: formData },
      token
    );
    return enrichWorkshop(data);
  },
  approve: async (workshopId: string, token?: string | null): Promise<void> => {
    await apiCall<void>(`/api/v1/admin/workshops/${toBackendWorkshopId(workshopId)}/approve`, { method: 'POST' }, token);
  },
  reject: async (workshopId: string, comment?: string, token?: string | null): Promise<void> => {
    await apiCall<void>(
      `/api/v1/admin/workshops/${toBackendWorkshopId(workshopId)}/reject`,
      { method: 'POST', body: JSON.stringify({ comment: comment || null }) },
      token
    );
  },
  cancel: async (workshopId: string, token?: string | null): Promise<void> => {
    await apiCall<void>(`/api/v1/admin/workshops/${toBackendWorkshopId(workshopId)}/cancel`, { method: 'POST' }, token);
  },
};
