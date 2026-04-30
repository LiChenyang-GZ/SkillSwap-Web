import { AdminReviewStatusFilter } from '../models/adminReviewStatusModel';

export interface AdminReviewStatusFilterOption {
  value: AdminReviewStatusFilter;
  label: string;
}

export const ADMIN_REVIEW_DEFAULT_STATUS_FILTER: AdminReviewStatusFilter = 'pending';

export const ADMIN_REVIEW_STATUS_FILTER_OPTIONS: AdminReviewStatusFilterOption[] = [
  { value: 'all', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'completed', label: 'Completed' },
];

export const isAdminReviewStatusFilter = (value: string): value is AdminReviewStatusFilter =>
  ADMIN_REVIEW_STATUS_FILTER_OPTIONS.some((option) => option.value === value);

export const ADMIN_REVIEW_RESOLVED_WORKSHOP_STATUSES = ['pending', 'rejected', 'cancelled', 'completed'] as const;

export const ADMIN_REVIEW_DESTRUCTIVE_BADGE_STATUSES = ['rejected', 'cancelled'] as const;

export const ADMIN_REVIEW_NON_EDITABLE_STATUSES = ['completed', 'cancelled'] as const;

export const ADMIN_REVIEW_CANCELLABLE_STATUSES = ['approved', 'upcoming'] as const;

export const ADMIN_REVIEW_PARTICIPANT_VISIBLE_STATUSES = ['approved', 'completed'] as const;

export const ADMIN_REVIEW_REJECTION_NOTE_HIDDEN_STATUS = 'approved' as const;

export const ADMIN_REVIEW_USU_APPROVAL_STATUS_OPTIONS = [
  { value: 'pending', label: 'pending' },
  { value: 'approved', label: 'approved' },
] as const;
