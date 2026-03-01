package club.skillswap.skillswapbackend.common.config;

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
 * Spring Security 配置 - 使用 Supabase JWT 认证
 * 
 * Supabase 使用 ES256 (ECC P-256) 算法，通过 JWKS 端点获取公钥验证
 */
@Configuration
@EnableWebSecurity
public class WebSecurityConfiguration {

    @Value("${spring.security.oauth2.resourceserver.jwt.jwk-set-uri}")
    private String jwkSetUri;

    /**
     * 显式创建使用 JWKS 的 JwtDecoder (ES256/P-256)
     * Supabase 使用 ES256 算法签名 JWT
     */
    @Bean
    public JwtDecoder jwtDecoder() {
        System.out.println("? WebSecurityConfiguration: 使用 JWKS 端点验证 JWT (ES256)");
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
            // 使用 JWKS 端点验证 Supabase JWT (ES256)
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