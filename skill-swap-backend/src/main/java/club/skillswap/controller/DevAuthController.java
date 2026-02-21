package club.skillswap.controller;

import club.skillswap.util.JwtTokenProvider;
import club.skillswap.skillswapbackend.user.entity.UserAccount;
import club.skillswap.skillswapbackend.user.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.Random;
import java.util.UUID;
import java.util.Arrays;

@RestController
@RequestMapping("/dev")
public class DevAuthController {

    private final JwtTokenProvider jwtTokenProvider;
    private final UserRepository userRepository;
    private final String activeProfile;

    public DevAuthController(JwtTokenProvider jwtTokenProvider,
                           UserRepository userRepository,
                           @Value("${spring.profiles.active:prod}") String activeProfile) {
        this.jwtTokenProvider = jwtTokenProvider;
        this.userRepository = userRepository;
        this.activeProfile = activeProfile;
    }

    @PostMapping("/token")
    public ResponseEntity<Map<String, Object>> generateDevToken(
            @RequestParam(value = "userId", required = false) UUID userId,
            @RequestParam(value = "username", required = false) String username) {

        // 仅在开发环境允许
        if (!isDevProfile()) {
            return ResponseEntity.status(403).body(Map.of(
                    "error", "This endpoint is only available in development mode"
            ));
        }

        // 如果没有提供参数，使用默认开发用户
        if (userId == null) {
            userId = UUID.fromString("550e8400-e29b-41d4-a716-446655440000");
        }
        if (username == null || username.isEmpty()) {
            username = "devuser";
        }

        String token = jwtTokenProvider.generateToken(userId, username);

        Map<String, Object> response = new HashMap<>();
        response.put("token", token);
        response.put("userId", userId.toString());
        response.put("username", username);
        response.put("expiresIn", 86400); // 24 hours

        return ResponseEntity.ok(response);
    }

    @PostMapping("/auth/dev-login")
    public ResponseEntity<Map<String, Object>> devLogin(@RequestBody Map<String, String> body) {
        // 仅在开发环境允许
        if (!isDevProfile()) {
            return ResponseEntity.status(403).body(Map.of(
                    "error", "This endpoint is only available in development mode"
            ));
        }

        String email = body.get("email");
        String username = body.getOrDefault("username", email != null ? email.split("@")[0] : "devuser");

        if (email == null || email.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of(
                    "error", "Email is required"
            ));
        }

        // 查找或创建用户
        UserAccount user = userRepository.findByEmail(email)
                .orElseGet(() -> {
                    UserAccount newUser = new UserAccount();
                    newUser.setId(UUID.randomUUID());
                    newUser.setEmail(email);
                    newUser.setUsername(username);
                    newUser.setCreditBalance(100); // 初始 100 积分
                    newUser.setAvatarUrl("https://i.pravatar.cc/150?img=" + new Random().nextInt(70));
                    newUser.setBio("Dev user");
                    return userRepository.save(newUser);
                });

        // 生成 JWT token
        String token = jwtTokenProvider.generateToken(user.getId(), user.getUsername());

        Map<String, Object> response = new HashMap<>();
        response.put("access_token", token);
        response.put("user", Map.of(
                "id", user.getId().toString(),
                "email", user.getEmail(),
                "username", user.getUsername(),
                "creditBalance", user.getCreditBalance(),
                "avatarUrl", user.getAvatarUrl(),
                "bio", user.getBio()
        ));
        response.put("expiresIn", 86400); // 24 hours

        return ResponseEntity.ok(response);
    }

    private boolean isDevProfile() {
        return Arrays.stream(activeProfile.split(","))
                .map(String::trim)
                .anyMatch("dev"::equalsIgnoreCase);
    }
}
