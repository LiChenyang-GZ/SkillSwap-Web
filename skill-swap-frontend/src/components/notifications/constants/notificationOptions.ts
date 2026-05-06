import type { NotificationActionType } from "../models/notificationActionModel";
import {
  NOTIFICATIONS_REVIEW_WORKSHOP_LABEL,
  NOTIFICATIONS_VIEW_WORKSHOP_LABEL,
} from "./notificationMessages";

export const NOTIFICATION_ACTION_LABELS: Record<NotificationActionType, string> = {
  review_workshop: NOTIFICATIONS_REVIEW_WORKSHOP_LABEL,
  view_workshop: NOTIFICATIONS_VIEW_WORKSHOP_LABEL,
};

export const REVIEW_WORKSHOP_NOTIFICATION_TYPES = ["workshop_submission"] as const;

export const VIEW_WORKSHOP_NOTIFICATION_TYPES = [
  "workshop_approved",
  "workshop_updated",
  "workshop_updated_by_admin",
  "workshop_cancelled",
] as const;
