package club.skillswap.concurrency;

import club.skillswap.common.storage.AzureBlobStorageService;
import club.skillswap.memory.entity.MemoryEntry;
import club.skillswap.memory.repository.MemoryEntryRepository;
import club.skillswap.user.entity.UserAccount;
import club.skillswap.user.repository.UserRepository;
import club.skillswap.workshop.entity.Workshop;
import club.skillswap.workshop.repository.WorkshopRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;

/**
 * Concurrent admin writes against a real PostgreSQL database.
 *
 * <p>Deliberately not {@code @Transactional}: every request has to commit on its own so that
 * concurrent requests really compete for the same row. Created rows are removed in
 * {@link #cleanUp()}.
 */
@SpringBootTest
@AutoConfigureMockMvc
class AdminConcurrentWriteTests {

    private static final int CONCURRENT_ADMINS = 6;
    private static final int RACE_ROUNDS = 5;
    private static final String STALE_MEMORY_MESSAGE =
            "This memory was changed by another admin. Reload it to see the latest version.";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private MemoryEntryRepository memoryEntryRepository;

    @Autowired
    private WorkshopRepository workshopRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private PlatformTransactionManager transactionManager;

    // Runs the @Async notification inserts.
    @Autowired
    @Qualifier("applicationTaskExecutor")
    private ThreadPoolTaskExecutor asyncExecutor;

    @MockitoBean
    private AzureBlobStorageService azureBlobStorageService;

    private final List<UUID> createdUserIds = new ArrayList<>();
    private final List<Long> createdMemoryIds = new ArrayList<>();
    private final List<Long> createdWorkshopIds = new ArrayList<>();

    @AfterEach
    void cleanUp() {
        for (Long workshopId : createdWorkshopIds) {
            jdbcTemplate.update("delete from notifications where workshop_id = ?", workshopId);
            jdbcTemplate.update("delete from workshops where id = ?", workshopId);
        }
        for (Long memoryId : createdMemoryIds) {
            jdbcTemplate.update("delete from memory_media where memory_entry_id = ?", memoryId);
            jdbcTemplate.update("delete from memory_entries where id = ?", memoryId);
        }
        for (UUID userId : createdUserIds) {
            jdbcTemplate.update("delete from notifications where recipient_user_id = ?", userId);
            jdbcTemplate.update("delete from user_account where id = ?", userId);
        }
        createdWorkshopIds.clear();
        createdMemoryIds.clear();
        createdUserIds.clear();
    }

    // ---------------------------------------------------------------------------------------
    // Scenario 1: two admins read the same memory, then both write (read, read, write, write).
    // ---------------------------------------------------------------------------------------

    @Test
    @DisplayName("Two admins edit the same published memory: the second save is rejected and the first is kept.")
    void shouldRejectSecondWriteWhenTwoAdminsEditFromTheSameRead() throws Exception {
        String suffix = UUID.randomUUID().toString();
        String adminA = saveAdmin("admin-a-" + suffix).getAuthSubject();
        String adminB = saveAdmin("admin-b-" + suffix).getAuthSubject();
        MemoryEntry memory = savePublishedMemory("Shared Memory " + suffix, "Original content");

        // Both admins open the editor and read the same version.
        long versionSeenByA = readAdminMemoryVersion(adminA, memory.getId());
        long versionSeenByB = readAdminMemoryVersion(adminB, memory.getId());
        assertThat(versionSeenByA).isEqualTo(versionSeenByB);

        MvcResult saveByA = putMemory(adminA, memory.getId(), "Content from admin A", versionSeenByA);
        MvcResult saveByB = putMemory(adminB, memory.getId(), "Content from admin B", versionSeenByB);

        assertThat(saveByA.getResponse().getStatus()).isEqualTo(200);
        assertThat(json(saveByA).path("version").asLong()).isEqualTo(versionSeenByA + 1);

        assertThat(saveByB.getResponse().getStatus()).isEqualTo(409);
        assertThat(json(saveByB).path("message").asText()).isEqualTo(STALE_MEMORY_MESSAGE);

        MemoryEntry stored = memoryEntryRepository.findById(memory.getId()).orElseThrow();
        assertThat(stored.getContent())
                .as("admin A's write must not be silently overwritten")
                .isEqualTo("Content from admin A");
        assertThat(stored.getVersion()).isEqualTo(versionSeenByA + 1);

        // Admin B reloads, gets the new version, and can now save on top of A's change.
        long reloadedVersion = readAdminMemoryVersion(adminB, memory.getId());
        MvcResult retryByB = putMemory(adminB, memory.getId(), "Content from admin B after reload", reloadedVersion);
        assertThat(retryByB.getResponse().getStatus()).isEqualTo(200);
        assertThat(memoryEntryRepository.findById(memory.getId()).orElseThrow().getContent())
                .isEqualTo("Content from admin B after reload");
    }

