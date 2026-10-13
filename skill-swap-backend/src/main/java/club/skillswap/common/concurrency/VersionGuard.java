package club.skillswap.common.concurrency;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.Objects;

/**
 * Request-level half of optimistic locking.
 *
 * <p>JPA {@code @Version} only detects a conflict between the read and the flush of a single
 * transaction. An admin's read and write are separate HTTP requests, so each write re-loads the
 * entity and would always see the latest version. The client therefore sends the version it
 * originally read, and this guard rejects the write when that version is no longer current.
 * {@code @Version} still covers the remaining race between this check and the commit.
 */
public final class VersionGuard {

    private VersionGuard() {
    }

    public static void requireCurrentVersion(Long expectedVersion, Long currentVersion, String resourceLabel) {
        if (expectedVersion == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "version is required. Reload the " + resourceLabel + " and try again."
            );
        }
        if (!Objects.equals(expectedVersion, currentVersion)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, staleMessage(resourceLabel));
        }
    }

    public static String staleMessage(String resourceLabel) {
        return "This " + resourceLabel + " was changed by another admin. Reload it to see the latest version.";
    }
}
