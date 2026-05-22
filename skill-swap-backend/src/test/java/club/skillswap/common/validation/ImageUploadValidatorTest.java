package club.skillswap.common.validation;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.server.ResponseStatusException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ImageUploadValidatorTest {

    @Test
    void acceptsValidLosslessWebpContainer() {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "valid.webp",
                ImageUploadValidator.IMAGE_WEBP,
                validLosslessWebpBody()
        );

        ImageUploadValidator.ValidatedImage image = ImageUploadValidator.validate(file, 1024);

        assertThat(image.contentType()).isEqualTo(ImageUploadValidator.IMAGE_WEBP);
        assertThat(image.extension()).isEqualTo(".webp");
    }

    @Test
    void rejectsForgedWebpHeaderWithoutValidImagePayload() {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "fake.webp",
                ImageUploadValidator.IMAGE_WEBP,
                forgedWebpWithInvalidVp8Payload()
        );

        assertThatThrownBy(() -> ImageUploadValidator.validate(file, 1024))
                .isInstanceOfSatisfying(ResponseStatusException.class, ex ->
                        assertThat(ex.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST));
    }

    @Test
    void rejectsCorruptPngAsBadRequest() {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "corrupt.png",
                ImageUploadValidator.IMAGE_PNG,
                new byte[]{(byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A}
        );

        assertThatThrownBy(() -> ImageUploadValidator.validate(file, 1024))
                .isInstanceOfSatisfying(ResponseStatusException.class, ex ->
                        assertThat(ex.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST));
    }

    private byte[] forgedWebpWithInvalidVp8Payload() {
        return new byte[]{
                'R', 'I', 'F', 'F',
                16, 0, 0, 0,
                'W', 'E', 'B', 'P',
                'V', 'P', '8', ' ',
                4, 0, 0, 0,
                0, 0, 0, 0
        };
    }

    private byte[] validLosslessWebpBody() {
        return new byte[]{
                'R', 'I', 'F', 'F',
                18, 0, 0, 0,
                'W', 'E', 'B', 'P',
                'V', 'P', '8', 'L',
                5, 0, 0, 0,
                0x2F, 0, 0, 0, 0,
                0
        };
    }
}
