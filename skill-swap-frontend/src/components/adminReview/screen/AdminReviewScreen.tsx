import { ShieldCheck } from 'lucide-react';
import { useApp } from '../../../contexts/AppContext';
import { Button } from '../../../components/ui/button';
import { Card, CardContent } from '../../../components/ui/card';
import { AdminReviewDetailPanel } from '../components/AdminReviewDetailPanel';
import { AdminReviewListPanel } from '../components/AdminReviewListPanel';
import { AdminReviewToolbar } from '../components/AdminReviewToolbar';
import { useAuthRetry } from '../hooks/useAuthRetry';
import { useAdminReviewFormState } from '../hooks/useAdminReviewFormState';
import { useAdminReviewMutations } from '../hooks/useAdminReviewMutations';
import { useAdminReviewQuery } from '../hooks/useAdminReviewQuery';

export function AdminReviewScreen() {
  const { sessionToken, setCurrentPage } = useApp();
  const withAuthRetry = useAuthRetry(sessionToken);
  const query = useAdminReviewQuery({ sessionToken, withAuthRetry });
  const form = useAdminReviewFormState({ selectedWorkshop: query.selectedWorkshop });
  const mutations = useAdminReviewMutations({
    sessionToken,
    withAuthRetry,
    selectedWorkshop: query.selectedWorkshop,
    selectedHasDetail: query.selectedHasDetail,
    formData: form.formData,
    pendingImageFile: form.pendingImageFile,
    setPendingImageFile: form.setPendingImageFile,
    clearLocalImagePreview: form.clearLocalImagePreview,
    rejectComment: form.rejectComment,
    setValidationState: form.setValidationState,
    clearValidationState: form.clearValidationState,
    setWorkshops: query.setWorkshops,
    refreshWorkshops: query.refreshWorkshops,
  });

  if (!sessionToken) {
    return (
      <div className="min-h-screen bg-background pt-20 lg:pt-24 flex items-center justify-center">
        <div className="text-center">
          <ShieldCheck className="w-10 h-10 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Please sign in to review workshop submissions.</p>
          <Button className="mt-4" onClick={() => setCurrentPage('auth')}>
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-20 lg:pt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Workshop Administration</h1>
            <p className="text-muted-foreground">Review, edit, approve, or cancel workshops before they start.</p>
          </div>
          <AdminReviewToolbar
            statusFilter={query.statusFilter}
            isLoading={query.isLoading}
            onStatusFilterChange={query.setStatusFilter}
            onRefresh={query.refreshWorkshops}
          />
        </div>

        {query.errorMessage && (
          <Card className="mb-6">
            <CardContent className="p-4 text-sm text-destructive">{query.errorMessage}</CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <AdminReviewListPanel
            isLoading={query.isLoading}
            sortedWorkshops={query.sortedWorkshops}
            pagedWorkshops={query.pagedWorkshops}
            selectedId={query.selectedId}
            currentPage={query.currentPage}
            totalPages={query.totalPages}
            onSelect={query.setSelectedId}
            onPrevPage={query.goToPrevPage}
            onNextPage={query.goToNextPage}
          />

          <AdminReviewDetailPanel
            isLoading={query.isLoading}
            isDetailLoading={query.isDetailLoading}
            isSaving={mutations.isSaving}
            selectedWorkshop={query.selectedWorkshop}
            selectedHasDetail={query.selectedHasDetail}
            selectedDetailError={query.selectedDetailError}
            formData={form.formData}
            formError={form.formError}
            rejectComment={form.rejectComment}
            localImagePreviewUrl={form.localImagePreviewUrl}
            imageFileInputRef={form.imageFileInputRef}
            isDirty={form.isDirty}
            onRetryLoadDetails={() => {
              if (query.selectedWorkshop?.id) {
                void query.loadWorkshopDetail(query.selectedWorkshop.id, true);
              }
            }}
            onInputChange={form.handleInputChange}
            getFieldError={form.getFieldError}
            onRejectCommentChange={form.setRejectComment}
            onImageFileSelection={form.handleImageFileSelection}
            onSave={mutations.handleSave}
            onCancel={mutations.handleCancel}
            onReject={mutations.handleReject}
            onApprove={mutations.handleApprove}
            onExportParticipantsExcel={mutations.handleExportParticipantsExcel}
          />
        </div>
      </div>
    </div>
  );
}
