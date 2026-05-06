export type NotificationErrorStatus = 401 | 403 | "unknown";

export interface NotificationsFetchState {
  isLoading: boolean;
  errorMessage: string | null;
}
