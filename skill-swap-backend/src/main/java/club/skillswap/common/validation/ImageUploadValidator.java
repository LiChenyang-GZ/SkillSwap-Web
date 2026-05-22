package club.skillswap.common.validation;

import org.springframework.http.HttpStatus;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import javax.imageio.ImageIO;
import java.io.ByteArrayInputStream;
import java.io.IOException;
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

        byte[] content = readContent(file);
        String detectedContentType = detectContentType(content);
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

    private static String detectContentType(byte[] content) {
        String rasterType = detectRasterHeader(content);
        if (rasterType != null) {
            try (ByteArrayInputStream inputStream = new ByteArrayInputStream(content)) {
                if (ImageIO.read(inputStream) != null) {
                    return rasterType;
                }
            } catch (IOException ex) {
                throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to read upload content.");
            }
        }

        if (isValidWebp(content)) {
            return IMAGE_WEBP;
        }

        return null;
    }

    private static byte[] readContent(MultipartFile file) {
        try {
            // Bounded by maxImageBytes before this point; keeping one byte array avoids rereading MultipartFile streams.
            return file.getBytes();
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

    private static boolean isValidWebp(byte[] content) {
        if (content.length < 20 || !startsWithAscii(content, "RIFF") || !matchesAsciiAt(content, 8, "WEBP")) {
            return false;
        }

        long riffSize = readUInt32LittleEndian(content, 4);
        if (riffSize != content.length - 8L) {
            return false;
        }

        return hasValidWebpImageChunk(content, 12, content.length, true);
    }

    private static boolean hasValidWebpImageChunk(byte[] content, int offset, int end, boolean allowExtendedChunks) {
        int cursor = offset;
        while (cursor + 8 <= end) {
            String chunkType = ascii(content, cursor, 4);
            long chunkSize = readUInt32LittleEndian(content, cursor + 4);
            if (chunkSize > Integer.MAX_VALUE) {
                return false;
            }

            int dataStart = cursor + 8;
            long dataEndLong = dataStart + chunkSize;
            if (dataEndLong > end) {
                return false;
            }
            int dataEnd = (int) dataEndLong;
            int dataSize = (int) chunkSize;

            if ("VP8 ".equals(chunkType) && isValidVp8Chunk(content, dataStart, dataSize)) {
                return true;
            }
            if ("VP8L".equals(chunkType) && isValidVp8LChunk(content, dataStart, dataSize)) {
                return true;
            }
            if (allowExtendedChunks && "VP8X".equals(chunkType) && !isValidVp8XChunk(content, dataStart, dataSize)) {
                return false;
            }
            if (allowExtendedChunks && "ANMF".equals(chunkType)) {
                if (dataSize < 16) {
                    return false;
                }
                return hasValidWebpImageChunk(content, dataStart + 16, dataEnd, false);
            }

            cursor = dataEnd + (dataSize % 2);
        }

        return false;
    }

    private static boolean isValidVp8Chunk(byte[] content, int dataStart, int dataSize) {
        if (dataSize < 10 || dataStart + dataSize > content.length) {
            return false;
        }
        if ((content[dataStart + 3] & 0xFF) != 0x9D
                || (content[dataStart + 4] & 0xFF) != 0x01
                || (content[dataStart + 5] & 0xFF) != 0x2A) {
            return false;
        }

        int width = readUInt16LittleEndian(content, dataStart + 6) & 0x3FFF;
        int height = readUInt16LittleEndian(content, dataStart + 8) & 0x3FFF;
        return width > 0 && height > 0;
    }

    private static boolean isValidVp8LChunk(byte[] content, int dataStart, int dataSize) {
        if (dataSize < 5 || dataStart + dataSize > content.length || (content[dataStart] & 0xFF) != 0x2F) {
            return false;
        }

        int b4 = content[dataStart + 4] & 0xFF;
        return (b4 & 0xE0) == 0;
    }

    private static boolean isValidVp8XChunk(byte[] content, int dataStart, int dataSize) {
        if (dataSize != 10 || dataStart + dataSize > content.length) {
            return false;
        }
        if ((content[dataStart] & 0x03) != 0) {
            return false;
        }
        if (content[dataStart + 1] != 0 || content[dataStart + 2] != 0 || content[dataStart + 3] != 0) {
            return false;
        }

        return true;
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

    private static boolean matchesAsciiAt(byte[] bytes, int offset, String expected) {
        if (offset < 0 || bytes.length < offset + expected.length()) {
            return false;
        }
        for (int i = 0; i < expected.length(); i++) {
            if (bytes[offset + i] != expected.charAt(i)) {
                return false;
            }
        }
        return true;
    }

    private static String ascii(byte[] bytes, int offset, int length) {
        StringBuilder builder = new StringBuilder(length);
        for (int i = 0; i < length; i++) {
            builder.append((char) bytes[offset + i]);
        }
        return builder.toString();
    }

    private static int readUInt16LittleEndian(byte[] bytes, int offset) {
        return (bytes[offset] & 0xFF) | ((bytes[offset + 1] & 0xFF) << 8);
    }

    private static long readUInt32LittleEndian(byte[] bytes, int offset) {
        return (bytes[offset] & 0xFFL)
                | ((bytes[offset + 1] & 0xFFL) << 8)
                | ((bytes[offset + 2] & 0xFFL) << 16)
                | ((bytes[offset + 3] & 0xFFL) << 24);
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
