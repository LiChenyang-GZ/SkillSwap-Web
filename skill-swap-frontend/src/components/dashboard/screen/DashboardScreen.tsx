import { useApp } from "../../../contexts/AppContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../ui/tabs";
import { DashboardAttendedTab } from "../components/DashboardAttendedTab";
import { DashboardAuthState } from "../components/DashboardAuthState";
import { DashboardEditProfileDialog } from "../components/DashboardEditProfileDialog";
import { DashboardHeader } from "../components/DashboardHeader";
import { DashboardHostingTab } from "../components/DashboardHostingTab";
import { DashboardProfileCard } from "../components/DashboardProfileCard";
import { DashboardQuickStats } from "../components/DashboardQuickStats";
import { DashboardUpcomingTab } from "../components/DashboardUpcomingTab";
import { DASHBOARD_STATUS_BADGE_CLASSNAME } from "../constants/dashboardUiConstants";
import { useDashboardHostingMutations } from "../hooks/useDashboardHostingMutations";
import { useDashboardPagination } from "../hooks/useDashboardPagination";
import { useDashboardProfileForm } from "../hooks/useDashboardProfileForm";
import { useDashboardWorkshopView } from "../hooks/useDashboardWorkshopView";
import { isHostedByCurrentUser } from "../utils/dashboardWorkshopUtils";
import type { User } from "../../../types/user";
import type { Workshop } from "../../../types/workshop";

interface DashboardAuthenticatedScreenProps {
  user: User;
  workshops: Workshop[];
  sessionToken: string | null;
  setCurrentPage: (page: string) => void;
  cancelWorkshopAttendance: (workshopId: string) => Promise<void>;
  updateCurrentUserProfile: (updates: {
    username?: string;
    avatarUrl?: string;
    bio?: string;
    skills?: string[];
  }) => Promise<User>;
  uploadCurrentUserAvatar: (file: File) => Promise<User>;
}

