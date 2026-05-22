package club.skillswap.common.storage;

import com.azure.storage.blob.BlobClient;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class AzureBlobStorageServiceTest {

    @Test
    void sasGenerationFailureDoesNotFallBackToPlainUrlWhenSasIsRequired() {
        AzureBlobStorageService service = new AzureBlobStorageService();
        BlobClient blobClient = mock(BlobClient.class);
        ReflectionTestUtils.setField(service, "sasValidDays", 1L);
        when(blobClient.generateSas(any())).thenThrow(new RuntimeException("boom"));

        assertThatThrownBy(() -> service.buildReturnedUrl(blobClient, "https://account.blob.core.windows.net/media/a.png"))
                .isInstanceOfSatisfying(ResponseStatusException.class, ex ->
                        assertThat(ex.getStatusCode()).isEqualTo(HttpStatus.BAD_GATEWAY));
    }
}
