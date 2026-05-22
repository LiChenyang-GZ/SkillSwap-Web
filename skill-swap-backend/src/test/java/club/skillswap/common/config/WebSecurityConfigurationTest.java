package club.skillswap.common.config;

import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

class WebSecurityConfigurationTest {

    @Test
    void requiredJwtConfigurationFailsFastWhenIssuerIsMissing() {
        WebSecurityConfiguration configuration = configuration(" ", "https://issuer.test/.well-known/jwks.json");

        assertThatThrownBy(configuration::validateRequiredJwtConfiguration)
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("CLERK_ISSUER_URI");
    }

    @Test
    void requiredJwtConfigurationFailsFastWhenJwksIsMissing() {
        WebSecurityConfiguration configuration = configuration("https://issuer.test", "");

        assertThatThrownBy(configuration::validateRequiredJwtConfiguration)
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("CLERK_JWKS_URI");
    }

    private WebSecurityConfiguration configuration(String issuer, String jwks) {
        WebSecurityConfiguration configuration = new WebSecurityConfiguration();
        ReflectionTestUtils.setField(configuration, "issuerUri", issuer);
        ReflectionTestUtils.setField(configuration, "jwkSetUri", jwks);
        return configuration;
    }
}
