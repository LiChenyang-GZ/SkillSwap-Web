package club.skillswap.Health;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@Slf4j
@RestController
public class HealthController {

    @GetMapping("/health")
    public ResponseEntity<String> health() {
        log.info("HEALTH HIT");
        // return ResponseEntity.ok("ok");
        return ResponseEntity.noContent().build();
    }
}
