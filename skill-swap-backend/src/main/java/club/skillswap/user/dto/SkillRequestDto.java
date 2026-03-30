package club.skillswap.user.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class SkillRequestDto {

    @NotBlank(message = "Skill name cannot be blank")
    @Size(max = 100)
    private String skillName;

    @Size(max = 50)
    private String skillLevel;
}
