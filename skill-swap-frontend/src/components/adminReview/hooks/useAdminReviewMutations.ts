import { useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import type { WorkshopUpsertPayload } from '../../../lib/api';
import type { Workshop } from '../../../types/workshop';
import { adminWorkshopService } from '../../../shared/service/workshop/adminWorkshopService';
import { WorkshopFormState } from '../models/adminReviewFormModel';
import { normalizeAttendCloseAtForApi, normalizeContactNumber } from '../utils/adminReviewUtils';

interface UseAdminReviewMutationsParams {
  sessionToken: string | null;
  withAuthRetry: <T>(action: (token: string) => Promise<T>) => Promise<T>;
  selectedWorkshop: Workshop | null;
  selectedHasDetail: boolean;
  formData: WorkshopFormState;
  pendingImageFile: File | null;
  setPendingImageFile: (file: File | null) => void;
  clearLocalImagePreview: () => void;
  rejectComment: string;
  setWorkshops: Dispatch<SetStateAction<Workshop[]>>;
  refreshWorkshops: () => void;
}

export function useAdminReviewMutations({
  sessionToken,
  withAuthRetry,
  selectedWorkshop,
  selectedHasDetail,
  formData,
  pendingImageFile,
  setPendingImageFile,
  clearLocalImagePreview,
  rejectComment,
  setWorkshops,
  refreshWorkshops,
}: UseAdminReviewMutationsParams) {
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!selectedWorkshop || !selectedHasDetail || !sessionToken) return;
    setIsSaving(true);

    try {
      const payload: WorkshopUpsertPayload = {
        hostName: formData.hostName,
        title: formData.title,
        description: formData.description,
        category: formData.category,
        contactNumber: normalizeContactNumber(formData.contactNumber),
        duration: formData.duration ? parseInt(formData.duration, 10) : 0,
        maxParticipants: formData.maxParticipants ? parseInt(formData.maxParticipants, 10) : null,
        date: formData.date,
        time: formData.time,
        attendCloseAt: normalizeAttendCloseAtForApi(formData.attendCloseAt),
        isOnline: formData.isOnline,
        location: formData.isOnline ? 'Online' : formData.location,
        materialsProvided: formData.materialsProvided,
        materialsNeededFromClub: formData.materialsNeededFromClub,
        venueRequirements: formData.venueRequirements,
        otherImportantInfo: formData.otherImportantInfo,
        weekNumber: formData.weekNumber ? parseInt(formData.weekNumber, 10) : null,
        memberResponsible: formData.memberResponsible,
        membersPresent: formData.membersPresent,
        eventSubmitted: formData.eventSubmitted === 'true',
        usuApprovalStatus: formData.usuApprovalStatus,
        detailsConfirmed: formData.detailsConfirmed,
      };

      let updated = await withAuthRetry((token) =>
        adminWorkshopService.update(selectedWorkshop.id, payload, token)
      );

      if (pendingImageFile) {
        updated = await withAuthRetry((token) =>
          adminWorkshopService.uploadImage(selectedWorkshop.id, pendingImageFile, token)
        );
      }

      setWorkshops((prev) => prev.map((workshop) => (workshop.id === updated.id ? updated : workshop)));
      setPendingImageFile(null);
      clearLocalImagePreview();
      toast.success('Workshop updated successfully.');
    } catch (error) {
      console.error('Failed to update workshop:', error);
      toast.error('Failed to update workshop.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedWorkshop || !selectedHasDetail || !sessionToken) return;
    setIsSaving(true);

    try {
      await withAuthRetry((token) => adminWorkshopService.approve(selectedWorkshop.id, token));
      toast.success('Workshop approved.');
      setWorkshops((prev) =>
        prev.map((workshop) =>
          workshop.id === selectedWorkshop.id
            ? {
                ...workshop,
                status: 'approved',
              }
            : workshop
        )
      );
      refreshWorkshops();
    } catch (error) {
      console.error('Failed to approve workshop:', error);
      toast.error('Failed to approve workshop.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReject = async () => {
    if (!selectedWorkshop || !selectedHasDetail || !sessionToken) return;
    setIsSaving(true);

    try {
      await withAuthRetry((token) =>
        adminWorkshopService.reject(selectedWorkshop.id, rejectComment || undefined, token)
      );
      toast.success('Workshop rejected.');
      setWorkshops((prev) =>
        prev.map((workshop) =>
          workshop.id === selectedWorkshop.id
            ? {
                ...workshop,
                status: 'rejected',
                rejectionNote: rejectComment || '',
              }
            : workshop
        )
      );
      refreshWorkshops();
    } catch (error) {
      console.error('Failed to reject workshop:', error);
      toast.error('Failed to reject workshop.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = async () => {
    if (!selectedWorkshop || !selectedHasDetail || !sessionToken) return;
    setIsSaving(true);

    try {
      await withAuthRetry((token) => adminWorkshopService.cancel(selectedWorkshop.id, token));
      toast.success('Workshop cancelled.');
      setWorkshops((prev) =>
        prev.map((workshop) =>
          workshop.id === selectedWorkshop.id
            ? {
                ...workshop,
                status: 'cancelled',
              }
            : workshop
        )
      );
      refreshWorkshops();
    } catch (error) {
      console.error('Failed to cancel workshop:', error);
      toast.error('Failed to cancel workshop.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportParticipantsExcel = (workshop: Workshop) => {
    const participants = workshop.participants ?? [];
    const participantCount = participants.length || workshop.currentParticipants || 0;

    if (participantCount === 0) {
      toast.info('No participant data to export.');
      return;
    }

    const exportedAt = new Date().toISOString();
    const rows =
      participants.length > 0
        ? participants.map((participant, index) => ({
            No: index + 1,
            Workshop: workshop.title,
            Status: workshop.status,
            Date: workshop.date,
            Time: workshop.time,
            ParticipantName: participant.username || 'Unknown',
            ParticipantEmail: participant.email || '',
            ExportedAt: exportedAt,
          }))
        : [
            {
              No: '',
              Workshop: workshop.title,
              Status: workshop.status,
              Date: workshop.date,
              Time: workshop.time,
              ParticipantName: '',
              ParticipantEmail: '',
              ExportedAt: exportedAt,
              Note: `${participantCount} participant(s) joined, but detail list is not available in API response.`,
            },
          ];

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Participants');

    const safeTitle = workshop.title.replace(/[\\/:*?"<>|]/g, '').trim() || 'workshop';
    const fileName = `${safeTitle.slice(0, 40)}-participants.xlsx`;
    XLSX.writeFile(workbook, fileName);
    toast.success('Participant list exported.');
  };

  return {
    isSaving,
    handleSave,
    handleApprove,
    handleReject,
    handleCancel,
    handleExportParticipantsExcel,
  };
}