    // ---------------------------------------------------------------------------------------
    // Scenario 2: several admins save the same memory at the same instant.
    // ---------------------------------------------------------------------------------------

    @Test
    @DisplayName("Admins saving the same memory at the same time: exactly one write wins, the rest get 409.")
    void shouldLetExactlyOneConcurrentMemoryWriteWin() throws Exception {
        String suffix = UUID.randomUUID().toString();
        MemoryEntry memory = savePublishedMemory("Concurrent Memory " + suffix, "Original content");
        long startVersion = memory.getVersion();

        List<String> admins = new ArrayList<>();
        for (int i = 0; i < CONCURRENT_ADMINS; i++) {
            admins.add(saveAdmin("memory-racer-" + i + "-" + suffix).getAuthSubject());
        }

        List<Callable<Integer>> writes = new ArrayList<>();
        for (int i = 0; i < CONCURRENT_ADMINS; i++) {
            String admin = admins.get(i);
            String content = "Content from racer " + i;
            writes.add(() -> putMemory(admin, memory.getId(), content, startVersion).getResponse().getStatus());
        }

        List<Integer> statuses = runAtTheSameTime(writes);

        assertThat(statuses).filteredOn(status -> status == 200).hasSize(1);
        assertThat(statuses).filteredOn(status -> status == 409).hasSize(CONCURRENT_ADMINS - 1);

        int winner = statuses.indexOf(200);
        MemoryEntry stored = memoryEntryRepository.findById(memory.getId()).orElseThrow();
        assertThat(stored.getContent()).isEqualTo("Content from racer " + winner);
        assertThat(stored.getVersion()).isEqualTo(startVersion + 1);
    }

    // ---------------------------------------------------------------------------------------
    // Scenario 3: admins approve and reject the same pending workshop at the same instant.
    // ---------------------------------------------------------------------------------------

    @Test
    @DisplayName("Concurrent approve and reject of one workshop: exactly one decision wins and only it is notified.")
    void shouldLetExactlyOneConcurrentReviewDecisionWin() throws Exception {
        String suffix = UUID.randomUUID().toString();
        UserAccount facilitator = saveUser("facilitator-" + suffix, "member");
        List<String> admins = new ArrayList<>();
        for (int i = 0; i < CONCURRENT_ADMINS; i++) {
            admins.add(saveAdmin("review-racer-" + i + "-" + suffix).getAuthSubject());
        }

        // Several rounds, so the race lands both on the request-level check and on the
        // database-level version check across runs.
        for (int round = 0; round < RACE_ROUNDS; round++) {
            Workshop workshop = savePendingWorkshop(facilitator, "Review Race " + round + " " + suffix);
            long versionSeenByAdmins = readAdminWorkshopVersion(admins.get(0), workshop.getId());

            List<String> actions = new ArrayList<>();
            List<Callable<Integer>> decisions = new ArrayList<>();
            for (int i = 0; i < CONCURRENT_ADMINS; i++) {
                String admin = admins.get(i);
                String action = i % 2 == 0 ? "approve" : "reject";
                actions.add(action);
                decisions.add(() -> postWorkshopDecision(admin, workshop.getId(), action, versionSeenByAdmins));
            }

            List<Integer> statuses = runAtTheSameTime(decisions);

            assertThat(statuses)
                    .as("round %d statuses %s for actions %s", round, statuses, actions)
                    .filteredOn(status -> status == 200).hasSize(1);
            assertThat(statuses)
                    .as("round %d statuses %s", round, statuses)
                    .filteredOn(status -> status == 409).hasSize(CONCURRENT_ADMINS - 1);

            String winningAction = actions.get(statuses.indexOf(200));
            String expectedStatus = "approve".equals(winningAction) ? "approved" : "rejected";
            String expectedNotification = "approve".equals(winningAction) ? "workshop_approved" : "workshop_rejected";

            awaitAsyncNotifications();

            Workshop stored = workshopRepository.findById(workshop.getId()).orElseThrow();
            assertThat(stored.getStatus()).isEqualTo(expectedStatus);
            assertThat(stored.getVersion()).isEqualTo(versionSeenByAdmins + 1);

            List<String> reviewNotifications = jdbcTemplate.queryForList(
                    "select type from notifications where workshop_id = ? and recipient_user_id = ?"
                            + " and type in ('workshop_approved', 'workshop_rejected')",
                    String.class,
                    workshop.getId(),
                    facilitator.getId()
            );
            assertThat(reviewNotifications)
                    .as("the facilitator must receive only the winning decision, never a contradicting one")
                    .containsExactly(expectedNotification);
        }
    }

    // ---------------------------------------------------------------------------------------
    // Scenario 4: both transactions read before either writes (the window the request-level
    // check cannot see). Interleaved deterministically, so this does not depend on timing.
    // ---------------------------------------------------------------------------------------

