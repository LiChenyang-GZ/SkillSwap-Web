package club.skillswap.user.dto;

import java.util.List;

import lombok.Data;

@Data
public class UpdateProfileRequestDto {
    // 鍓嶇鍙互鍙彂閫佷粬浠兂鏇存柊鐨勫瓧娈?
    private String username;
    private String avatarUrl;
    private String bio;
    private List<String> skills;
    // 鎴戜滑涔嬪悗杩樺彲浠ユ坊鍔犳妧鑳藉垪琛ㄧ瓑
}
