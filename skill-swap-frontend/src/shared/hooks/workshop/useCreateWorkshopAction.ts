import { useCallback } from 'react';
import { toast } from 'sonner';
import type { WorkshopUpsertPayload } from '../../../lib/api';
import type { User } from '../../../types/user';
import { createWorkshopService } from '../../service/workshop/createWorkshopService';

interface UseCreateWorkshopActionParams {
  isAuthenticated: boolean;
  user: User | null;
  getAuthToken: () => Promise<string | null>;
}

export function useCreateWorkshopAction({
  isAuthenticated,
  user,
  getAuthToken,
}: UseCreateWorkshopActionParams) {
  return useCallback(
    async (workshopData: WorkshopUpsertPayload): Promise<boolean> => {
      if (!isAuthenticated || !user) {
        toast.error('Please sign in to create workshops');
        return false;
      }

      try {
        const token = await getAuthToken();
        if (!token) {
          toast.error('Please sign in to create workshops');
          return false;
        }

        await createWorkshopService.create(workshopData, token);

        toast.success('Workshop created successfully!');
        return true;
      } catch (error) {
        console.error('Failed to create workshop:', error);
        toast.error('Failed to create workshop: ' + (error instanceof Error ? error.message : 'Unknown error'));
        return false;
      }
    },
    [isAuthenticated, getAuthToken, user]
  );
}
