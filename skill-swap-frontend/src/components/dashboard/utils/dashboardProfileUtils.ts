import { DASHBOARD_AVATAR_MAX_BYTES, DASHBOARD_SUPPORTED_AVATAR_IMAGE_TYPES } from "../constants/dashboardOptions";
import {
  DASHBOARD_AVATAR_TOO_LARGE_MESSAGE,
  DASHBOARD_AVATAR_UNSUPPORTED_MESSAGE,
} from "../constants/dashboardMessages";

export const validateAvatarFile = (file: File): string | null => {
  const contentType = String(file.type || "").toLowerCase();
  if (!DASHBOARD_SUPPORTED_AVATAR_IMAGE_TYPES.has(contentType)) {
    return DASHBOARD_AVATAR_UNSUPPORTED_MESSAGE;
  }

  if (file.size > DASHBOARD_AVATAR_MAX_BYTES) {
    return DASHBOARD_AVATAR_TOO_LARGE_MESSAGE;
  }

  return null;
};

