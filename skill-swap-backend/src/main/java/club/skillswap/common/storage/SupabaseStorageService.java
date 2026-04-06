package club.skillswap.common.storage;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;

@Service
public class SupabaseStorageService {

    private final HttpClient httpClient = HttpClient.newHttpClient();

    @Value("${app.storage.supabase.url:}")
    private String supabaseUrl;

    @Value("${app.storage.supabase.service-role-key:}")
    private String serviceRoleKey;

    @Value("${app.storage.supabase.bucket:skillswap-media}")
    private String bucket;

    public String uploadImage(MultipartFile file, String objectPath) {
        String normalizedBaseUrl = normalizeBaseUrl(supabaseUrl);
        String normalizedBucket = trimToNull(bucket);
        String normalizedServiceRoleKey = trimToNull(serviceRoleKey);
        String normalizedObjectPath = normalizeObjectPath(objectPath);

        if (normalizedBaseUrl == null || normalizedBucket == null || normalizedServiceRoleKey == null) {
            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "Supabase storage is not configured. Missing URL, bucket, or service role key."
            );
        }

        byte[] fileBytes;
        try {
            fileBytes = file.getBytes();
        } catch (IOException ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to read upload content.");
        }

        String encodedBucket = encodePathSegment(normalizedBucket);
        String encodedObjectPath = encodeObjectPath(normalizedObjectPath);

        String uploadUrl = normalizedBaseUrl + "/storage/v1/object/" + encodedBucket + "/" + encodedObjectPath;

        HttpRequest request = HttpRequest.newBuilder(URI.create(uploadUrl))
                .header("Authorization", "Bearer " + normalizedServiceRoleKey)
                .header("apikey", normalizedServiceRoleKey)
                .header("x-upsert", "true")
                .header("Content-Type", resolveContentType(file.getContentType()))
                .POST(HttpRequest.BodyPublishers.ofByteArray(fileBytes))
                .build();

        HttpResponse<String> response;
        try {
            response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        } catch (IOException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Supabase storage upload failed.");
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Upload was interrupted.");
        }

        int statusCode = response.statusCode();
        if (statusCode < 200 || statusCode >= 300) {
            String body = trimToNull(response.body());
            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    body != null ? "Supabase storage upload failed: " + body : "Supabase storage upload failed."
            );
        }

        return normalizedBaseUrl + "/storage/v1/object/public/" + encodedBucket + "/" + encodedObjectPath;
    }

    private String normalizeBaseUrl(String value) {
        String trimmed = trimToNull(value);
        if (trimmed == null) {
            return null;
        }
        return trimmed.endsWith("/") ? trimmed.substring(0, trimmed.length() - 1) : trimmed;
    }

    private String normalizeObjectPath(String value) {
        String normalized = trimToNull(value);
        if (normalized == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid storage object path.");
        }

        normalized = normalized.replace('\\', '/');
        while (normalized.startsWith("/")) {
            normalized = normalized.substring(1);
        }
        normalized = normalized.replaceAll("/{2,}", "/");

        if (normalized.isBlank() || normalized.contains("..")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid storage object path.");
        }

        return normalized;
    }

    private String resolveContentType(String contentType) {
        String normalized = trimToNull(contentType);
        return normalized == null ? "application/octet-stream" : normalized;
    }

    private String encodeObjectPath(String objectPath) {
        String[] segments = objectPath.split("/");
        StringBuilder encoded = new StringBuilder();
        for (int i = 0; i < segments.length; i++) {
            if (i > 0) {
                encoded.append('/');
            }
            encoded.append(encodePathSegment(segments[i]));
        }
        return encoded.toString();
    }

    private String encodePathSegment(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8).replace("+", "%20");
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
