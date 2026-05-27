package club.skillswap.workshop.service;

import club.skillswap.common.storage.AzureBlobStorageService;
import club.skillswap.notification.service.NotificationService;
import club.skillswap.testsupport.TestFixtures;
import club.skillswap.user.entity.UserAccount;
import club.skillswap.user.service.UserService;
import club.skillswap.workshop.dto.WorkshopCreateRequestDto;
import club.skillswap.workshop.dto.WorkshopReviewRequestDto;
import club.skillswap.workshop.dto.WorkshopResponseDto;
import club.skillswap.workshop.entity.Workshop;
import club.skillswap.workshop.entity.WorkshopParticipant;
import club.skillswap.workshop.repository.WorkshopParticipantRepository;
import club.skillswap.workshop.repository.WorkshopRepository;
import org.assertj.core.api.ThrowableAssert.ThrowingCallable;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.same;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WorkshopServiceImplTest {

    private static final long WORKSHOP_ID = 50L;
    private static final UUID FACILITATOR_ID = UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID MEMBER_ID = UUID.fromString("22222222-2222-2222-2222-222222222222");
    private static final UUID ADMIN_ID = UUID.fromString("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
    private static final UUID OTHER_ADMIN_ID = UUID.fromString("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb");
    private static final String OLD_IMAGE_URL = "https://skillswaptest.blob.core.windows.net/media/workshops/50/old.gif";
    private static final String NEW_IMAGE_URL = "https://skillswaptest.blob.core.windows.net/media/workshops/50/new.gif";

    @Mock
    private WorkshopRepository workshopRepository;

    @Mock
    private WorkshopParticipantRepository participantRepository;

    @Mock
    private UserService userService;

    @Mock
    private NotificationService notificationService;

    @Mock
    private AzureBlobStorageService azureBlobStorageService;

    @InjectMocks
    private WorkshopServiceImpl workshopService;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(workshopService, "maxImageBytes", 10L * 1024L * 1024L);
    }

    @Test
    @DisplayName("Creates a pending workshop and notifies admins while skipping the facilitator admin candidate.")
    void shouldCreatePendingWorkshopAndNotifyAdminsWhenSubmitted() {
        UserAccount facilitator = facilitatorAdmin();
        UserAccount admin = adminUser(ADMIN_ID, "admin-workshop", "Admin One");
        UserAccount otherAdmin = adminUser(OTHER_ADMIN_ID, "other-admin-workshop", "Admin Two");
        WorkshopCreateRequestDto request = createRequest();
        when(userService.findUserByStringId(FACILITATOR_ID.toString())).thenReturn(facilitator);
        when(workshopRepository.save(any(Workshop.class))).thenAnswer(invocation -> {
            Workshop saved = invocation.getArgument(0);
            saved.setId(WORKSHOP_ID);
            return saved;
        });
        when(userService.findAdmins()).thenReturn(List.of(facilitator, admin, otherAdmin));

        workshopService.createWorkshop(request, FACILITATOR_ID.toString());

        ArgumentCaptor<Workshop> workshopCaptor = ArgumentCaptor.forClass(Workshop.class);
        verify(workshopRepository).save(workshopCaptor.capture());
        Workshop savedWorkshop = workshopCaptor.getValue();
        assertThat(savedWorkshop.getTitle()).isEqualTo("Community Pottery");
        assertThat(savedWorkshop.getStatus()).isEqualTo("pending");
        assertThat(savedWorkshop.getCreditCost()).isZero();
        assertThat(savedWorkshop.getCreditReward()).isZero();
        assertThat(savedWorkshop.getFacilitator()).isSameAs(facilitator);
        assertThat(savedWorkshop.getSubmitterUsername()).isEqualTo(facilitator.getUsername());
        assertThat(savedWorkshop.getSubmitterEmail()).isEqualTo(facilitator.getEmail());
        assertThat(savedWorkshop.getHiddenByHost()).isFalse();

        ArgumentCaptor<UserAccount> recipientCaptor = ArgumentCaptor.forClass(UserAccount.class);
        ArgumentCaptor<String> typeCaptor = ArgumentCaptor.forClass(String.class);
        verify(notificationService, times(2)).createNotification(
                recipientCaptor.capture(),
                typeCaptor.capture(),
                anyString(),
                anyString(),
                same(savedWorkshop)
        );
        assertThat(recipientCaptor.getAllValues()).containsExactlyInAnyOrder(admin, otherAdmin);
        assertThat(typeCaptor.getAllValues()).containsOnly("workshop_submission");
        verify(notificationService, never()).createNotification(
                same(facilitator),
                eq("workshop_submission"),
                anyString(),
                anyString(),
                any(Workshop.class)
        );
    }

    @Test
    @DisplayName("Does not notify the facilitator when a user joins a workshop.")
    void shouldNotNotifyFacilitatorWhenUserJoinsWorkshop() {
        Jwt jwt = jwt("member-join-silent");
        UserAccount facilitator = facilitator();
        UserAccount user = memberUser(jwt);
        Workshop workshop = upcomingWorkshop(WORKSHOP_ID, facilitator);
        when(workshopRepository.findById(WORKSHOP_ID)).thenReturn(java.util.Optional.of(workshop));
        when(userService.findOrCreateCurrentUser(jwt)).thenReturn(user);
        when(participantRepository.findByUserIdAndWorkshopId(MEMBER_ID, WORKSHOP_ID)).thenReturn(List.of());

        workshopService.joinWorkshop(WORKSHOP_ID, memberAuthentication(jwt));

        ArgumentCaptor<WorkshopParticipant> participantCaptor = ArgumentCaptor.forClass(WorkshopParticipant.class);
        verify(participantRepository).save(participantCaptor.capture());
        WorkshopParticipant savedParticipant = participantCaptor.getValue();
        assertThat(savedParticipant.getWorkshop()).isSameAs(workshop);
        assertThat(savedParticipant.getUser()).isSameAs(user);
        assertThat(savedParticipant.getRegistrationDate()).isNotNull();
        verify(notificationService, never()).createNotification(
                same(facilitator),
                anyString(),
                anyString(),
                anyString(),
                any(Workshop.class)
        );
    }

    @Test
    @DisplayName("Rejects joining a workshop when capacity has been reached.")
    void shouldRejectJoinWhenWorkshopIsFull() {
        Jwt jwt = jwt("member-full-workshop");
        Workshop workshop = upcomingWorkshop(WORKSHOP_ID, facilitator());
        workshop.setMaxParticipants(2);
        when(workshopRepository.findById(WORKSHOP_ID)).thenReturn(java.util.Optional.of(workshop));
        when(participantRepository.countByWorkshopId(WORKSHOP_ID)).thenReturn(2L);

        assertBadRequest(
                () -> workshopService.joinWorkshop(WORKSHOP_ID, memberAuthentication(jwt)),
                "Workshop is full."
        );

        verify(participantRepository, never()).save(any(WorkshopParticipant.class));
    }

    @Test
    @DisplayName("Rejects joining a workshop when the user is already a participant.")
    void shouldRejectDuplicateJoinWhenParticipantExists() {
        Jwt jwt = jwt("member-duplicate-join");
        UserAccount user = memberUser(jwt);
        Workshop workshop = upcomingWorkshop(WORKSHOP_ID, facilitator());
        WorkshopParticipant existingParticipant = new WorkshopParticipant();
        existingParticipant.setWorkshop(workshop);
        existingParticipant.setUser(user);
        when(workshopRepository.findById(WORKSHOP_ID)).thenReturn(java.util.Optional.of(workshop));
        when(userService.findOrCreateCurrentUser(jwt)).thenReturn(user);
        when(participantRepository.findByUserIdAndWorkshopId(MEMBER_ID, WORKSHOP_ID))
                .thenReturn(List.of(existingParticipant));

        assertBadRequest(
                () -> workshopService.joinWorkshop(WORKSHOP_ID, memberAuthentication(jwt)),
                "User is already a participant in this workshop"
        );

        verify(participantRepository, never()).save(any(WorkshopParticipant.class));
    }

    @Test
    @DisplayName("Rejects joining a workshop after attendance has closed.")
    void shouldRejectJoinWhenAttendanceClosed() {
        Jwt jwt = jwt("member-attendance-closed");
        Workshop workshop = upcomingWorkshop(WORKSHOP_ID, facilitator());
        workshop.setAttendCloseAt(farPastDateTime());
        when(workshopRepository.findById(WORKSHOP_ID)).thenReturn(java.util.Optional.of(workshop));

        assertBadRequest(
                () -> workshopService.joinWorkshop(WORKSHOP_ID, memberAuthentication(jwt)),
                "Attendance has been closed for this workshop."
        );

        verify(participantRepository, never()).save(any(WorkshopParticipant.class));
    }

    @Test
    @DisplayName("Rejects joining a workshop unless its effective status is upcoming.")
    void shouldRejectJoinWhenWorkshopIsNotUpcoming() {
        Jwt jwt = jwt("member-pending-workshop");
        Workshop workshop = upcomingWorkshop(WORKSHOP_ID, facilitator());
        workshop.setStatus("pending");
        when(workshopRepository.findById(WORKSHOP_ID)).thenReturn(java.util.Optional.of(workshop));

        assertBadRequest(
                () -> workshopService.joinWorkshop(WORKSHOP_ID, memberAuthentication(jwt)),
                "This workshop is no longer open for new attendees."
        );

        verify(participantRepository, never()).save(any(WorkshopParticipant.class));
    }

    @Test
    @DisplayName("Approves a pending workshop and notifies the facilitator.")
    void shouldApprovePendingWorkshopAndNotifyFacilitator() {
        Jwt jwt = jwt("admin-approve-workshop");
        UserAccount admin = adminUser(ADMIN_ID, jwt.getSubject(), "Review Admin");
        UserAccount facilitator = facilitator();
        Workshop workshop = pendingWorkshop(WORKSHOP_ID, facilitator);
        workshop.setHiddenByHost(true);
        when(workshopRepository.findById(WORKSHOP_ID)).thenReturn(java.util.Optional.of(workshop));
        when(userService.findOrCreateCurrentUser(jwt)).thenReturn(admin);
        when(workshopRepository.save(any(Workshop.class))).thenAnswer(invocation -> invocation.getArgument(0));

        workshopService.approveWorkshop(WORKSHOP_ID, adminAuthentication(jwt));

        ArgumentCaptor<Workshop> workshopCaptor = ArgumentCaptor.forClass(Workshop.class);
        verify(workshopRepository).save(workshopCaptor.capture());
        Workshop savedWorkshop = workshopCaptor.getValue();
        assertThat(savedWorkshop.getStatus()).isEqualTo("approved");
        assertThat(savedWorkshop.getApprovedAt()).isNotNull();
        assertThat(savedWorkshop.getReviewedAt()).isNotNull();
        assertThat(savedWorkshop.getReviewedBy()).isEqualTo(ADMIN_ID);
        assertThat(savedWorkshop.getReviewComment()).isNull();
        assertThat(savedWorkshop.getHiddenByHost()).isFalse();

        ArgumentCaptor<UserAccount> recipientCaptor = ArgumentCaptor.forClass(UserAccount.class);
        ArgumentCaptor<String> typeCaptor = ArgumentCaptor.forClass(String.class);
        verify(notificationService).createNotification(
                recipientCaptor.capture(),
                typeCaptor.capture(),
                anyString(),
                anyString(),
                same(savedWorkshop)
        );
        assertThat(recipientCaptor.getValue()).isSameAs(facilitator);
        assertThat(typeCaptor.getValue()).isEqualTo("workshop_approved");
    }

    @Test
    @DisplayName("Rejects a pending workshop with a review comment and notifies the facilitator.")
    void shouldRejectPendingWorkshopAndNotifyFacilitator() {
        Jwt jwt = jwt("admin-reject-workshop");
        UserAccount admin = adminUser(ADMIN_ID, jwt.getSubject(), "Review Admin");
        UserAccount facilitator = facilitator();
        Workshop workshop = pendingWorkshop(WORKSHOP_ID, facilitator);
        workshop.setApprovedAt(farPastDateTime());
        when(workshopRepository.findById(WORKSHOP_ID)).thenReturn(java.util.Optional.of(workshop));
        when(userService.findOrCreateCurrentUser(jwt)).thenReturn(admin);
        when(workshopRepository.save(any(Workshop.class))).thenAnswer(invocation -> invocation.getArgument(0));

        workshopService.rejectWorkshop(
                WORKSHOP_ID,
                new WorkshopReviewRequestDto("Needs clearer materials list."),
                adminAuthentication(jwt)
        );

        ArgumentCaptor<Workshop> workshopCaptor = ArgumentCaptor.forClass(Workshop.class);
        verify(workshopRepository).save(workshopCaptor.capture());
        Workshop savedWorkshop = workshopCaptor.getValue();
        assertThat(savedWorkshop.getStatus()).isEqualTo("rejected");
        assertThat(savedWorkshop.getApprovedAt()).isNull();
        assertThat(savedWorkshop.getReviewedAt()).isNotNull();
        assertThat(savedWorkshop.getReviewedBy()).isEqualTo(ADMIN_ID);
        assertThat(savedWorkshop.getReviewComment()).isEqualTo("Needs clearer materials list.");

        ArgumentCaptor<UserAccount> recipientCaptor = ArgumentCaptor.forClass(UserAccount.class);
        ArgumentCaptor<String> typeCaptor = ArgumentCaptor.forClass(String.class);
        verify(notificationService).createNotification(
                recipientCaptor.capture(),
                typeCaptor.capture(),
                anyString(),
                anyString(),
                same(savedWorkshop)
        );
        assertThat(recipientCaptor.getValue()).isSameAs(facilitator);
        assertThat(typeCaptor.getValue()).isEqualTo("workshop_rejected");
    }

    @Test
    @DisplayName("Uploads a workshop image and quietly deletes the replaced blob URL.")
    void shouldUploadWorkshopImageAndDeletePreviousBlobWhenReplaced() {
        Jwt jwt = jwt("admin-upload-workshop-image");
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "workshop.gif",
                "image/gif",
                validGif()
        );
        Workshop workshop = upcomingWorkshop(WORKSHOP_ID, facilitator());
        workshop.setImageUrl(OLD_IMAGE_URL);
        when(workshopRepository.findById(WORKSHOP_ID)).thenReturn(java.util.Optional.of(workshop));
        when(azureBlobStorageService.uploadImage(any(MultipartFile.class), anyString(), eq("image/gif")))
                .thenReturn(NEW_IMAGE_URL);
        when(workshopRepository.save(any(Workshop.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(participantRepository.findByWorkshopIdWithUser(WORKSHOP_ID)).thenReturn(List.of());

        var result = workshopService.uploadWorkshopImage(WORKSHOP_ID, file, adminAuthentication(jwt));

        assertThat(result.image()).isEqualTo(NEW_IMAGE_URL);
        ArgumentCaptor<String> pathCaptor = ArgumentCaptor.forClass(String.class);
        verify(azureBlobStorageService).uploadImage(same(file), pathCaptor.capture(), eq("image/gif"));
        assertThat(pathCaptor.getValue()).matches("workshops/" + WORKSHOP_ID + "/[0-9a-fA-F-]{36}\\.gif");
        verify(azureBlobStorageService).deleteByUrlQuietly(OLD_IMAGE_URL);

        ArgumentCaptor<Workshop> workshopCaptor = ArgumentCaptor.forClass(Workshop.class);
        verify(workshopRepository).save(workshopCaptor.capture());
        assertThat(workshopCaptor.getValue().getImageUrl()).isEqualTo(NEW_IMAGE_URL);
    }

    @Test
    @DisplayName("Returns a restricted workshop detail when the viewer is an admin.")
    void shouldReturnRestrictedWorkshopWhenViewerIsAdmin() {
        Jwt jwt = jwt("admin-view-restricted-workshop");
        UserAccount facilitator = facilitator();
        Workshop workshop = pendingWorkshop(60L, facilitator);
        when(workshopRepository.findByIdWithDetails(60L)).thenReturn(java.util.Optional.of(workshop));
        when(participantRepository.findByWorkshopIdWithUser(60L)).thenReturn(List.of());

        var response = workshopService.getWorkshopById(60L, adminAuthentication(jwt));

        assertThat(response.status()).isEqualTo("pending");
        assertThat(response.contactNumber()).isEqualTo("0412345678");
        assertThat(response.submitterEmail()).isEqualTo(facilitator.getEmail());
        assertThat(response.participants()).isEmpty();
    }

    @Test
    @DisplayName("Returns a restricted workshop detail when the viewer is the facilitator.")
    void shouldReturnRestrictedWorkshopWhenViewerIsFacilitator() {
        Jwt jwt = jwt("facilitator-view-restricted-workshop");
        UserAccount facilitator = facilitatorWithSubject(jwt.getSubject());
        Workshop workshop = pendingWorkshop(61L, facilitator);
        when(workshopRepository.findByIdWithDetails(61L)).thenReturn(java.util.Optional.of(workshop));
        when(userService.findOrCreateCurrentUser(jwt)).thenReturn(facilitator);

        var response = workshopService.getWorkshopById(61L, memberAuthentication(jwt));

        assertThat(response.status()).isEqualTo("pending");
        assertThat(response.contactNumber()).isEqualTo("0412345678");
        assertThat(response.submitterEmail()).isEqualTo(facilitator.getEmail());
    }

    @Test
    @DisplayName("Returns 404 when a different member requests a restricted workshop.")
    void shouldReturnNotFoundWhenRestrictedWorkshopViewerIsDifferentMember() {
        Jwt jwt = jwt("member-view-restricted-workshop");
        UserAccount member = memberUser(jwt);
        Workshop workshop = pendingWorkshop(62L, facilitator());
        when(workshopRepository.findByIdWithDetails(62L)).thenReturn(java.util.Optional.of(workshop));
        when(userService.findOrCreateCurrentUser(jwt)).thenReturn(member);

        assertNotFound(() -> workshopService.getWorkshopById(62L, memberAuthentication(jwt)));
    }

    @Test
    @DisplayName("Returns 404 when an anonymous viewer requests a restricted workshop.")
    void shouldReturnNotFoundWhenRestrictedWorkshopViewerIsAnonymous() {
        Workshop workshop = pendingWorkshop(63L, facilitator());
        when(workshopRepository.findByIdWithDetails(63L)).thenReturn(java.util.Optional.of(workshop));

        assertNotFound(() -> workshopService.getWorkshopById(63L, anonymousAuthentication()));

        verify(userService, never()).findOrCreateCurrentUser(any());
    }

    @Test
    @DisplayName("Returns pending when the stored workshop status is null.")
    void shouldReturnPendingWhenStoredStatusIsNull() {
        Jwt jwt = jwt("facilitator-view-null-status");
        UserAccount facilitator = facilitatorWithSubject(jwt.getSubject());
        Workshop workshop = pendingWorkshop(64L, facilitator);
        workshop.setStatus(null);

        assertWorkshopDetailStatus(64L, workshop, jwt, facilitator, "pending");
    }

    @Test
    @DisplayName("Returns terminal and restricted statuses verbatim before deriving lifecycle state.")
    void shouldReturnVerbatimStatusWhenWorkshopStatusIsRestrictedOrTerminal() {
        List<String> statuses = List.of("cancelled", "completed", "pending", "rejected");
        for (int i = 0; i < statuses.size(); i++) {
            String status = statuses.get(i);
            long workshopId = 70L + i;
            Jwt jwt = jwt("facilitator-verbatim-" + status);
            UserAccount facilitator = facilitatorWithSubject(jwt.getSubject());
            Workshop workshop = workshopWithStatus(workshopId, facilitator, status);
            workshop.setDate(farFutureDate());
            workshop.setTime(LocalTime.NOON);
            workshop.setDuration(90);

            assertWorkshopDetailStatus(workshopId, workshop, jwt, facilitator, status);
        }
    }

    @Test
    @DisplayName("Returns upcoming when an approved workshop starts in the future.")
    void shouldReturnUpcomingWhenApprovedWorkshopStartsInFuture() {
        Jwt jwt = jwt("member-view-upcoming-status");
        UserAccount member = memberUser(jwt);
        Workshop workshop = approvedWorkshopStartingAt(80L, facilitator(), farFutureDateTime(), 90);

        assertWorkshopDetailStatus(80L, workshop, jwt, member, "upcoming");
    }

    @Test
    @DisplayName("Returns ongoing when an approved workshop has started but not ended.")
    void shouldReturnOngoingWhenApprovedWorkshopHasStartedButNotEnded() {
        Jwt jwt = jwt("member-view-ongoing-status");
        UserAccount member = memberUser(jwt);
        Workshop workshop = approvedWorkshopStartingAt(81L, facilitator(), recentPastDateTime(), 3 * 24 * 60);

        assertWorkshopDetailStatus(81L, workshop, jwt, member, "ongoing");
    }

    @Test
    @DisplayName("Returns completed when an approved workshop ended in the past.")
    void shouldReturnCompletedWhenApprovedWorkshopEndedInPast() {
        Jwt jwt = jwt("member-view-completed-status");
        UserAccount member = memberUser(jwt);
        Workshop workshop = approvedWorkshopStartingAt(82L, facilitator(), farPastDateTime(), 60);

        assertWorkshopDetailStatus(82L, workshop, jwt, member, "completed");
    }

    @Test
    @DisplayName("Returns ongoing when an approved started workshop has null duration.")
    void shouldReturnOngoingWhenApprovedWorkshopStartedWithNullDuration() {
        Jwt jwt = jwt("member-view-null-duration");
        UserAccount member = memberUser(jwt);
        Workshop workshop = approvedWorkshopStartingAt(83L, facilitator(), farPastDateTime(), null);

        assertWorkshopDetailStatus(83L, workshop, jwt, member, "ongoing");
    }

    @Test
    @DisplayName("Returns ongoing when an approved started workshop has zero duration.")
    void shouldReturnOngoingWhenApprovedWorkshopStartedWithZeroDuration() {
        Jwt jwt = jwt("member-view-zero-duration");
        UserAccount member = memberUser(jwt);
        Workshop workshop = approvedWorkshopStartingAt(84L, facilitator(), farPastDateTime(), 0);

        assertWorkshopDetailStatus(84L, workshop, jwt, member, "ongoing");
    }

    @Test
    @DisplayName("Resolves effective status after a workshop detail passes visibility checks.")
    void shouldResolveEffectiveStatusWhenVisibleWorkshopDetailIsReturned() {
        Jwt jwt = jwt("facilitator-visible-rejected-status");
        UserAccount facilitator = facilitatorWithSubject(jwt.getSubject());
        Workshop workshop = workshopWithStatus(85L, facilitator, "rejected");
        workshop.setDate(farFutureDate());
        workshop.setTime(LocalTime.NOON);
        workshop.setDuration(90);

        var response = assertWorkshopDetailStatus(85L, workshop, jwt, facilitator, "rejected");

        assertThat(response.contactNumber()).isEqualTo("0412345678");
        assertThat(response.submitterEmail()).isEqualTo(facilitator.getEmail());
    }

    private void assertBadRequest(ThrowingCallable action, String reason) {
        assertThatThrownBy(action)
                .isInstanceOfSatisfying(ResponseStatusException.class, ex -> {
                    assertThat(ex.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
                    assertThat(ex.getReason()).isEqualTo(reason);
                });
    }

    private void assertNotFound(ThrowingCallable action) {
        assertThatThrownBy(action)
                .isInstanceOfSatisfying(ResponseStatusException.class, ex -> {
                    assertThat(ex.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
                    assertThat(ex.getReason()).isEqualTo("Workshop not found.");
                });
    }

    private WorkshopResponseDto assertWorkshopDetailStatus(
            Long workshopId,
            Workshop workshop,
            Jwt jwt,
            UserAccount viewer,
            String expectedStatus
    ) {
        when(workshopRepository.findByIdWithDetails(workshopId)).thenReturn(java.util.Optional.of(workshop));
        when(userService.findOrCreateCurrentUser(jwt)).thenReturn(viewer);

        var response = workshopService.getWorkshopById(workshopId, memberAuthentication(jwt));

        assertThat(response.status()).as("resolved status for stored status %s", workshop.getStatus())
                .isEqualTo(expectedStatus);
        return response;
    }

    private WorkshopCreateRequestDto createRequest() {
        return new WorkshopCreateRequestDto(
                "Taylor Host",
                "Community Pottery",
                "A hands-on pottery workshop.",
                "Art",
                90,
                farFutureDate(),
                LocalTime.NOON,
                null,
                false,
                "Studio 3",
                12,
                "0412345678",
                "Clay and tools",
                "Extra tables",
                "Sink access",
                "Wear clothes that can get messy",
                6,
                "Taylor",
                "Taylor, Sam",
                false,
                "pending",
                true
        );
    }

    private Workshop upcomingWorkshop(Long id, UserAccount facilitator) {
        Workshop workshop = baseWorkshop(id, facilitator);
        workshop.setStatus("approved");
        workshop.setDate(farFutureDate());
        workshop.setTime(LocalTime.NOON);
        workshop.setAttendCloseAt(farFutureDateTime());
        return workshop;
    }

    private Workshop pendingWorkshop(Long id, UserAccount facilitator) {
        Workshop workshop = baseWorkshop(id, facilitator);
        workshop.setStatus("pending");
        workshop.setDate(farFutureDate());
        workshop.setTime(LocalTime.NOON);
        workshop.setAttendCloseAt(farFutureDateTime());
        return workshop;
    }

    private Workshop workshopWithStatus(Long id, UserAccount facilitator, String status) {
        Workshop workshop = baseWorkshop(id, facilitator);
        workshop.setStatus(status);
        workshop.setDate(farFutureDate());
        workshop.setTime(LocalTime.NOON);
        workshop.setAttendCloseAt(farFutureDateTime());
        return workshop;
    }

    private Workshop approvedWorkshopStartingAt(
            Long id,
            UserAccount facilitator,
            LocalDateTime startDateTime,
            Integer durationMinutes
    ) {
        Workshop workshop = baseWorkshop(id, facilitator);
        workshop.setStatus("approved");
        workshop.setDate(startDateTime.toLocalDate());
        workshop.setTime(startDateTime.toLocalTime());
        workshop.setDuration(durationMinutes);
        workshop.setAttendCloseAt(farFutureDateTime());
        return workshop;
    }

    private Workshop baseWorkshop(Long id, UserAccount facilitator) {
        Workshop workshop = new Workshop();
        workshop.setId(id);
        workshop.setTitle("Community Pottery");
        workshop.setDescription("A hands-on pottery workshop.");
        workshop.setCategory("Art");
        workshop.setDuration(90);
        workshop.setIsOnline(false);
        workshop.setLocation("Studio 3");
        workshop.setContactNumber("0412345678");
        workshop.setSubmitterEmail(facilitator.getEmail());
        workshop.setFacilitator(facilitator);
        workshop.setHiddenByHost(false);
        return workshop;
    }

    private UserAccount facilitator() {
        return TestFixtures.userAccount()
                .id(FACILITATOR_ID)
                .authSubject("facilitator-workshop")
                .username("Taylor Host")
                .email("taylor.host@example.test")
                .role("member")
                .build();
    }

    private UserAccount facilitatorWithSubject(String authSubject) {
        return TestFixtures.userAccount()
                .id(FACILITATOR_ID)
                .authSubject(authSubject)
                .username("Taylor Host")
                .email("taylor.host@example.test")
                .role("member")
                .build();
    }

    private UserAccount facilitatorAdmin() {
        return TestFixtures.userAccount()
                .id(FACILITATOR_ID)
                .authSubject("facilitator-admin-workshop")
                .username("Taylor Host")
                .email("taylor.host@example.test")
                .role("admin")
                .build();
    }

    private UserAccount memberUser(Jwt jwt) {
        return TestFixtures.userAccount()
                .id(MEMBER_ID)
                .authSubject(jwt.getSubject())
                .username("Morgan Member")
                .email("morgan.member@example.test")
                .role("member")
                .build();
    }

    private UserAccount adminUser(UUID id, String subject, String username) {
        return TestFixtures.userAccount()
                .id(id)
                .authSubject(subject)
                .username(username)
                .email(username.toLowerCase().replace(" ", ".") + "@example.test")
                .role("admin")
                .build();
    }

    private Authentication memberAuthentication(Jwt jwt) {
        return new JwtAuthenticationToken(jwt, List.of(), jwt.getSubject());
    }

    private Authentication adminAuthentication(Jwt jwt) {
        return new JwtAuthenticationToken(
                jwt,
                List.of(new SimpleGrantedAuthority("ROLE_ADMIN")),
                jwt.getSubject()
        );
    }

    private Authentication anonymousAuthentication() {
        return new AnonymousAuthenticationToken(
                "test-anonymous-key",
                "anonymous",
                List.of(new SimpleGrantedAuthority("ROLE_ANONYMOUS"))
        );
    }

    private Jwt jwt(String subject) {
        return Jwt.withTokenValue("token-" + subject)
                .header("alg", "none")
                .subject(subject)
                .build();
    }

    private LocalDate farFutureDate() {
        return LocalDate.now().plusYears(5);
    }

    private LocalDateTime farFutureDateTime() {
        return LocalDateTime.now().plusYears(4);
    }

    private LocalDateTime recentPastDateTime() {
        return LocalDateTime.now().minusHours(1);
    }

    private LocalDateTime farPastDateTime() {
        return LocalDateTime.now().minusYears(5);
    }

    private byte[] validGif() {
        return new byte[] {
                0x47, 0x49, 0x46, 0x38, 0x39, 0x61,
                0x01, 0x00, 0x01, 0x00, (byte) 0x80, 0x00, 0x00,
                0x00, 0x00, 0x00, (byte) 0xff, (byte) 0xff, (byte) 0xff,
                0x21, (byte) 0xf9, 0x04, 0x01, 0x00, 0x00, 0x00, 0x00,
                0x2c, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00,
                0x00, 0x02, 0x02, 0x44, 0x01, 0x00, 0x3b
        };
    }
}
