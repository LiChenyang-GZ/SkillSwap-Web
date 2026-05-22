package club.skillswap.common.validation;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.net.URI;
import java.net.URISyntaxException;
import java.util.Locale;

public final class AzureBlobUrlValidator {

    private static final String AZURE_BLOB_HOST_SUFFIX = ".blob.core.windows.net";
    private static final String ACCOUNT_NAME_PREFIX = "AccountName=";

    private AzureBlobUrlValidator() {
    }

    public static String requireAzureBlobUrl(String value, String fieldName, String connectionString) {
        String normalized = trimToNull(value);
        if (normalized == null) {
            return null;
        }
        String allowedHost = resolveAllowedHost(connectionString);

        URI uri;
        try {
            uri = new URI(normalized);
        } catch (URISyntaxException ex) {
            throw invalid(fieldName);
        }

        String scheme = uri.getScheme();
        String host = uri.getHost();
        if (scheme == null || host == null || uri.getRawUserInfo() != null) {
            throw invalid(fieldName);
        }

        String normalizedScheme = scheme.toLowerCase(Locale.ROOT);
        String normalizedHost = host.toLowerCase(Locale.ROOT);
        if (!"https".equals(normalizedScheme) || !normalizedHost.equals(allowedHost)) {
            throw invalid(fieldName);
        }

        return normalized;
    }

    private static String resolveAllowedHost(String connectionString) {
        String normalizedConnectionString = trimToNull(connectionString);
        if (normalizedConnectionString == null) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Azure Blob storage is not configured.");
        }

        String[] parts = normalizedConnectionString.split(";");
        for (String part : parts) {
            String trimmed = part.trim();
            if (trimmed.startsWith(ACCOUNT_NAME_PREFIX)) {
                String accountName = trimToNull(trimmed.substring(ACCOUNT_NAME_PREFIX.length()));
                if (accountName != null && accountName.matches("[a-z0-9]{3,24}")) {
                    return accountName.toLowerCase(Locale.ROOT) + AZURE_BLOB_HOST_SUFFIX;
                }
            }
        }

        throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Azure Blob account name is not configured.");
    }

    private static ResponseStatusException invalid(String fieldName) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, fieldName + " must be an Azure Blob HTTPS URL.");
    }

    private static String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
