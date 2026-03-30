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
        
        if (appMetadata != null && appMetadata.get("roles") instanceof List) {
            @SuppressWarnings("unchecked")
            List<String> roles = (List<String>) appMetadata.get("roles");
            
            // 灏嗚鑹插瓧绗︿覆锛堝 "ADMIN"锛夎浆鎹负 Spring Security 鐨?GrantedAuthority 瀵硅薄
            // 鍏抽敭锛歋pring Security 鐨?"hasRole" 鏂规硶闇€瑕佹潈闄愪互 "ROLE_" 寮€澶?
            return roles.stream()
                    .map(role -> new SimpleGrantedAuthority("ROLE_" + role))
                    .collect(Collectors.toList());
        }
        
        // 濡傛灉娌℃湁瑙掕壊淇℃伅锛岃繑鍥炰竴涓┖鍒楄〃
        return List.of();
    }
}
