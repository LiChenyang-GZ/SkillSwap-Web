const DEFAULT_IMAGE_UPLOAD_MAX_BYTES = 10 * 1024 * 1024;
const IMAGE_UPLOAD_ALLOWED_MIME_TYPE_VALUES = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
];

const parsedImageUploadMaxBytes = Number(import.meta.env.VITE_IMAGE_UPLOAD_MAX_BYTES);

export const IMAGE_UPLOAD_ALLOWED_MIME_TYPES = new Set(IMAGE_UPLOAD_ALLOWED_MIME_TYPE_VALUES);
export const IMAGE_UPLOAD_ACCEPT = IMAGE_UPLOAD_ALLOWED_MIME_TYPE_VALUES.join(",");
export const IMAGE_UPLOAD_FORMATS_LABEL = "PNG/JPG/WEBP/GIF";
export const IMAGE_UPLOAD_MAX_BYTES =
  Number.isFinite(parsedImageUploadMaxBytes) && parsedImageUploadMaxBytes > 0
    ? parsedImageUploadMaxBytes
    : DEFAULT_IMAGE_UPLOAD_MAX_BYTES;

export const IMAGE_UPLOAD_MAX_LABEL = `${Math.round(IMAGE_UPLOAD_MAX_BYTES / (1024 * 1024))} MB`;

export const IMAGE_UPLOAD_UNSUPPORTED_MESSAGE = `Unsupported image format. Please use ${IMAGE_UPLOAD_FORMATS_LABEL}.`;
export const IMAGE_UPLOAD_TOO_LARGE_MESSAGE = `Image is too large. Please upload an image up to ${IMAGE_UPLOAD_MAX_LABEL}.`;
