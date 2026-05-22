package club.skillswap.user.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "user_skill")
@Getter
@Setter
public class UserSkill {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 澶氬涓€鍏宠仈鍒?UserAccount
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @JsonIgnore // 闃叉鍦ㄥ簭鍒楀寲鏃朵骇鐢熷惊鐜紩鐢?
    private UserAccount user;

    @Column(name = "skill_name", nullable = false, length = 100)
    private String skillName;

    @Column(name = "skill_level", length = 50)
    private String skillLevel;
}

