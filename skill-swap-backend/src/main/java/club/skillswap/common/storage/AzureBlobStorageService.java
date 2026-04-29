package club.skillswap.common.storage;

import com.azure.storage.blob.BlobClient;
import com.azure.storage.blob.BlobContainerClient;
import com.azure.storage.blob.BlobServiceClient;
import com.azure.storage.blob.BlobServiceClientBuilder;
import com.azure.storage.blob.models.BlobHttpHeaders;
import com.azure.storage.blob.models.BlobStorageException;
import com.azure.storage.blob.sas.BlobSasPermission;
import com.azure.storage.blob.sas.BlobServiceSasSignatureValues;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.io.InputStream;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.OffsetDateTime;

@Service
public class AzureBlobStorageService {

    private static final Logger log = LoggerFactory.getLogger(AzureBlobStorageService.class);

    @Value("${app.storage.azure.blob.connection-string:}")
    private String connectionString;

    @Value("${app.storage.azure.blob.container:memories}")
    private String containerName;

    /**
     * If > 0, returns a read-only SAS URL valid for the given number of days.
     * If 0, returns the plain blob URL.
     */
    @Value("${app.storage.azure.blob.sas-valid-days:0}")
    private long sasValidDays;

    public String uploadImage(MultipartFile file, String objectPath) {
        String normalizedConnectionString = trimToNull(connectionString);
        String normalizedContainerName = trimToNull(containerName);
        String normalizedObjectPath = normalizeObjectPath(objectPath);

        if (normalizedConnectionString == null || normalizedContainerName == null) {
            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "Azure Blob storage is not configured. Missing connection string or container name."
            );
        }

        BlobContainerClient container = buildContainerClient(normalizedConnectionString, normalizedContainerName);
        try {
            container.createIfNotExists();
        } catch (BlobStorageException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Failed to access Azure Blob container.");
        }

        BlobClient blobClient = container.getBlobClient(normalizedObjectPath);
        try (InputStream inputStream = file.getInputStream()) {
            blobClient.upload(inputStream, file.getSize(), true);
            String contentType = trimToNull(file.getContentType());
            if (contentType != null) {
                blobClient.setHttpHeaders(new BlobHttpHeaders().setContentType(contentType));
            }
        } catch (IOException ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to read upload content.");
        } catch (BlobStorageException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Azure Blob upload failed.");
        }

        String blobUrl = blobClient.getBlobUrl();
        if (sasValidDays <= 0) {
            return blobUrl;
        }

        try {
            return blobUrl + "?" + generateReadSas(blobClient, Duration.ofDays(sasValidDays));
        } catch (RuntimeException ex) {
            log.warn("Failed to generate SAS for blob {}: {}", blobUrl, ex.getMessage());
            return blobUrl;
        }
    }

    public void deleteByUrlQuietly(String url) {
        String normalizedUrl = trimToNull(url);
        if (normalizedUrl == null) {
            return;
        }

        try {
            deleteByUrl(normalizedUrl);
        } catch (ResponseStatusException ex) {
            log.warn("Failed to delete Azure blob for URL {}: {}", normalizedUrl, ex.getReason());
        }
    }

    public void deleteByUrl(String url) {
        String normalizedConnectionString = trimToNull(connectionString);
        String normalizedContainerName = trimToNull(containerName);
        if (normalizedConnectionString == null || normalizedContainerName == null) {
            return;
        }

        BlobContainerClient container = buildContainerClient(normalizedConnectionString, normalizedContainerName);
        String containerPrefix = container.getBlobContainerUrl();

        String candidate = stripQueryAndFragment(url);
        if (!candidate.startsWith(containerPrefix + "/")) {
            return;
        }

        String encodedBlobName = candidate.substring((containerPrefix + "/").length());
        String blobName = decodePath(encodedBlobName);
        blobName = normalizeObjectPath(blobName);

        try {
            container.getBlobClient(blobName).deleteIfExists();
        } catch (BlobStorageException ex) {
            if (ex.getStatusCode() == HttpStatus.NOT_FOUND.value()) {
                return;
            }
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Azure Blob delete failed.");
        }
    }

    private BlobContainerClient buildContainerClient(String connectionString, String containerName) {
        BlobServiceClient serviceClient = new BlobServiceClientBuilder()
                .connectionString(connectionString)
                .buildClient();
        return serviceClient.getBlobContainerClient(containerName);
    }

    private String generateReadSas(BlobClient blobClient, Duration duration) {
        OffsetDateTime startsOn = OffsetDateTime.now().minusMinutes(5);
        OffsetDateTime expiresOn = OffsetDateTime.now().plus(duration);

        BlobSasPermission permission = new BlobSasPermission().setReadPermission(true);
        BlobServiceSasSignatureValues values = new BlobServiceSasSignatureValues(expiresOn, permission)
                .setStartTime(startsOn);

        return blobClient.generateSas(values);
    }

    private String stripQueryAndFragment(String url) {
        String candidate = url;
        int queryIndex = candidate.indexOf('?');
        if (queryIndex >= 0) {
            candidate = candidate.substring(0, queryIndex);
        }
        int hashIndex = candidate.indexOf('#');
        if (hashIndex >= 0) {
            candidate = candidate.substring(0, hashIndex);
        }
        return candidate;
    }

    private String decodePath(String encoded) {
        if (encoded == null || encoded.isBlank()) {
            return "";
        }

        String[] segments = encoded.split("/");
        StringBuilder decoded = new StringBuilder();
        for (String segment : segments) {
            if (segment.isBlank()) {
                continue;
            }
            if (decoded.length() > 0) {
                decoded.append('/');
            }
            decoded.append(URLDecoder.decode(segment, StandardCharsets.UTF_8));
        }
        return decoded.toString();
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

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
