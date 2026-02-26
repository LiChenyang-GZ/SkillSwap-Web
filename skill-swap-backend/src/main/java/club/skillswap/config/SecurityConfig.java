// package club.skillswap.config;

// import org.springframework.beans.factory.annotation.Autowired;
// import org.springframework.beans.factory.annotation.Value;
// import org.springframework.context.annotation.Bean;
// import org.springframework.context.annotation.Configuration;
// import org.springframework.security.config.annotation.web.builders.HttpSecurity;
// import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
// import org.springframework.security.config.http.SessionCreationPolicy;
// import org.springframework.security.oauth2.jwt.JwtDecoder;
// import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
// import org.springframework.security.web.SecurityFilterChain;
// import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
// import org.springframework.web.cors.CorsConfiguration;
// import org.springframework.web.cors.CorsConfigurationSource;
// import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
// import javax.crypto.spec.SecretKeySpec;
// import java.util.Arrays;

// /**
//  * ⚠️ DEPRECATED - 此配置已被 skillswapbackend.common.config.WebSecurityConfiguration 替代
//  * 
//  * 此配置使用本地生成的 HS256 JWT，已不再使用
//  * 现在统一使用 Supabase JWT (RS256)
//  */
// //@Configuration
// //@EnableWebSecurity
// public class SecurityConfig {

//     @Value("${jwt.secret:#{null}}")
//     private String jwtSecret;

//     @Value("${spring.profiles.active:prod}")
//     private String activeProfile;

//     @Autowired
//     private JwtAuthenticationFilter jwtAuthenticationFilter;

//     @Bean
//     public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
//         http
//                 .cors(cors -> cors.configurationSource(corsConfigurationSource()))
//                 .csrf(csrf -> csrf.disable())
//                 .authorizeHttpRequests(auth -> auth
//                         // 开发接口不需要认证
//                         .requestMatchers("/dev/**").permitAll()
//                         // 认证接口不需要认证
//                         .requestMatchers("/api/v1/auth/**").permitAll()
//                         // 其他接口允许访问但可以通过 SecurityContext 获取用户信息
//                         .anyRequest().permitAll()
//                 )
//                 .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
//                 // 添加 JWT 认证 filter（在 UsernamePasswordAuthenticationFilter 之前）
//                 .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

//         return http.build();
//     }

//     @Bean
//     public JwtDecoder jwtDecoder() {
//         // 如果没有配置密钥，创建一个默认的（仅用于开发）
//         String secret = jwtSecret != null ? jwtSecret : "development-secret-key-change-in-production-min-256-bits";
        
//         // 确保密钥至少 256 位
//         if (secret.length() < 32) {
//             secret = "default-development-secret-key-minimum-256-bits-required-1234567890";
//         }
        
//         SecretKeySpec keySpec = new SecretKeySpec(secret.getBytes(), "HmacSHA256");
//         return NimbusJwtDecoder.withSecretKey(keySpec).build();
//     }

//     @Bean
//     public CorsConfigurationSource corsConfigurationSource() {
//         CorsConfiguration configuration = new CorsConfiguration();
//         configuration.setAllowedOrigins(Arrays.asList("http://localhost:3000", "http://localhost:5173"));
//         configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS"));
//         configuration.setAllowedHeaders(Arrays.asList("*"));
//         configuration.setAllowCredentials(true);
        
//         UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
//         source.registerCorsConfiguration("/**", configuration);
//         return source;
//     }
// }
