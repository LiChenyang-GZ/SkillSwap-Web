package club.skillswap.memory;

import club.skillswap.common.storage.AzureBlobStorageService;
import club.skillswap.memory.entity.MemoryEntry;
import club.skillswap.memory.repository.MemoryEntryRepository;
import club.skillswap.user.entity.UserAccount;
import club.skillswap.user.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class MemoryLockApiContractTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private MemoryEntryRepository memoryEntryRepository;

    @MockitoBean
    private AzureBlobStorageService azureBlobStorageService;

    @Test
    @DisplayName("Admin can acquire a draft memory edit lock and see lock owner fields.")
    void shouldReturnLockOwnerWhenAdminAcquiresDraftMemoryLock() throws Exception {
        String suffix = UUID.randomUUID().toString();
        String adminSubject = "memory-lock-admin-" + suffix;
        UserAccount admin = saveAdmin(adminSubject, "Memory Admin " + suffix);
        MemoryEntry memory = saveDraftMemory("Draft Lock Contract " + suffix, admin);

        mockMvc.perform(post("/api/v1/admin/memories/{id}/lock", memory.getId())
                        .with(adminJwt(adminSubject)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(memory.getId().toString()))
                .andExpect(jsonPath("$.status").value("draft"))
                .andExpect(jsonPath("$.editLockOwnerId").value(admin.getId().toString()))
                .andExpect(jsonPath("$.editLockOwnerName").value(admin.getUsername()))
                .andExpect(jsonPath("$.editLockExpiresAt").exists());
    }

    @Test
    @DisplayName("Admin receives 423 Locked when another admin owns the active memory lock.")
    void shouldReturnLockedWhenAnotherAdminOwnsDraftMemoryLock() throws Exception {
        String suffix = UUID.randomUUID().toString();
        UserAccount owner = saveAdmin("memory-lock-owner-" + suffix, "Owner Admin");
        String requesterSubject = "memory-lock-requester-" + suffix;
        saveAdmin(requesterSubject, "Requester Admin");
        MemoryEntry memory = saveDraftMemory("Locked Draft Contract " + suffix, owner);
        memory.setEditLockOwner(owner);
        memory.setEditLockAcquiredAt(LocalDateTime.now().minusMinutes(1));
        memory.setEditLockExpiresAt(LocalDateTime.now().plusMinutes(5));
        memoryEntryRepository.saveAndFlush(memory);

        mockMvc.perform(post("/api/v1/admin/memories/{id}/lock", memory.getId())
                        .with(adminJwt(requesterSubject)))
                .andExpect(status().is(423))
                .andExpect(jsonPath("$.status").value(423))
                .andExpect(jsonPath("$.error").value("Locked"))
                .andExpect(jsonPath("$.message").value("This memory is currently being edited by Owner Admin."))
                .andExpect(jsonPath("$.path").value("/api/v1/admin/memories/" + memory.getId() + "/lock"));
    }

    private UserAccount saveAdmin(String subject, String username) {
        UserAccount user = new UserAccount();
        user.setId(UUID.randomUUID());
        user.setAuthProvider("test");
        user.setAuthSubject(subject);
        user.setUsername(username);
        user.setEmail(subject + "@example.test");
        user.setRole("admin");
        user.setCreditBalance(0);
        return userRepository.saveAndFlush(user);
    }

    private MemoryEntry saveDraftMemory(String title, UserAccount actor) {
        MemoryEntry memory = new MemoryEntry();
        memory.setTitle(title);
        memory.setSlug("memory-" + UUID.randomUUID());
        memory.setContent("Memory API contract content.");
        memory.setStatus("draft");
        memory.setCreatedBy(actor);
        memory.setUpdatedBy(actor);
        return memoryEntryRepository.saveAndFlush(memory);
    }

    private RequestPostProcessor adminJwt(String subject) {
        return jwt().jwt(jwt -> jwt
                        .subject(subject)
                        .claim("email", subject + "@example.test")
                        .claim("email_verified", true))
                .authorities(new SimpleGrantedAuthority("ROLE_ADMIN"));
    }
}