    @Test
    @DisplayName("Two transactions read the same workshop version: the later commit fails instead of overwriting.")
    void shouldFailLaterTransactionWhenBothReadTheSameVersion() {
        String suffix = UUID.randomUUID().toString();
        UserAccount facilitator = saveUser("facilitator-tx-" + suffix, "member");
        Workshop workshop = savePendingWorkshop(facilitator, "Interleaved " + suffix);

        TransactionTemplate outerTx = new TransactionTemplate(transactionManager);
        TransactionTemplate innerTx = new TransactionTemplate(transactionManager);
        innerTx.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);

        assertThatThrownBy(() -> outerTx.executeWithoutResult(outer -> {
            // Transaction 1 reads the pending workshop.
            Workshop readByFirst = workshopRepository.findById(workshop.getId()).orElseThrow();
            assertThat(readByFirst.getStatus()).isEqualTo("pending");

            // Transaction 2 reads the same version, approves, and commits first.
            innerTx.executeWithoutResult(inner -> {
                Workshop readBySecond = workshopRepository.findById(workshop.getId()).orElseThrow();
                assertThat(readBySecond.getVersion()).isEqualTo(readByFirst.getVersion());
                readBySecond.setStatus("approved");
            });

            // Transaction 1 now writes from its stale copy.
            readByFirst.setStatus("rejected");
            workshopRepository.flush();
        })).isInstanceOf(ObjectOptimisticLockingFailureException.class);

