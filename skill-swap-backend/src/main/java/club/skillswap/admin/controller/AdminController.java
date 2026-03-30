package club.skillswap.admin.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin")
public class AdminController {

    @GetMapping("/hello")
    @PreAuthorize("hasRole('ADMIN')") // 鍏抽敭锛佸彧鏈夋嫢鏈?'ROLE_ADMIN' 鏉冮檺鐨勭敤鎴锋墠鑳借闂?
    public ResponseEntity<String> adminOnlyEndpoint() {
        return ResponseEntity.ok("Hello Admin! You have successfully accessed a protected resource.");
    }
}
