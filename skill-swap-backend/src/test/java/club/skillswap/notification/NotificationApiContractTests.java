package club.skillswap.notification;

import club.skillswap.common.storage.AzureBlobStorageService;
import club.skillswap.notification.entity.Notification;
import club.skillswap.notification.repository.NotificationRepository;
import club.skillswap.user.entity.UserAccount;
import club.skillswap.user.repository.UserRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class NotificationApiContractTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private NotificationRepository notificationRepository;

    @MockitoBean
    private AzureBlobStorageService azureBlobStorageService;

    @Test
    @DisplayName("Lists only notifications belonging to the authenticated user.")
    void shouldListOnlyCurrentUsersNotifications() throws Exception {
        String suffix = UUID.randomUUID().toString();
        String currentSubject = "notify-current-" + suffix;
        UserAccount currentUser = saveUser(currentSubject, "Notification Current " + suffix);
        UserAccount otherUser = saveUser("notify-other-" + suffix, "Notification Other " + suffix);
        Notification currentNotification = saveNotification(currentUser, "Current notification " + suffix);
        Notification otherNotification = saveNotification(otherUser, "Other notification " + suffix);

        JsonNode notifications = performJsonArray(get("/api/v1/notifications").with(memberJwt(currentSubject)));

        JsonNode currentJson = findByTitle(notifications, currentNotification.getTitle());
        assertThat(containsTitle(notifications, otherNotification.getTitle()))
                .as("notification list must be scoped to the authenticated recipient")
                .isFalse();
        assertThat(currentJson.path("id").asText()).isEqualTo(currentNotification.getId().toString());
        assertThat(currentJson.path("userId").asText()).isEqualTo(currentUser.getId().toString());
        assertThat(currentJson.path("read").asBoolean()).isFalse();
    }

    @Test
    @DisplayName("Marking another user's notification as read returns not found.")
    void shouldReturnNotFoundWhenMarkingAnotherUsersNotificationRead() throws Exception {
        String suffix = UUID.randomUUID().toString();
        String currentSubject = "notify-mark-current-" + suffix;
        saveUser(currentSubject, "Notification Marker " + suffix);
        UserAccount otherUser = saveUser("notify-mark-other-" + suffix, "Notification Owner " + suffix);
        Notification otherNotification = saveNotification(otherUser, "Owned by someone else " + suffix);

        mockMvc.perform(post("/api/v1/notifications/{id}/read", otherNotification.getId())
                        .with(memberJwt(currentSubject)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.error").value("Not Found"))
                .andExpect(jsonPath("$.message").value("Notification not found with ID: " + otherNotification.getId()))
                .andExpect(jsonPath("$.path").value("/api/v1/notifications/" + otherNotification.getId() + "/read"));
    }

    private JsonNode performJsonArray(org.springframework.test.web.servlet.RequestBuilder request) throws Exception {
        String body = mockMvc.perform(request)
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();
        JsonNode json = objectMapper.readTree(body);
        assertThat(json.isArray()).as("endpoint must return a JSON array").isTrue();
        return json;
    }

    private JsonNode findByTitle(JsonNode array, String title) {
        for (JsonNode node : array) {
            if (title.equals(node.path("title").asText())) {
                return node;
            }
        }
        throw new AssertionError("Expected response array to contain title: " + title);
    }

    private boolean containsTitle(JsonNode array, String title) {
        for (JsonNode node : array) {
            if (title.equals(node.path("title").asText())) {
                return true;
            }
        }
        return false;
    }

    private UserAccount saveUser(String subject, String username) {
        UserAccount user = new UserAccount();
        user.setId(UUID.randomUUID());
        user.setAuthProvider("test");
        user.setAuthSubject(subject);
        user.setUsername(username);
        user.setEmail(subject + "@example.test");
        user.setRole("member");
        user.setCreditBalance(0);
        return userRepository.saveAndFlush(user);
    }

    private Notification saveNotification(UserAccount recipient, String title) {
        Notification notification = new Notification();
        notification.setRecipient(recipient);
        notification.setType("api_contract");
        notification.setTitle(title);
        notification.setMessage("Notification API contract message.");
        notification.setRead(false);
        return notificationRepository.saveAndFlush(notification);
    }

    private RequestPostProcessor memberJwt(String subject) {
        return jwt().jwt(jwt -> jwt
                        .subject(subject)
                        .claim("email", subject + "@example.test")
                        .claim("email_verified", true))
                .authorities();
    }

}
