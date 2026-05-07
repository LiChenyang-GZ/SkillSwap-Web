export type HostingDisplayStatus = "pending" | "approved" | "rejected" | "cancelled" | "completed";

export interface HostingStatusMeta {
  label: string;
  variant: "default" | "secondary" | "destructive" | "outline";
  removable: boolean;
}