        Workshop stored = workshopRepository.findById(workshop.getId()).orElseThrow();
        assertThat(stored.getStatus())
                .as("the stale transaction must not overwrite the committed decision")
                .isEqualTo("approved");
        assertThat(stored.getVersion()).isEqualTo(workshop.getVersion() + 1);
    }

    // ---------------------------------------------------------------------------------------
    // Scenario 5: the draft edit-lock heartbeat must not make the lock holder's save stale.
    // ---------------------------------------------------------------------------------------

    @Test
    @DisplayName("Renewing a draft edit lock does not change the version the lock holder saves with.")
    void shouldKeepVersionStableAcrossEditLockHeartbeats() throws Exception {
        String suffix = UUID.randomUUID().toString();
        String admin = saveAdmin("lock-holder-" + suffix).getAuthSubject();
        MemoryEntry draft = saveMemory("Draft " + suffix, "Draft content", "draft");

        MvcResult firstLock = mockMvc.perform(post("/api/v1/admin/memories/{id}/lock", draft.getId())
                        .with(adminJwt(admin)))
                .andReturn();
        long versionSeenByEditor = json(firstLock).path("version").asLong();

        // The editor renews the lock on a heartbeat while the admin keeps typing.
        for (int i = 0; i < 3; i++) {
            MvcResult heartbeat = mockMvc.perform(post("/api/v1/admin/memories/{id}/lock", draft.getId())
                            .with(adminJwt(admin)))
                    .andReturn();
            assertThat(heartbeat.getResponse().getStatus()).isEqualTo(200);
            assertThat(json(heartbeat).path("version").asLong()).isEqualTo(versionSeenByEditor);
        }

        MvcResult save = putMemory(admin, draft.getId(), "Draft content after heartbeats", versionSeenByEditor, "draft");
        assertThat(save.getResponse().getStatus()).isEqualTo(200);
        assertThat(json(save).path("version").asLong()).isEqualTo(versionSeenByEditor + 1);
    }

    // ---------------------------------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------------------------------

    /** Releases all tasks at once and returns their results in submission order. */
    private <T> List<T> runAtTheSameTime(List<Callable<T>> tasks) throws Exception {
        ExecutorService pool = Executors.newFixedThreadPool(tasks.size());
        CountDownLatch ready = new CountDownLatch(tasks.size());
        CountDownLatch start = new CountDownLatch(1);
        try {
            List<Future<T>> futures = new ArrayList<>();
            for (Callable<T> task : tasks) {
                futures.add(pool.submit(() -> {
                    ready.countDown();
                    start.await();
                    return task.call();
                }));
            }
            assertThat(ready.await(10, TimeUnit.SECONDS)).isTrue();
            start.countDown();

            List<T> results = new ArrayList<>();
            for (Future<T> future : futures) {
                results.add(future.get(60, TimeUnit.SECONDS));
            }
            return results;
        } finally {
            pool.shutdownNow();
        }
    }

    /** Every request has returned, so every notification is already queued; wait for them to land. */
    private void awaitAsyncNotifications() throws InterruptedException {
        long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(10);
        while (asyncExecutor.getActiveCount() > 0 || !asyncExecutor.getThreadPoolExecutor().getQueue().isEmpty()) {
            if (System.nanoTime() > deadline) {
                throw new AssertionError("Async notifications did not finish within 10 seconds");
            }
            Thread.sleep(20);
        }
    }

    private long readAdminMemoryVersion(String adminSubject, Long memoryId) throws Exception {
        MvcResult result = mockMvc.perform(get("/api/v1/admin/memories").with(adminJwt(adminSubject))).andReturn();
        assertThat(result.getResponse().getStatus()).isEqualTo(200);
        for (JsonNode entry : json(result)) {
            if (entry.path("id").asText().equals(memoryId.toString())) {
                return entry.path("version").asLong();
            }
        }
        throw new AssertionError("Memory " + memoryId + " missing from admin list");
    }

    private long readAdminWorkshopVersion(String adminSubject, Long workshopId) throws Exception {
        MvcResult result = mockMvc.perform(get("/api/v1/admin/workshops/{id}", workshopId)
                        .with(adminJwt(adminSubject)))
                .andReturn();
        assertThat(result.getResponse().getStatus()).isEqualTo(200);
        return json(result).path("version").asLong();
    }

    private MvcResult putMemory(String adminSubject, Long memoryId, String content, long version) throws Exception {
        return putMemory(adminSubject, memoryId, content, version, "published");
    }

    private MvcResult putMemory(String adminSubject, Long memoryId, String content, long version, String status)
            throws Exception {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("content", content);
        body.put("status", status);
        body.put("version", version);
        return mockMvc.perform(put("/api/v1/admin/memories/{id}", memoryId)
                        .with(adminJwt(adminSubject))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andReturn();
    }

    private int postWorkshopDecision(String adminSubject, Long workshopId, String action, long version)
            throws Exception {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("version", version);
        if ("reject".equals(action)) {
            body.put("comment", "Rejected in a concurrent review.");
        }
        return mockMvc.perform(post("/api/v1/admin/workshops/{id}/" + action, workshopId)
                        .with(adminJwt(adminSubject))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andReturn()
                .getResponse()
                .getStatus();
    }

    private JsonNode json(MvcResult result) throws Exception {
        return objectMapper.readTree(result.getResponse().getContentAsString());
    }

    private UserAccount saveAdmin(String subject) {
        return saveUser(subject, "admin");
    }

    private UserAccount saveUser(String subject, String role) {
        UserAccount user = new UserAccount();
        user.setId(UUID.randomUUID());
        user.setAuthProvider("test");
        user.setAuthSubject(subject);
        user.setUsername(subject);
        user.setEmail(subject + "@example.test");
        user.setRole(role);
        user.setCreditBalance(0);
        UserAccount saved = userRepository.saveAndFlush(user);
        createdUserIds.add(saved.getId());
        return saved;
    }

    private MemoryEntry savePublishedMemory(String title, String content) {
        return saveMemory(title, content, "published");
    }

    private MemoryEntry saveMemory(String title, String content, String status) {
        MemoryEntry memory = new MemoryEntry();
        memory.setTitle(title);
        memory.setSlug("memory-" + UUID.randomUUID());
        memory.setContent(content);
        memory.setStatus(status);
        if ("published".equals(status)) {
            memory.setPublishedAt(LocalDateTime.now().minusDays(1));
        }
        MemoryEntry saved = memoryEntryRepository.saveAndFlush(memory);
        createdMemoryIds.add(saved.getId());
        return saved;
    }

    private Workshop savePendingWorkshop(UserAccount facilitator, String title) {
        Workshop workshop = new Workshop();
        workshop.setFacilitator(facilitator);
        workshop.setHostName(facilitator.getUsername());
        workshop.setTitle(title);
        workshop.setDescription("Concurrency test workshop");
        workshop.setCategory("Technology");
        workshop.setDuration(60);
        workshop.setStatus("pending");
        workshop.setDate(LocalDate.now().plusDays(30));
        workshop.setTime(LocalTime.NOON);
        workshop.setAttendCloseAt(LocalDateTime.now().plusDays(10));
        workshop.setIsOnline(true);
        workshop.setMaxParticipants(10);
        workshop.setCreditCost(0);
        workshop.setCreditReward(0);
        workshop.setContactNumber("0412345678");
        workshop.setDetailsConfirmed(true);
        workshop.setSubmitterUsername(facilitator.getUsername());
        workshop.setSubmitterEmail(facilitator.getEmail());
        workshop.setHiddenByHost(false);
        Workshop saved = workshopRepository.saveAndFlush(workshop);
        createdWorkshopIds.add(saved.getId());
        return saved;
    }

    private RequestPostProcessor adminJwt(String subject) {
        return jwt().jwt(jwt -> jwt
                        .subject(subject)
                        .claim("email", subject + "@example.test")
                        .claim("email_verified", true))
                .authorities(new SimpleGrantedAuthority("ROLE_ADMIN"));
    }
}
