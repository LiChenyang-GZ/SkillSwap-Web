package club.skillswap.memory.service;

import club.skillswap.memory.dto.MemoryEntryRequestDto;
import club.skillswap.memory.dto.MemoryEntryResponseDto;
import org.springframework.security.core.Authentication;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

public interface MemoryService {

    List<MemoryEntryResponseDto> listPublicMemories();

    MemoryEntryResponseDto getPublicMemoryBySlug(String slug);

    List<MemoryEntryResponseDto> listAdminMemories(Authentication authentication);

    MemoryEntryResponseDto createMemory(MemoryEntryRequestDto requestDto, Authentication authentication);

    MemoryEntryResponseDto updateMemory(Long id, MemoryEntryRequestDto requestDto, Authentication authentication);

    String uploadMemoryMedia(MultipartFile file, Authentication authentication);
}
