import { useApp } from '../../../contexts/AppContext';
import { WorkshopDetailsBackButton } from '../components/WorkshopDetailsBackButton';
import { WorkshopDetailsMainContent } from '../components/WorkshopDetailsMainContent';
import { WorkshopDetailsNotFound } from '../components/WorkshopDetailsNotFound';
import { WorkshopDetailsSidebar } from '../components/WorkshopDetailsSidebar';
import { useWorkshopAttendanceMembership } from '../hooks/useWorkshopAttendanceMembership';
import { useWorkshopDetailMutations } from '../hooks/useWorkshopDetailMutations';
import { useWorkshopDetailQuery } from '../hooks/useWorkshopDetailQuery';
import { useWorkshopDetailSelection } from '../hooks/useWorkshopDetailSelection';

interface WorkshopDetailsScreenProps {
  workshopId: string;
}

export function WorkshopDetailsScreen({ workshopId }: WorkshopDetailsScreenProps) {
  const {
    workshops,
    user,
    isAdmin,
    sessionToken,
    attendWorkshop,
    cancelWorkshopAttendance,
    setCurrentPage,
    upsertWorkshop,
  } = useApp();

  const query = useWorkshopDetailQuery({
    workshopId,
    workshops,
    sessionToken,
    upsertWorkshop,
  });
  const attendanceMembership = useWorkshopAttendanceMembership({
    workshopId,
    sessionToken,
  });
  const selection = useWorkshopDetailSelection({
    workshop: query.workshop,
    userId: user?.id ?? null,
    isAdmin,
    isAttendingByMembership: attendanceMembership.isAttendingByMembership,
  });
  const mutations = useWorkshopDetailMutations({
    workshopId,
    sessionToken,
    attendWorkshop,
    cancelWorkshopAttendance,
    setCurrentPage,
    onMembershipChanged: attendanceMembership.refreshMembership,
  });

  if (query.isLoading) {
    return (
      <div className="min-h-screen bg-background pt-20 lg:pt-24 flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!query.workshop || !selection.guardState) {
    return (
      <div className="min-h-screen bg-background pt-20 lg:pt-24">
        <WorkshopDetailsNotFound onBack={mutations.goBackToExplore} />
      </div>
    );
  }

  if ((selection.guardState.isPending || selection.guardState.isRejected) && !selection.guardState.canViewRestricted) {
    return (
      <div className="min-h-screen bg-background pt-20 lg:pt-24">
        <WorkshopDetailsNotFound onBack={mutations.goBackToExplore} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-20 lg:pt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <WorkshopDetailsBackButton onBack={mutations.goBackToExplore} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <WorkshopDetailsMainContent
            workshop={query.workshop}
            isAdmin={isAdmin}
            guardState={selection.guardState}
            onAttend={mutations.handleAttend}
            onCancel={mutations.handleCancel}
            onRequestApproval={mutations.handleRequestApproval}
            onViewMoreWorkshops={mutations.goBackToExplore}
          />

          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-6">
              <WorkshopDetailsSidebar workshop={query.workshop} attendCloseAt={selection.attendCloseAt} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
