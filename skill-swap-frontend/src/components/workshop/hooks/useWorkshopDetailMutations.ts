import { toast } from 'sonner';
import { workshopMutationService } from '../../../shared/service/workshop/workshopMutationService';

interface UseWorkshopDetailMutationsParams {
  workshopId: string;
  sessionToken: string | null;
  attendWorkshop: (id: string) => Promise<void>;
  cancelWorkshopAttendance: (id: string) => Promise<void>;
  setCurrentPage: (page: string) => void;
  onMembershipChanged?: () => Promise<boolean>;
  onMembershipOptimisticChange?: (isAttending: boolean) => void;
  onWorkshopChanged?: () => void;
}

export function useWorkshopDetailMutations({
  workshopId,
  sessionToken,
  attendWorkshop,
  cancelWorkshopAttendance,
  setCurrentPage,
  onMembershipChanged,
  onMembershipOptimisticChange,
  onWorkshopChanged,
}: UseWorkshopDetailMutationsParams) {
  const goBackToExplore = () => setCurrentPage('explore');

  const handleAttend = async () => {
    await attendWorkshop(workshopId);
    onMembershipOptimisticChange?.(true);
    try {
      if (onMembershipChanged) {
        await onMembershipChanged();
      }
    } finally {
      onWorkshopChanged?.();
    }
  };

  const handleCancel = async () => {
    await cancelWorkshopAttendance(workshopId);
    onMembershipOptimisticChange?.(false);
    try {
      if (onMembershipChanged) {
        await onMembershipChanged();
      }
    } finally {
      onWorkshopChanged?.();
    }
  };

  const handleRequestApproval = async () => {
    if (!sessionToken) {
      toast.error('Please sign in to request approval');
      return;
    }

    try {
      await workshopMutationService.requestApproval(workshopId, sessionToken);
      toast.success('Approval request sent to admins');
    } catch (error) {
      console.error('Failed to request approval', error);
      toast.error('Failed to send approval request');
    }
  };

  return {
    goBackToExplore,
    handleAttend,
    handleCancel,
    handleRequestApproval,
  };
}
