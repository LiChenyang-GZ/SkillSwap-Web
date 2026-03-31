package club.skillswap.common.config;

import org.springframework.core.convert.converter.Converter;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Locale;
import java.util.stream.Collectors;

@Component
public class JwtConverter implements Converter<Jwt, AbstractAuthenticationToken> {

    @Override
    public AbstractAuthenticationToken convert(Jwt jwt) {
        // 浠?JWT 涓彁鍙栬鑹蹭俊鎭?
        Collection<GrantedAuthority> authorities = extractAuthorities(jwt);
        
        // 鍒涘缓涓€涓?JwtAuthenticationToken锛岃繖鏄?Spring Security 鍐呴儴琛ㄧず璁よ瘉鐢ㄦ埛鐨勬柟寮?
        return new JwtAuthenticationToken(jwt, authorities, jwt.getSubject());
    }

    private Collection<GrantedAuthority> extractAuthorities(Jwt jwt) {
        // Supabase 灏嗚鑹蹭俊鎭斁鍦?"app_metadata" claim 涓?
        Map<String, Object> appMetadata = jwt.getClaimAsMap("app_metadata");

        if (appMetadata == null) {
            return List.of();
        }

        if (appMetadata.get("roles") instanceof List<?> rawRoles) {
            return rawRoles.stream()
                    .filter(String.class::isInstance)
                    .map(String.class::cast)
                    .map(role -> role.toUpperCase(Locale.ROOT))
                    .map(role -> new SimpleGrantedAuthority("ROLE_" + role))
                    .collect(Collectors.toList());
        }

        if (appMetadata.get("role") instanceof String singleRole && !singleRole.isBlank()) {
            return List.of(new SimpleGrantedAuthority("ROLE_" + singleRole.toUpperCase(Locale.ROOT)));
        }

        return List.of();
    }
}
