import { apiCall, toBackendWorkshopId } from '../../../lib/api';

export const workshopMutationService = {
  requestApproval: async (workshopId: string, token?: string | null): Promise<void> => {
    await apiCall<void>(
      `/api/v1/workshops/${toBackendWorkshopId(workshopId)}/request-approval`,
      { method: 'POST' },
      token
    );
  },

  join: async (workshopId: string, token?: string | null): Promise<void> => {
    await apiCall<void>(
      `/api/v1/workshops/${toBackendWorkshopId(workshopId)}/join`,
      { method: 'POST' },
      token
    );
  },

  leave: async (workshopId: string, token?: string | null): Promise<void> => {
    await apiCall<void>(
      `/api/v1/workshops/${toBackendWorkshopId(workshopId)}/leave`,
      { method: 'POST' },
      token
    );
  },

  delete: async (workshopId: string, token?: string | null): Promise<void> => {
    await apiCall<void>(
      `/api/v1/workshops/${toBackendWorkshopId(workshopId)}`,
      { method: 'DELETE' },
      token
    );
  },

  hideHostingWorkshop: async (workshopId: string, token?: string | null): Promise<void> => {
    await apiCall<void>(
      `/api/v1/workshops/${toBackendWorkshopId(workshopId)}/hosting/hide`,
      { method: 'POST' },
      token
    );
  },
};
