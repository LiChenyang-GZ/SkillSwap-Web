package club.skillswap.common.validation;

import org.springframework.http.HttpStatus;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import javax.imageio.ImageIO;
import java.io.IOException;
import java.io.InputStream;
import java.util.Locale;
import java.util.Set;

public final class ImageUploadValidator {

    public static final String IMAGE_PNG = "image/png";
    public static final String IMAGE_JPEG = "image/jpeg";
    public static final String IMAGE_WEBP = "image/webp";
    public static final String IMAGE_GIF = "image/gif";

    private static final Set<String> SAFE_IMAGE_CONTENT_TYPES = Set.of(
            IMAGE_PNG,
            IMAGE_JPEG,
            "image/jpg",
            IMAGE_WEBP,
            IMAGE_GIF
    );

    private ImageUploadValidator() {
    }

    public static ValidatedImage validate(MultipartFile file, long maxImageBytes) {
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Image file is required.");
        }

        String declaredContentType = normalizeContentType(file.getContentType());
        if ("image/svg+xml".equals(declaredContentType)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "SVG images are not supported.");
        }
        if (declaredContentType != null && !SAFE_IMAGE_CONTENT_TYPES.contains(declaredContentType)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported image format. Please use PNG/JPG/WEBP/GIF.");
        }

        if (file.getSize() > maxImageBytes) {
            throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "Image is too large.");
        }

        String detectedContentType = detectContentType(file);
        if (detectedContentType == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Uploaded file is not a supported image.");
        }
        if (declaredContentType != null && !contentTypesMatch(declaredContentType, detectedContentType)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Uploaded file content does not match its declared image type.");
        }

        return new ValidatedImage(detectedContentType, extensionFor(detectedContentType));
    }

    public static String extensionFor(String contentType) {
        return switch (normalizeContentType(contentType)) {
            case IMAGE_PNG -> ".png";
            case IMAGE_JPEG -> ".jpg";
            case IMAGE_WEBP -> ".webp";
            case IMAGE_GIF -> ".gif";
            default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported image format.");
        };
    }

    private static String detectContentType(MultipartFile file) {
        byte[] header = readHeader(file);
        String rasterType = detectRasterHeader(header);
        if (rasterType != null) {
            try (InputStream inputStream = file.getInputStream()) {
                if (ImageIO.read(inputStream) != null) {
                    return rasterType;
                }
            } catch (IOException ex) {
                throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to read upload content.");
            }
        }

        if (isWebp(header)) {
            return IMAGE_WEBP;
        }

        return null;
    }

    private static byte[] readHeader(MultipartFile file) {
        try (InputStream inputStream = file.getInputStream()) {
            return inputStream.readNBytes(12);
        } catch (IOException ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to read upload content.");
        }
    }

    private static String detectRasterHeader(byte[] header) {
        if (startsWith(header, new int[]{0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A})) {
            return IMAGE_PNG;
        }
        if (startsWith(header, new int[]{0xFF, 0xD8, 0xFF})) {
            return IMAGE_JPEG;
        }
        if (startsWithAscii(header, "GIF87a") || startsWithAscii(header, "GIF89a")) {
            return IMAGE_GIF;
        }
        return null;
    }

    private static boolean isWebp(byte[] header) {
        return header.length >= 12
                && startsWithAscii(header, "RIFF")
                && header[8] == 'W'
                && header[9] == 'E'
                && header[10] == 'B'
                && header[11] == 'P';
    }

    private static boolean startsWith(byte[] header, int[] expected) {
        if (header.length < expected.length) {
            return false;
        }
        for (int i = 0; i < expected.length; i++) {
            if ((header[i] & 0xFF) != expected[i]) {
                return false;
            }
        }
        return true;
    }

    private static boolean startsWithAscii(byte[] header, String expected) {
        if (header.length < expected.length()) {
            return false;
        }
        for (int i = 0; i < expected.length(); i++) {
            if (header[i] != expected.charAt(i)) {
                return false;
            }
        }
        return true;
    }

    private static boolean contentTypesMatch(String declared, String detected) {
        String normalizedDeclared = normalizeContentType(declared);
        String normalizedDetected = normalizeContentType(detected);
        if ("image/jpg".equals(normalizedDeclared)) {
            normalizedDeclared = IMAGE_JPEG;
        }
        return normalizedDeclared != null && normalizedDeclared.equals(normalizedDetected);
    }

    private static String normalizeContentType(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.split(";", 2)[0].trim().toLowerCase(Locale.ROOT);
        return normalized.isBlank() ? null : normalized;
    }

    public record ValidatedImage(String contentType, String extension) {
    }
}
