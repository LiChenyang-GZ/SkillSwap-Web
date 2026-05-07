import { IMAGE_UPLOAD_MAX_BYTES } from "../../../shared/constants/uploadLimits";

export const DASHBOARD_SUPPORTED_AVATAR_IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
  "image/svg+xml",
]);

export const DASHBOARD_AVATAR_MAX_BYTES = IMAGE_UPLOAD_MAX_BYTES;

