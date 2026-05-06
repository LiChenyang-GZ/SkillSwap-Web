import type { NotificationErrorStatus } from "../models/notificationStatusModel";
import {
  NOTIFICATIONS_FORBIDDEN_MESSAGE,
  NOTIFICATIONS_LOAD_FAILED_MESSAGE,
  NOTIFICATIONS_SESSION_EXPIRED_MESSAGE,
} from "../constants/notificationMessages";

export function resolveNotificationErrorMessage(status: NotificationErrorStatus): string {
  if (status === 401) {
    return NOTIFICATIONS_SESSION_EXPIRED_MESSAGE;
  }
  if (status === 403) {
    return NOTIFICATIONS_FORBIDDEN_MESSAGE;
  }
  return NOTIFICATIONS_LOAD_FAILED_MESSAGE;
}
