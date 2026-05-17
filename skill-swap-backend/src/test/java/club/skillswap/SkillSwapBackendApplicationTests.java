package club.skillswap;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.env.Environment;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.convention.TestBean;

@SpringBootTest
class SkillSwapBackendApplicationTests {

	@TestBean(name = "jwtDecoder", methodName = "testJwtDecoder", enforceOverride = true)
	JwtDecoder jwtDecoder;

	@Autowired
	private Environment environment;

	@Test
	void contextLoads() {
	}

	@Test
	void shouldHaveTestProfileActive() {
		assertThat(environment.getActiveProfiles()).contains("test");
	}

	static JwtDecoder testJwtDecoder() {
		return token -> Jwt.withTokenValue(token)
				.header("alg", "none")
				.claim("sub", "test-user")
				.build();
	}

}

