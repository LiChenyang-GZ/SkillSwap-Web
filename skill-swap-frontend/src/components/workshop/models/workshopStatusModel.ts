export type AdminWorkshopStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'cancelled'
  | 'completed'
  | 'upcoming'
  | 'ongoing';

export type UserWorkshopStatus = 'upcoming' | 'ongoing' | 'completed';

export type WorkshopBadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline';
