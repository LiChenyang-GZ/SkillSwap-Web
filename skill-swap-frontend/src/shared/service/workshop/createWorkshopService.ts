import { apiCall } from '../../../lib/api';
import type { WorkshopUpsertPayload } from '../../../lib/api';

export const createWorkshopService = {
  create: async (payload: WorkshopUpsertPayload, token: string): Promise<void> => {
    await apiCall<{ message: string }>(
      '/api/v1/workshops',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      token
    );
  },
};
