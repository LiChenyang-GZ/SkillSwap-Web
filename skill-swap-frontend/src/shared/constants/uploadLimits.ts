const DEFAULT_IMAGE_UPLOAD_MAX_BYTES = 10 * 1024 * 1024;

const parsedImageUploadMaxBytes = Number(import.meta.env.VITE_IMAGE_UPLOAD_MAX_BYTES);

export const IMAGE_UPLOAD_MAX_BYTES =
  Number.isFinite(parsedImageUploadMaxBytes) && parsedImageUploadMaxBytes > 0
    ? parsedImageUploadMaxBytes
    : DEFAULT_IMAGE_UPLOAD_MAX_BYTES;

export const IMAGE_UPLOAD_MAX_MB = Math.round(IMAGE_UPLOAD_MAX_BYTES / (1024 * 1024));
export const IMAGE_UPLOAD_MAX_LABEL = `${IMAGE_UPLOAD_MAX_MB} MB`;

export const IMAGE_UPLOAD_TOO_LARGE_MESSAGE = `Image is too large. Please upload an image up to ${IMAGE_UPLOAD_MAX_LABEL}.`;
