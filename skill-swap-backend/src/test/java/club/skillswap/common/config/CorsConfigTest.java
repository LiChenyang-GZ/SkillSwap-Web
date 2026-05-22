package club.skillswap.common.config;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.cors.CorsConfiguration;

import static org.assertj.core.api.Assertions.assertThat;

class CorsConfigTest {

    @Test
    void corsAllowedHeadersAreExplicitWhenCredentialsAreAllowed() {
        CorsConfiguration configuration = new CorsConfig()
                .corsConfigurationSource()
                .getCorsConfiguration(new MockHttpServletRequest("OPTIONS", "/api/v1/users/me"));

        assertThat(configuration).isNotNull();
        assertThat(configuration.getAllowCredentials()).isTrue();
        assertThat(configuration.getAllowedHeaders())
                .contains("Authorization", "Content-Type")
                .doesNotContain("*");
        assertThat(configuration.getAllowedOrigins())
                .contains("https://www.skillswap-club.site", "https://skillswap-club.site")
                .doesNotContain(
                        "https://skill-swap-web-beta.vercel.app",
                        "https://skill-swap-web-git-main-lichenyang-gzs-projects.vercel.app",
                        "https://skill-swap-8svulzvb7-lichenyang-gzs-projects.vercel.app"
                );
    }
}
