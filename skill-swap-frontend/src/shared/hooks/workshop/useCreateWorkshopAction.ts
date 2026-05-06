import { useCallback } from 'react';
import { toast } from 'sonner';
import type { WorkshopUpsertPayload } from '../../../lib/api';
import type { User } from '../../../types/user';
import { createWorkshopService } from '../../service/workshop/createWorkshopService';

interface UseCreateWorkshopActionParams {
  isAuthenticated: boolean;
  user: User | null;
  sessionToken: string | null;
  refreshSessionToken: () => Promise<string | null>;
}

export function useCreateWorkshopAction({
  isAuthenticated,
  user,
  sessionToken,
  refreshSessionToken,
}: UseCreateWorkshopActionParams) {
  return useCallback(
    async (workshopData: WorkshopUpsertPayload): Promise<boolean> => {
      if (!isAuthenticated || !user) {
        toast.error('Please sign in to create workshops');
        return false;
      }

      try {
        let tokenToUse = sessionToken ?? (await refreshSessionToken());
        if (!tokenToUse) {
          toast.error('Please sign in to create workshops');
          return false;
        }

        try {
          await createWorkshopService.create(workshopData, tokenToUse);
        } catch (error) {
          const status = (error as Error & { status?: number }).status;
          if (status !== 401) throw error;

          const refreshedToken = await refreshSessionToken();
          if (!refreshedToken || refreshedToken === tokenToUse) {
            throw error;
          }
          tokenToUse = refreshedToken;
          await createWorkshopService.create(workshopData, tokenToUse);
        }

        toast.success('Workshop created successfully!');
        return true;
      } catch (error) {
        console.error('Failed to create workshop:', error);
        toast.error('Failed to create workshop: ' + (error instanceof Error ? error.message : 'Unknown error'));
        return false;
      }
    },
    [isAuthenticated, refreshSessionToken, sessionToken, user]
  );
}
