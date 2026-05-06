export type NotificationActionType = "review_workshop" | "view_workshop";

export interface NotificationActionView {
  label: string;
  action: () => void;
}
