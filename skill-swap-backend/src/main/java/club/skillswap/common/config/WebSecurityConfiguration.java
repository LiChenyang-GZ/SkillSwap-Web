package club.skillswap.common.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfigurationSource;

/**
 * Spring Security 閰嶇疆 - 浣跨敤 Supabase JWT 璁よ瘉
 * 
 * Supabase 浣跨敤 ES256 (ECC P-256) 绠楁硶锛岄€氳繃 JWKS 绔偣鑾峰彇鍏挜楠岃瘉
 */
@Configuration
@EnableWebSecurity
public class WebSecurityConfiguration {

    @Value("${spring.security.oauth2.resourceserver.jwt.jwk-set-uri}")
    private String jwkSetUri;

    /**
     * 鏄惧紡鍒涘缓浣跨敤 JWKS 鐨?JwtDecoder (ES256/P-256)
     * Supabase 浣跨敤 ES256 绠楁硶绛惧悕 JWT
     */
    @Bean
    public JwtDecoder jwtDecoder() {
        System.out.println("? WebSecurityConfiguration: 浣跨敤 JWKS 绔偣楠岃瘉 JWT (ES256)");
        System.out.println("   JWKS URI: " + jwkSetUri);
        return NimbusJwtDecoder.withJwkSetUri(jwkSetUri)
                .jwsAlgorithm(SignatureAlgorithm.ES256)
                .build();
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
                .requestMatchers("/dev/**").permitAll()
                .requestMatchers("/health").permitAll()
                .requestMatchers("/api/v1/auth/**").permitAll()
                .requestMatchers("/api/v1/workshops", "/api/v1/workshops/**").permitAll()
                .requestMatchers("/api/**").authenticated()
                .anyRequest().permitAll()
            );

        return http.build();
    }
}
