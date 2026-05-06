import type { NotificationItem } from "../../../types/notification";

export type NotificationSortDirection = "desc";

export type NotificationSortableItem = Pick<NotificationItem, "timestamp">;
