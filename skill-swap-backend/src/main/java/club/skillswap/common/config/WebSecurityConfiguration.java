package club.skillswap.common.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfigurationSource;

import java.util.Locale;

/**
 * Spring Security 閰嶇疆 - 浣跨敤 Supabase JWT 璁よ瘉
 * 
 * Supabase 浣跨敤 ES256 (ECC P-256) 绠楁硶锛岄€氳繃 JWKS 绔偣鑾峰彇鍏挜楠岃瘉
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class WebSecurityConfiguration {

    @Value("${spring.security.oauth2.resourceserver.jwt.issuer-uri:}")
    private String issuerUri;

    @Value("${spring.security.oauth2.resourceserver.jwt.jwk-set-uri:}")
    private String jwkSetUri;

    @Value("${spring.security.oauth2.resourceserver.jwt.jws-algorithms:}")
    private String jwsAlgorithms;

    /**
     * 鏄惧紡鍒涘缓浣跨敤 JWKS 鐨?JwtDecoder (ES256/P-256)
     * Supabase 浣跨敤 ES256 绠楁硶绛惧悕 JWT
     */
    @Bean
    public JwtDecoder jwtDecoder() {
        System.out.println("? WebSecurityConfiguration: use JWKS endpoint to verify JWT");
        System.out.println("   issuer-uri: " + (issuerUri == null ? "" : issuerUri));
        System.out.println("   jwk-set-uri: " + (jwkSetUri == null ? "" : jwkSetUri));
        System.out.println("   jws-algorithms: " + (jwsAlgorithms == null ? "" : jwsAlgorithms));

        NimbusJwtDecoder.JwkSetUriJwtDecoderBuilder builder;
        if (jwkSetUri != null && !jwkSetUri.isBlank()) {
            builder = NimbusJwtDecoder.withJwkSetUri(jwkSetUri);
        } else if (issuerUri != null && !issuerUri.isBlank()) {
            builder = NimbusJwtDecoder.withIssuerLocation(issuerUri);
        } else {
            throw new IllegalStateException(
                    "JWT decoder requires either 'spring.security.oauth2.resourceserver.jwt.issuer-uri' " +
                    "or 'spring.security.oauth2.resourceserver.jwt.jwk-set-uri'"
            );
        }

        SignatureAlgorithm signatureAlgorithm = resolveSignatureAlgorithm(jwsAlgorithms);
        if (signatureAlgorithm != null) {
            builder = builder.jwsAlgorithm(signatureAlgorithm);
        }

        NimbusJwtDecoder decoder = builder.build();
        if (issuerUri != null && !issuerUri.isBlank()) {
            decoder.setJwtValidator(JwtValidators.createDefaultWithIssuer(issuerUri));
        }
        return decoder;
    }

    private SignatureAlgorithm resolveSignatureAlgorithm(String configured) {
        if (configured == null || configured.isBlank()) {
            return null;
        }

        // spring.security...jws-algorithms 可能是 "ES256" 或 "RS256,ES256"。
        String first = configured.split("[,\\s]+")[0].trim();
        if (first.isBlank()) {
            return null;
        }

        String normalized = first.toUpperCase(Locale.ROOT);
        try {
            return SignatureAlgorithm.from(normalized);
        } catch (IllegalArgumentException ex) {
            return null;
        }
    }

    @Bean
    public SecurityFilterChain securityFilterChain(
            HttpSecurity http,
            CorsConfigurationSource corsConfigurationSource,
            JwtConverter jwtConverter,
            JwtDecoder jwtDecoder
    ) throws Exception {

        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource))
            .csrf(csrf -> csrf.disable())
            .sessionManagement(session ->
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS)
            )
            // 浣跨敤 JWKS 绔偣楠岃瘉 Supabase JWT (ES256)
            .oauth2ResourceServer(oauth2 -> oauth2.jwt(jwt -> {
                jwt.decoder(jwtDecoder);
                jwt.jwtAuthenticationConverter(jwtConverter);
            }))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/health", "/api/health").permitAll()
                .requestMatchers("/api/v1/auth/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/v1/workshops", "/api/v1/workshops/public", "/api/v1/workshops/*").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/v1/memories", "/api/v1/memories/*").permitAll()
                .requestMatchers("/api/**").authenticated()
                .anyRequest().permitAll()
            );

        return http.build();
    }
}
