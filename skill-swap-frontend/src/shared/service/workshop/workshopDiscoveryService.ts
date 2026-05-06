import { workshopAPI } from '../../../lib/api';

// Keep a page-domain service API, but delegate to the single workshopAPI implementation.
export const workshopDiscoveryService = {
  getPublic: workshopAPI.getPublic,
  getMine: workshopAPI.getMine,
  getAttending: workshopAPI.getAttending,
  getById: workshopAPI.getById,
  requestApproval: workshopAPI.requestApproval,
};
