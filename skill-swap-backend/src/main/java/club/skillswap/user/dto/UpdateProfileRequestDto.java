package club.skillswap.user.dto;

import jakarta.validation.constraints.Size;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class UpdateProfileRequestDto {
    // 鍓嶇鍙互鍙彂閫佷粬浠兂鏇存柊鐨勫瓧娈?
    @Size(max = 100, message = "Username must be at most 100 characters.")
    private String username;
    @Size(max = 255, message = "Bio must be at most 255 characters.")
    private String bio;
    @Size(max = 100, message = "University name must be at most 100 characters.")
    private String university;
    @Size(max = 50, message = "At most 50 skills are allowed.")
    private List<@Size(max = 100, message = "Skill name must be at most 100 characters.") String> skills;
    // 鎴戜滑涔嬪悗杩樺彲浠ユ坊鍔犳妧鑳藉垪琛ㄧ瓑
}
