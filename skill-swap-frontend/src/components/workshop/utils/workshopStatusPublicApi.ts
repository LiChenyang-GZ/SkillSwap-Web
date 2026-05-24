export {
  normalizeAdminWorkshopStatus,
  resolveUserWorkshopStatus,
  isUserWorkshopVisible,
} from './workshopStatusRules';

export {
  getUserWorkshopStatusLabel,
  getUserWorkshopStatusBadgeVariant,
  getWorkshopAccessLabel,
  isUserWorkshopUpcoming,
  isUserWorkshopUpcomingOrOngoing,
} from './workshopStatusLabels';

export type { AdminWorkshopStatus, UserWorkshopStatus, WorkshopBadgeVariant } from '../models/workshopStatusModel';
