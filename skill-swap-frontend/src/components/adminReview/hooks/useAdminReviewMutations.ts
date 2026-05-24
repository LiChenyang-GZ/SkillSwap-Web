import { useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { toast } from 'sonner';
import type { WorkshopUpsertPayload } from '../../../shared/api';
import type { Workshop } from '../../../types/workshop';
import { adminWorkshopService } from '../../../shared/service/workshop/adminWorkshopService';
import { WorkshopFormState } from '../models/adminReviewFormModel';
import type { AdminReviewFieldErrors } from '../models/adminReviewValidationModel';
import { normalizeAttendCloseAtForApi, normalizeContactNumber } from '../utils/adminReviewUtils';
import { validateAdminReviewWorkshopForm } from '../utils/adminReviewValidation';

interface UseAdminReviewMutationsParams {
  isAuthenticated: boolean;
  getAuthToken: () => Promise<string | null>;
  selectedWorkshop: Workshop | null;
  selectedHasDetail: boolean;
  formData: WorkshopFormState;
  pendingImageFile: File | null;
  setPendingImageFile: (file: File | null) => void;
  clearLocalImagePreview: () => void;
  rejectComment: string;
  setValidationState: (errors: AdminReviewFieldErrors, formError: string | null) => void;
  clearValidationState: () => void;
  setWorkshops: Dispatch<SetStateAction<Workshop[]>>;
  refreshWorkshops: () => void;
}

export function useAdminReviewMutations({
  isAuthenticated,
  getAuthToken,
  selectedWorkshop,
  selectedHasDetail,
  formData,
  pendingImageFile,
  setPendingImageFile,
  clearLocalImagePreview,
  rejectComment,
  setValidationState,
  clearValidationState,
  setWorkshops,
  refreshWorkshops,
}: UseAdminReviewMutationsParams) {
  const [isSaving, setIsSaving] = useState(false);

  const parseErrorMessage = (error: unknown, fallback: string) => {
    if (!(error instanceof Error)) return fallback;
    const raw = String(error.message || '').trim();
    if (!raw) return fallback;

    try {
      const parsed = JSON.parse(raw);
      const parsedMessage = parsed?.message || parsed?.error;
      if (typeof parsedMessage === 'string' && parsedMessage.trim()) {
        return parsedMessage.trim();
      }
    } catch {
      // Keep raw message when it is not JSON.
    }

    return raw;
  };

  const handleSave = async () => {
    if (!selectedWorkshop || !selectedHasDetail || !isAuthenticated) return;

    const validationResult = validateAdminReviewWorkshopForm(formData);
    if (!validationResult.isValid) {
      setValidationState(validationResult.fieldErrors, validationResult.formError);
      toast.error(validationResult.formError || 'Please review the highlighted fields before saving.');
      return;
    }

    setIsSaving(true);

    try {
      clearValidationState();
      const token = await getAuthToken();
      if (!token) throw new Error('Authentication token unavailable');
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

      let updated = await adminWorkshopService.update(selectedWorkshop.id, payload, token);

      if (pendingImageFile) {
        updated = await adminWorkshopService.uploadImage(selectedWorkshop.id, pendingImageFile, token);
      }

      setWorkshops((prev) => prev.map((workshop) => (workshop.id === updated.id ? updated : workshop)));
      setPendingImageFile(null);
      clearLocalImagePreview();
      toast.success('Workshop updated successfully.');
    } catch (error) {
      console.error('Failed to update workshop:', error);
      toast.error(parseErrorMessage(error, 'Failed to update workshop.'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedWorkshop || !selectedHasDetail || !isAuthenticated) return;
    setIsSaving(true);

    try {
      const token = await getAuthToken();
      if (!token) throw new Error('Authentication token unavailable');
      await adminWorkshopService.approve(selectedWorkshop.id, token);
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
    if (!selectedWorkshop || !selectedHasDetail || !isAuthenticated) return;
    setIsSaving(true);

    try {
      const token = await getAuthToken();
      if (!token) throw new Error('Authentication token unavailable');
      await adminWorkshopService.reject(selectedWorkshop.id, rejectComment || undefined, token);
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
    if (!selectedWorkshop || !selectedHasDetail || !isAuthenticated) return;
    setIsSaving(true);

    try {
      const token = await getAuthToken();
      if (!token) throw new Error('Authentication token unavailable');
      await adminWorkshopService.cancel(selectedWorkshop.id, token);
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

  const handleExportParticipantsCsv = (workshop: Workshop) => {
    const participants = workshop.participants ?? [];
    const participantCount = participants.length || workshop.currentParticipants || 0;

    if (participantCount === 0) {
      toast.info('No participant data to export.');
      return;
    }

    const exportedAt = new Date().toISOString();
    const headers = [
      'No',
      'Workshop',
      'Status',
      'Date',
      'Time',
      'ParticipantName',
      'ParticipantEmail',
      'ExportedAt',
      'Note',
    ];

    type CsvCell = string | number | null | undefined;
    const rows: CsvCell[][] =
      participants.length > 0
        ? participants.map((participant, index) => [
            index + 1,
            workshop.title,
            workshop.status,
            workshop.date,
            workshop.time,
            participant.username || 'Unknown',
            participant.email || '',
            exportedAt,
            '',
          ])
        : [[
            '',
            workshop.title,
            workshop.status,
            workshop.date,
            workshop.time,
            '',
            '',
            exportedAt,
            `${participantCount} participant(s) joined, but detail list is not available in API response.`,
          ]];

    // Defuse CSV/formula injection after leading whitespace, then escape per RFC 4180.
    const escapeCsvCell = (value: CsvCell): string => {
      if (value === null || value === undefined) return '';
      let str = String(value);
      if (/^\s*[=+\-@]/.test(str)) {
        str = `'${str}`;
      }
      const needsQuoting = /[",\r\n]/.test(str);
      const escaped = str.replace(/"/g, '""');
      return needsQuoting ? `"${escaped}"` : escaped;
    };

    const csvLines = [
      headers.join(','),
      ...rows.map((row) => row.map(escapeCsvCell).join(',')),
    ];
    // UTF-8 BOM so Excel detects encoding for non-ASCII names.
    const UTF8_BOM = '\ufeff';
    const csvContent = UTF8_BOM + csvLines.join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });

    const safeTitle = workshop.title.replace(/[\\/:*?"<>|]/g, '').trim() || 'workshop';
    const fileName = `${safeTitle.slice(0, 40)}-participants.csv`;

    const url = URL.createObjectURL(blob);
    try {
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      URL.revokeObjectURL(url);
    }

    toast.success('Participant list exported.');
  };

  return {
    isSaving,
    handleSave,
    handleApprove,
    handleReject,
    handleCancel,
    handleExportParticipantsCsv,
  };
}
