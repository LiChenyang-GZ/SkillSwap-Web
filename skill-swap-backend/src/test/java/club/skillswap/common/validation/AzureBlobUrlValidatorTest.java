package club.skillswap.common.validation;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class AzureBlobUrlValidatorTest {

    private static final String CONNECTION_STRING = "DefaultEndpointsProtocol=https;AccountName=skillswapstorage;AccountKey=dummy;EndpointSuffix=core.windows.net";

    @Test
    void acceptsUrlForConfiguredStorageAccount() {
        String url = "https://skillswapstorage.blob.core.windows.net/media/cover.png";

        assertThat(AzureBlobUrlValidator.requireAzureBlobUrl(url, "coverUrl", CONNECTION_STRING)).isEqualTo(url);
    }

    @Test
    void rejectsUrlForDifferentAzureStorageAccount() {
        assertThatThrownBy(() -> AzureBlobUrlValidator.requireAzureBlobUrl(
                "https://evilattacker.blob.core.windows.net/media/cover.png",
                "coverUrl",
                CONNECTION_STRING
        )).isInstanceOfSatisfying(ResponseStatusException.class, ex ->
                assertThat(ex.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST));
    }
}
