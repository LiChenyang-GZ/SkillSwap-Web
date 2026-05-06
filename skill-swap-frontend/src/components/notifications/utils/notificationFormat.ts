export function formatNotificationTimestamp(timestamp?: string): string {
  if (!timestamp) {
    return "";
  }
  return new Date(timestamp).toLocaleString();
}
