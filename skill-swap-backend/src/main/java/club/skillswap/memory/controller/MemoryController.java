package club.skillswap.memory.controller;

import club.skillswap.memory.dto.MemoryEntryResponseDto;
import club.skillswap.memory.service.MemoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/memories")
@RequiredArgsConstructor
public class MemoryController {

    private final MemoryService memoryService;

    @GetMapping
    public ResponseEntity<List<MemoryEntryResponseDto>> listPublicMemories() {
        return ResponseEntity.ok(memoryService.listPublicMemories());
    }

    @GetMapping("/{slug}")
    public ResponseEntity<MemoryEntryResponseDto> getPublicMemoryBySlug(@PathVariable String slug) {
        return ResponseEntity.ok(memoryService.getPublicMemoryBySlug(slug));
    }
}
