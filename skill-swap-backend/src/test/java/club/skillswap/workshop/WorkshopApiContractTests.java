package club.skillswap.workshop;

import club.skillswap.common.storage.AzureBlobStorageService;
import club.skillswap.user.entity.UserAccount;
import club.skillswap.user.repository.UserRepository;
import club.skillswap.workshop.entity.Workshop;
import club.skillswap.workshop.repository.WorkshopParticipantRepository;
import club.skillswap.workshop.repository.WorkshopRepository;
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

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
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
class WorkshopApiContractTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private WorkshopRepository workshopRepository;

    @Autowired
    private WorkshopParticipantRepository participantRepository;

    @MockitoBean
    private AzureBlobStorageService azureBlobStorageService;

    @Test
    @DisplayName("Lists only public approved workshops for an anonymous viewer.")
    void shouldListOnlyPublicApprovedWorkshopsForAnonymousViewer() throws Exception {
        String suffix = UUID.randomUUID().toString();
        UserAccount facilitator = saveUser("facilitator-list-" + suffix, "Facilitator List " + suffix, "member");
        UserAccount attendee = saveUser("attendee-list-" + suffix, "Attendee List " + suffix, "member");
        Workshop approved = saveWorkshop(facilitator, "Approved Contract " + suffix, "approved", 5);
        Workshop pending = saveWorkshop(facilitator, "Pending Contract " + suffix, "pending", 5);
        saveParticipant(approved, attendee);

        JsonNode workshops = performJsonArray(get("/api/v1/workshops"));

        JsonNode approvedJson = findByTitle(workshops, approved.getTitle());
        assertThat(containsTitle(workshops, pending.getTitle()))
                .as("pending workshops must stay out of the public list")
                .isFalse();
        assertThat(approvedJson.path("id").asText()).isEqualTo(approved.getId().toString());
        assertThat(approvedJson.path("status").asText()).isEqualTo("upcoming");
        assertThat(approvedJson.path("currentParticipants").asInt()).isEqualTo(1);
        assertThat(approvedJson.has("contactNumber"))
                .as("public summaries omit sensitive contact details")
                .isFalse();
        assertThat(approvedJson.has("submitterEmail"))
                .as("public summaries omit submitter email")
                .isFalse();
    }

    @Test
    @DisplayName("Joining an upcoming workshop returns success and updates the detail contract.")
    void shouldJoinUpcomingWorkshopAndExposeUpdatedParticipantCount() throws Exception {
        String suffix = UUID.randomUUID().toString();
        UserAccount facilitator = saveUser("facilitator-join-" + suffix, "Facilitator Join " + suffix, "member");
        Workshop workshop = saveWorkshop(facilitator, "Join Contract " + suffix, "approved", 5);

        mockMvc.perform(post("/api/v1/workshops/{id}/join", workshop.getId())
                        .with(memberJwt("member-join-" + suffix)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Successfully joined workshop"));

        mockMvc.perform(get("/api/v1/workshops/{id}", workshop.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(workshop.getId().toString()))
                .andExpect(jsonPath("$.title").value(workshop.getTitle()))
                .andExpect(jsonPath("$.currentParticipants").value(1));
    }

    @Test
    @DisplayName("Joining the same workshop twice returns the duplicate participant error.")
    void shouldReturnBadRequestWhenJoiningAlreadyJoinedWorkshop() throws Exception {
        String suffix = UUID.randomUUID().toString();
        UserAccount facilitator = saveUser("facilitator-duplicate-" + suffix, "Facilitator Duplicate " + suffix, "member");
        Workshop workshop = saveWorkshop(facilitator, "Duplicate Contract " + suffix, "approved", 5);
        RequestPostProcessor member = memberJwt("member-duplicate-" + suffix);

        mockMvc.perform(post("/api/v1/workshops/{id}/join", workshop.getId()).with(member))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/v1/workshops/{id}/join", workshop.getId()).with(member))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.error").value("Bad Request"))
                .andExpect(jsonPath("$.message").value("User is already a participant in this workshop"))
                .andExpect(jsonPath("$.path").value("/api/v1/workshops/" + workshop.getId() + "/join"));
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

    private UserAccount saveUser(String subject, String username, String role) {
        UserAccount user = new UserAccount();
        user.setId(UUID.randomUUID());
        user.setAuthProvider("test");
        user.setAuthSubject(subject);
        user.setUsername(username);
        user.setEmail(subject + "@example.test");
        user.setRole(role);
        user.setCreditBalance(0);
        return userRepository.saveAndFlush(user);
    }

    private Workshop saveWorkshop(UserAccount facilitator, String title, String status, int maxParticipants) {
        Workshop workshop = new Workshop();
        workshop.setFacilitator(facilitator);
        workshop.setHostName(facilitator.getUsername());
        workshop.setTitle(title);
        workshop.setDescription("API contract workshop");
        workshop.setCategory("Technology");
        workshop.setDuration(60);
        workshop.setStatus(status);
        workshop.setDate(LocalDate.now().plusDays(30));
        workshop.setTime(LocalTime.NOON);
        workshop.setAttendCloseAt(LocalDateTime.now().plusDays(10));
        workshop.setIsOnline(true);
        workshop.setMaxParticipants(maxParticipants);
        workshop.setCreditCost(0);
        workshop.setCreditReward(0);
        workshop.setContactNumber("0412345678");
        workshop.setDetailsConfirmed(true);
        workshop.setSubmitterUsername(facilitator.getUsername());
        workshop.setSubmitterEmail(facilitator.getEmail());
        workshop.setHiddenByHost(false);
        return workshopRepository.saveAndFlush(workshop);
    }

    private void saveParticipant(Workshop workshop, UserAccount user) {
        club.skillswap.workshop.entity.WorkshopParticipant participant =
                new club.skillswap.workshop.entity.WorkshopParticipant();
        participant.setWorkshop(workshop);
        participant.setUser(user);
        participant.setRegistrationDate(LocalDateTime.now());
        participantRepository.saveAndFlush(participant);
    }

    private RequestPostProcessor memberJwt(String subject) {
        return jwt().jwt(jwt -> jwt
                        .subject(subject)
                        .claim("email", subject + "@example.test")
                        .claim("email_verified", true))
                .authorities();
    }

}