function DashboardAuthenticatedScreen({
  user,
  workshops,
  sessionToken,
  setCurrentPage,
  cancelWorkshopAttendance,
  updateCurrentUserProfile,
  uploadCurrentUserAvatar,
}: DashboardAuthenticatedScreenProps) {
  const nonNullableUser: User | null = user;

  const profileForm = useDashboardProfileForm({
    user: nonNullableUser,
    updateCurrentUserProfile,
    uploadCurrentUserAvatar,
  });

  const hostingMutations = useDashboardHostingMutations({
    sessionToken,
    user: nonNullableUser,
    workshops,
  });

  const workshopViewWithHostingFilter = useDashboardWorkshopView({
    user: nonNullableUser,
    workshops,
    hiddenHostedWorkshopIds: hostingMutations.hiddenHostedWorkshopIds,
  });

  const pagination = useDashboardPagination({
    sortedUpcomingWorkshops: workshopViewWithHostingFilter.sortedUpcomingWorkshops,
    sortedAttendedWorkshops: workshopViewWithHostingFilter.sortedAttendedWorkshops,
    sortedHostingWorkshops: workshopViewWithHostingFilter.sortedHostingWorkshops,
  });

  return (
    <div className="min-h-screen bg-background pt-20 lg:pt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <DashboardHeader user={user} onHostWorkshop={() => setCurrentPage("create")} />

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-1">
            <DashboardProfileCard user={user} onEditProfile={profileForm.openEditProfileDialog} />
            <DashboardQuickStats
              upcomingCount={workshopViewWithHostingFilter.upcomingWorkshops.length}
              attendedCount={workshopViewWithHostingFilter.attendedWorkshops.length}
              hostingCount={workshopViewWithHostingFilter.hostingWorkshops.length}
            />
          </div>

          <div className="lg:col-span-3">
            <Tabs defaultValue="upcoming" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="upcoming">My Upcoming ({workshopViewWithHostingFilter.upcomingWorkshops.length})</TabsTrigger>
                <TabsTrigger value="attended">Attended ({workshopViewWithHostingFilter.attendedWorkshops.length})</TabsTrigger>
                <TabsTrigger value="hosting">Hosting ({workshopViewWithHostingFilter.hostingWorkshops.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="upcoming" className="space-y-4">
                <DashboardUpcomingTab
                  upcomingWorkshops={workshopViewWithHostingFilter.upcomingWorkshops}
                  pagedUpcomingWorkshops={pagination.pagedUpcomingWorkshops}
                  upcomingPage={pagination.upcomingPage}
                  upcomingTotalPages={pagination.upcomingTotalPages}
                  statusBadgeClassName={DASHBOARD_STATUS_BADGE_CLASSNAME}
                  onSetUpcomingPage={pagination.setUpcomingPage}
                  onOpenWorkshop={(workshopId) => setCurrentPage(`workshop-${workshopId}`)}
                  onCancelWorkshopAttendance={cancelWorkshopAttendance}
                  onExploreWorkshops={() => setCurrentPage("explore")}
                  isHostedByCurrentUser={(workshop) => isHostedByCurrentUser(workshop, nonNullableUser)}
                />
              </TabsContent>

              <TabsContent value="attended" className="space-y-4">
                <DashboardAttendedTab
                  attendedWorkshops={workshopViewWithHostingFilter.attendedWorkshops}
                  pagedAttendedWorkshops={pagination.pagedAttendedWorkshops}
                  attendedPage={pagination.attendedPage}
                  attendedTotalPages={pagination.attendedTotalPages}
                  statusBadgeClassName={DASHBOARD_STATUS_BADGE_CLASSNAME}
                  onSetAttendedPage={pagination.setAttendedPage}
                  onOpenWorkshop={(workshopId) => setCurrentPage(`workshop-${workshopId}`)}
                />
              </TabsContent>

              <TabsContent value="hosting" className="space-y-4">
                <DashboardHostingTab
                  hostingWorkshops={workshopViewWithHostingFilter.hostingWorkshops}
                  pagedHostingWorkshops={pagination.pagedHostingWorkshops}
                  hostingPage={pagination.hostingPage}
                  hostingTotalPages={pagination.hostingTotalPages}
                  statusBadgeClassName={DASHBOARD_STATUS_BADGE_CLASSNAME}
                  hidingWorkshopIds={hostingMutations.hidingWorkshopIds}
                  onSetHostingPage={pagination.setHostingPage}
                  onOpenWorkshop={(workshopId) => setCurrentPage(`workshop-${workshopId}`)}
                  onHideHostedWorkshopFromView={hostingMutations.hideHostedWorkshopFromView}
                  onHostWorkshop={() => setCurrentPage("create")}
                />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      <DashboardEditProfileDialog
        user={user}
        isEditProfileOpen={profileForm.isEditProfileOpen}
        editUsername={profileForm.editUsername}
        isSavingProfile={profileForm.isSavingProfile}
        pendingAvatarFile={profileForm.pendingAvatarFile}
        pendingAvatarPreviewUrl={profileForm.pendingAvatarPreviewUrl}
        profileError={profileForm.profileError}
        avatarFileInputRef={profileForm.avatarFileInputRef}
        onEditUsernameChange={profileForm.setEditUsername}
        onAvatarFileChange={profileForm.handleAvatarFileChange}
        onOpenChange={profileForm.handleEditProfileOpenChange}
        onSave={profileForm.handleSaveProfile}
      />
    </div>
  );
}

export function DashboardScreen() {
  const {
    user,
    workshops,
    sessionToken,
    setCurrentPage,
    cancelWorkshopAttendance,
    updateCurrentUserProfile,
    uploadCurrentUserAvatar,
  } = useApp();

  if (!user) {
    return <DashboardAuthState />;
  }

  return (
    <DashboardAuthenticatedScreen
      user={user}
      workshops={workshops}
      sessionToken={sessionToken}
      setCurrentPage={setCurrentPage}
      cancelWorkshopAttendance={cancelWorkshopAttendance}
      updateCurrentUserProfile={updateCurrentUserProfile}
      uploadCurrentUserAvatar={uploadCurrentUserAvatar}
    />
  );
}
