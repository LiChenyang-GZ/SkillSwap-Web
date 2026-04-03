package club.skillswap.memory.controller;

import club.skillswap.memory.dto.MemoryEntryRequestDto;
import club.skillswap.memory.dto.MemoryEntryResponseDto;
import club.skillswap.memory.dto.MemoryMediaUploadResponseDto;
import club.skillswap.memory.service.MemoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.util.List;

@RestController
@RequestMapping("/api/v1/admin/memories")
@RequiredArgsConstructor
public class AdminMemoryController {

    private final MemoryService memoryService;

    @GetMapping
    public ResponseEntity<List<MemoryEntryResponseDto>> listAdminMemories(Authentication authentication) {
        return ResponseEntity.ok(memoryService.listAdminMemories(authentication));
    }

    @PostMapping
    public ResponseEntity<MemoryEntryResponseDto> createMemory(
            @RequestBody MemoryEntryRequestDto requestDto,
            Authentication authentication
    ) {
        MemoryEntryResponseDto created = memoryService.createMemory(requestDto, authentication);
        return new ResponseEntity<>(created, HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    public ResponseEntity<MemoryEntryResponseDto> updateMemory(
            @PathVariable Long id,
            @RequestBody MemoryEntryRequestDto requestDto,
            Authentication authentication
    ) {
        return ResponseEntity.ok(memoryService.updateMemory(id, requestDto, authentication));
    }

    @PostMapping(value = "/media", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<MemoryMediaUploadResponseDto> uploadMedia(
            @RequestPart("file") MultipartFile file,
            Authentication authentication
    ) {
        String relativePath = memoryService.uploadMemoryMedia(file, authentication);
        String absoluteUrl = ServletUriComponentsBuilder.fromCurrentContextPath()
                .path(relativePath)
                .toUriString();

        return new ResponseEntity<>(
                new MemoryMediaUploadResponseDto(absoluteUrl, relativePath),
                HttpStatus.CREATED
        );
    }
}
