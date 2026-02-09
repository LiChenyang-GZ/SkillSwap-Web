package club.skillswap.skillswapbackend.common.config;

import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfigurationSource;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    private final JwtConverter jwtConverter; // 3. 注入我们的转换器
    private final CorsConfigurationSource corsConfigurationSource;

    public SecurityConfig(JwtConverter jwtConverter, CorsConfigurationSource corsConfigurationSource) {
        this.jwtConverter = jwtConverter;
        this.corsConfigurationSource = corsConfigurationSource;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource))
            // 启用 OAuth2 资源服务器功能，并使用 JWT 进行验证
            .oauth2ResourceServer(oauth2 -> 
                oauth2.jwt(jwt -> jwt.jwtAuthenticationConverter(jwtConverter))
                )
            
            // 禁用 CSRF，因为我们使用无状态的 JWT
            .csrf(csrf -> csrf.disable())
            
            // 配置 session 管理为无状态，不创建 session
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            
            // 配置 API 端点的授权规则
            .authorizeHttpRequests(auth -> auth
                // 允许任何人 GET 公开的用户信息
                .requestMatchers(HttpMethod.GET, "/api/v1/users/{id}").permitAll()
                // **规则2 (新增的): 允许任何人 GET 公开的 Workshop 信息**
                .requestMatchers(HttpMethod.GET, "/api/v1/workshops", "/api/v1/workshops/**").permitAll()
                // 其他所有请求都需要有效的 JWT 认证
                .anyRequest().authenticated()
            );

        return http.build();
    }
}