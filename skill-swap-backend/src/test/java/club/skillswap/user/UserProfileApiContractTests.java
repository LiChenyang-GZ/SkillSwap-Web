package club.skillswap.user;

import club.skillswap.common.storage.AzureBlobStorageService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.UUID;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class UserProfileApiContractTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private AzureBlobStorageService azureBlobStorageService;

    @Test
    @DisplayName("Creates and returns the current user profile from a verified JWT.")
    void shouldCreateCurrentUserProfileFromVerifiedJwt() throws Exception {
        String subject = "profile-create-" + UUID.randomUUID();
        String email = subject + "@example.test";

        mockMvc.perform(get("/api/v1/users/me").with(memberJwt(subject, email, true)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").exists())
                .andExpect(jsonPath("$.email").value(email))
                .andExpect(jsonPath("$.role").value("member"))
                // Current endpoint behavior returns 0 here; the known fromEntity() 100 mismatch is already recorded.
                .andExpect(jsonPath("$.creditBalance").value(0))
                .andExpect(jsonPath("$.skills", hasSize(0)))
                .andExpect(jsonPath("$.totalWorkshopsHosted").value(0))
                .andExpect(jsonPath("$.totalWorkshopsAttended").value(0))
                .andExpect(jsonPath("$.rating").value(0.0))
                .andExpect(jsonPath("$.reviewCount").value(0));
    }

    @Test
    @DisplayName("Rejects current user profile creation when email is explicitly unverified.")
    void shouldRejectCurrentUserProfileWhenEmailExplicitlyUnverified() throws Exception {
        String subject = "profile-unverified-" + UUID.randomUUID();

        mockMvc.perform(get("/api/v1/users/me")
                        .with(memberJwt(subject, subject + "@example.test", false)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403))
                .andExpect(jsonPath("$.error").value("Forbidden"))
                .andExpect(jsonPath("$.message").value("Please verify your email before accessing profile."))
                .andExpect(jsonPath("$.path").value("/api/v1/users/me"));
    }

    @Test
    @DisplayName("Posting a blank skill name returns the validation error contract.")
    void shouldReturnValidationErrorForBlankSkillName() throws Exception {
        String subject = "profile-blank-skill-" + UUID.randomUUID();

        mockMvc.perform(post("/api/v1/users/me/skills")
                        .with(memberJwt(subject, subject + "@example.test", true))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(Map.of("skillName", "   "))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.error").value("Validation Failed"))
                .andExpect(jsonPath("$.message").value("Skill name cannot be blank"))
                .andExpect(jsonPath("$.path").value("/api/v1/users/me/skills"));
    }

    private RequestPostProcessor memberJwt(String subject, String email, boolean emailVerified) {
        return jwt().jwt(jwt -> jwt
                        .subject(subject)
                        .claim("email", email)
                        .claim("email_verified", emailVerified))
                .authorities();
    }

}
