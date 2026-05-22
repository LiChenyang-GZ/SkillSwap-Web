package club.skillswap;

import club.skillswap.user.entity.UserAccount;
import club.skillswap.user.repository.UserRepository;
import club.skillswap.workshop.entity.Workshop;
import club.skillswap.workshop.repository.WorkshopRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.RequestBuilder;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class SecurityRegressionTests {

    private static final String TEST_BLOB_URL = "https://skillswapstorage.blob.core.windows.net/media/test.png";
    private static final String TEST_WEBP_BLOB_URL = "https://skillswapstorage.blob.core.windows.net/media/test.webp";

    private static final String WORKSHOP_JSON = """
            {
              "hostName": "Test Host",
              "title": "Test Workshop",
              "description": "A short description",
              "category": "Technology",
              "duration": 60,
              "date": "2030-01-01",
              "time": "10:00:00",
              "isOnline": true,
              "contactNumber": "0412345678",
              "detailsConfirmed": true
            }
            """;

    private static final String MEMORY_JSON = """
            {
              "title": "Test Memory",
              "slug": "test-memory",
              "content": "Body",
              "status": "draft"
            }
            """;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private WorkshopRepository workshopRepository;

    @MockitoBean
    private club.skillswap.common.storage.AzureBlobStorageService azureBlobStorageService;

    @Test
    void adminCanCallAdminWorkshopList() throws Exception {
        mockMvc.perform(get("/api/v1/admin/workshops").with(adminJwt("admin-workshop-list")))
                .andExpect(status().isOk());
    }

    @Test
    void memberCanUploadValidPng() throws Exception {
        when(azureBlobStorageService.uploadImage(any(), anyString(), anyString())).thenReturn(TEST_BLOB_URL);

        mockMvc.perform(multipart("/api/v1/users/me/avatar")
                        .file(validPngFile("avatar.png"))
                        .contentType(MediaType.MULTIPART_FORM_DATA)
                        .with(memberJwt("member-valid-png-upload")))
                .andExpect(status().isOk());
    }

    @Test
    void memberCanUploadValidWebp() throws Exception {
        when(azureBlobStorageService.uploadImage(any(), anyString(), anyString())).thenReturn(TEST_WEBP_BLOB_URL);

        mockMvc.perform(multipart("/api/v1/users/me/avatar")
                        .file(validWebpFile("avatar.webp"))
                        .contentType(MediaType.MULTIPART_FORM_DATA)
                        .with(memberJwt("member-valid-webp-upload")))
                .andExpect(status().isOk());
    }

    @Test
    void adminCanCreateMemoryWithAzureCoverUrl() throws Exception {
        mockMvc.perform(post("/api/v1/admin/memories")
                        .with(adminJwt("admin-memory-create-valid-cover"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(Map.of(
                                "title", "Valid Cover Memory",
                                "slug", "valid-cover-memory-" + UUID.randomUUID(),
                                "coverUrl", TEST_BLOB_URL,
                                "status", "published"
                        ))))
                .andExpect(status().isCreated());
    }

    @Test
    void memberCannotCallAnyAdminEndpoint() throws Exception {
        for (Function<RequestPostProcessor, RequestBuilder> requestFactory : adminEndpointRequests()) {
            mockMvc.perform(requestFactory.apply(memberJwt("member-admin-denied-" + UUID.randomUUID())))
                    .andExpect(status().isForbidden());
        }
    }

    @Test
    void anonymousCannotCallAnyAdminEndpoint() throws Exception {
        for (RequestBuilder request : anonymousAdminEndpointRequests()) {
            mockMvc.perform(request)
                    .andExpect(status().isUnauthorized());
        }
    }

    @Test
    void memberCannotCallAdminWorkshopDetail() throws Exception {
        mockMvc.perform(get("/api/v1/admin/workshops/1").with(memberJwt("member-workshop-detail")))
                .andExpect(status().isForbidden());
    }

    @Test
    void memberCannotDeleteWorkshopThroughNonAdminWorkshopEndpoint() throws Exception {
        mockMvc.perform(delete("/api/v1/workshops/1").with(memberJwt("member-delete-workshop")))
                .andExpect(status().isForbidden());
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "https://evil.example/avatar.png",
            "data:image/svg+xml,<svg></svg>",
            "javascript:alert(1)"
    })
    void patchProfileIgnoresAvatarUrl(String avatarUrl) throws Exception {
        String subject = "avatar-url-ignored-" + UUID.randomUUID();

        mockMvc.perform(patch("/api/v1/users/me")
                        .with(memberJwt(subject))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(Map.of("avatarUrl", avatarUrl))))
                .andExpect(status().isOk());

        UserAccount user = userRepository.findByAuthSubject(subject).orElseThrow();
        assertThat(user.getAvatarUrl()).isNull();
    }

    @Test
    void memoryCoverUrlMustBeAzureBlobUrl() throws Exception {
        mockMvc.perform(post("/api/v1/admin/memories")
                        .with(adminJwt("admin-memory-url"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(Map.of(
                                "title", "Blocked Memory URL",
                                "slug", "blocked-memory-url-" + UUID.randomUUID(),
                                "coverUrl", "https://evil.example/cover.png",
                                "status", "draft"
                        ))))
                .andExpect(status().isBadRequest());
    }

    @Test
    void memoryCoverUrlMustUseConfiguredAzureBlobAccount() throws Exception {
        mockMvc.perform(post("/api/v1/admin/memories")
                        .with(adminJwt("admin-memory-wrong-azure-account"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(Map.of(
                                "title", "Blocked Azure Account",
                                "slug", "blocked-azure-account-" + UUID.randomUUID(),
                                "coverUrl", "https://evilattacker.blob.core.windows.net/media/cover.png",
                                "status", "draft"
                        ))))
                .andExpect(status().isBadRequest());
    }

    @Test
    void avatarUploadRejectsSvgContentType() throws Exception {
        mockMvc.perform(multipart("/api/v1/users/me/avatar")
                        .file(svgBytes())
                        .contentType(MediaType.MULTIPART_FORM_DATA)
                        .with(memberJwt("member-svg-avatar")))
                .andExpect(status().isBadRequest());
    }

    @Test
    void workshopImageUploadRejectsSvgContentType() throws Exception {
        Long workshopId = createWorkshop();

        mockMvc.perform(multipart("/api/v1/admin/workshops/{id}/image", workshopId)
                        .file(svgBytes())
                        .contentType(MediaType.MULTIPART_FORM_DATA)
                        .with(adminJwt("admin-svg-workshop")))
                .andExpect(status().isBadRequest());
    }

    @Test
    void memoryMediaUploadRejectsSvgContentType() throws Exception {
        mockMvc.perform(multipart("/api/v1/admin/memories/media")
                        .file(svgBytes())
                        .contentType(MediaType.MULTIPART_FORM_DATA)
                        .with(adminJwt("admin-svg-memory")))
                .andExpect(status().isBadRequest());
    }

    @Test
    void avatarUploadRejectsClaimedPngWithSvgContent() throws Exception {
        mockMvc.perform(multipart("/api/v1/users/me/avatar")
                        .file(mockFile("avatar.png", MediaType.IMAGE_PNG_VALUE, svgBody()))
                        .contentType(MediaType.MULTIPART_FORM_DATA)
                        .with(memberJwt("member-fake-png-avatar")))
                .andExpect(status().isBadRequest());
    }

    @Test
    void workshopImageUploadRejectsClaimedPngWithHtmlContent() throws Exception {
        Long workshopId = createWorkshop();

        mockMvc.perform(multipart("/api/v1/admin/workshops/{id}/image", workshopId)
                        .file(mockFile("workshop.png", MediaType.IMAGE_PNG_VALUE, htmlBody()))
                        .contentType(MediaType.MULTIPART_FORM_DATA)
                        .with(adminJwt("admin-fake-png-workshop")))
                .andExpect(status().isBadRequest());
    }

    @Test
    void memoryMediaUploadRejectsClaimedPngWithSvgContent() throws Exception {
        mockMvc.perform(multipart("/api/v1/admin/memories/media")
                        .file(mockFile("memory.png", MediaType.IMAGE_PNG_VALUE, svgBody()))
                        .contentType(MediaType.MULTIPART_FORM_DATA)
                        .with(adminJwt("admin-fake-png-memory")))
                .andExpect(status().isBadRequest());
    }

    private List<Function<RequestPostProcessor, RequestBuilder>> adminEndpointRequests() {
        return List.of(
                auth -> get("/api/v1/admin/hello").with(auth),
                auth -> get("/api/v1/admin/workshops").with(auth),
                auth -> get("/api/v1/admin/workshops/pending").with(auth),
                auth -> get("/api/v1/admin/workshops/1").with(auth),
                auth -> put("/api/v1/admin/workshops/1").with(auth).contentType(MediaType.APPLICATION_JSON).content(WORKSHOP_JSON),
                auth -> post("/api/v1/admin/workshops/1/approve").with(auth),
                auth -> post("/api/v1/admin/workshops/1/reject").with(auth).contentType(MediaType.APPLICATION_JSON).content("{\"comment\":\"No\"}"),
                auth -> post("/api/v1/admin/workshops/1/cancel").with(auth),
                auth -> multipart("/api/v1/admin/workshops/1/image").file(pngHeaderOnly()).with(auth),
                auth -> get("/api/v1/admin/memories").with(auth),
                auth -> post("/api/v1/admin/memories").with(auth).contentType(MediaType.APPLICATION_JSON).content(MEMORY_JSON),
                auth -> put("/api/v1/admin/memories/1").with(auth).contentType(MediaType.APPLICATION_JSON).content(MEMORY_JSON),
                auth -> delete("/api/v1/admin/memories/1").with(auth),
                auth -> post("/api/v1/admin/memories/1/lock").with(auth),
                auth -> delete("/api/v1/admin/memories/1/lock").with(auth),
                auth -> multipart("/api/v1/admin/memories/media").file(pngHeaderOnly()).with(auth)
        );
    }

    private List<RequestBuilder> anonymousAdminEndpointRequests() {
        return adminEndpointRequests().stream()
                .map(factory -> factory.apply(request -> request))
                .toList();
    }

    private RequestPostProcessor memberJwt(String subject) {
        return jwt().jwt(jwt -> jwt
                        .subject(subject)
                        .claim("email", subject + "@example.test")
                        .claim("email_verified", true))
                .authorities();
    }

    private RequestPostProcessor adminJwt(String subject) {
        return jwt().jwt(jwt -> jwt
                        .subject(subject)
                        .claim("email", subject + "@example.test")
                        .claim("email_verified", true))
                .authorities(new SimpleGrantedAuthority("ROLE_ADMIN"));
    }

    private Long createWorkshop() {
        UserAccount facilitator = new UserAccount();
        facilitator.setId(UUID.randomUUID());
        facilitator.setAuthProvider("test");
        facilitator.setAuthSubject("facilitator-" + UUID.randomUUID());
        facilitator.setUsername("Facilitator");
        facilitator.setEmail("facilitator-" + UUID.randomUUID() + "@example.test");
        facilitator.setRole("member");
        userRepository.saveAndFlush(facilitator);

        Workshop workshop = new Workshop();
        workshop.setFacilitator(facilitator);
        workshop.setHostName("Facilitator");
        workshop.setTitle("Upload Test Workshop");
        workshop.setDescription("Upload test");
        workshop.setCategory("Technology");
        workshop.setStatus("pending");
        workshop.setDate(LocalDate.now().plusDays(30));
        workshop.setTime(LocalTime.NOON);
        workshop.setDuration(60);
        workshop.setIsOnline(true);
        workshop.setContactNumber("0412345678");
        workshop.setDetailsConfirmed(true);
        return workshopRepository.saveAndFlush(workshop).getId();
    }

    private byte[] svgBody() {
        return "<svg xmlns=\"http://www.w3.org/2000/svg\"><script>alert(1)</script></svg>".getBytes();
    }

    private byte[] htmlBody() {
        return "<html><body>not an image</body></html>".getBytes();
    }

    private MockMultipartFile svgBytes() {
        return new MockMultipartFile(
                "file",
                "evil.svg",
                "image/svg+xml",
                svgBody()
        );
    }

    private MockMultipartFile mockFile(String fileName, String contentType, byte[] content) {
        return new MockMultipartFile(
                "file",
                fileName,
                contentType,
                content
        );
    }

    private MockMultipartFile pngHeaderOnly() {
        return new MockMultipartFile(
                "file",
                "image.png",
                MediaType.IMAGE_PNG_VALUE,
                new byte[]{(byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A}
        );
    }

    private MockMultipartFile validPngFile(String fileName) {
        return new MockMultipartFile(
                "file",
                fileName,
                MediaType.IMAGE_PNG_VALUE,
                java.util.Base64.getDecoder().decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=")
        );
    }

    private MockMultipartFile validWebpFile(String fileName) {
        return new MockMultipartFile(
                "file",
                fileName,
                "image/webp",
                validLosslessWebpBody()
        );
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
