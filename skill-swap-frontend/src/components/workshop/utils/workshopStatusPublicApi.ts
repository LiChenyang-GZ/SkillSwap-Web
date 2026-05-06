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
  isWorkshopOpenForRegistration,
} from './workshopStatusLabels';

export type { AdminWorkshopStatus, UserWorkshopStatus, WorkshopBadgeVariant } from '../models/workshopStatusModel';
