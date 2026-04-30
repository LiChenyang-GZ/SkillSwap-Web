package club.skillswap.common.config;

import org.springframework.core.convert.converter.Converter;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;

import club.skillswap.user.entity.UserAccount;
import club.skillswap.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class JwtConverter implements Converter<Jwt, AbstractAuthenticationToken> {

    private final UserRepository userRepository;

    @Override
    public AbstractAuthenticationToken convert(Jwt jwt) {
        Collection<GrantedAuthority> authorities = extractAuthoritiesFromDb(jwt);
        return new JwtAuthenticationToken(jwt, authorities, jwt.getSubject());
    }

    private Collection<GrantedAuthority> extractAuthoritiesFromDb(Jwt jwt) {
        List<GrantedAuthority> authorities = new ArrayList<>();

        String subject = jwt.getSubject();
        if (subject == null || subject.isBlank()) {
            return authorities;
        }

        Optional<UserAccount> userOpt = userRepository.findByAuthSubject(subject);
        if (userOpt.isEmpty()) {
            UUID subjectUuid = tryParseUuid(subject);
            if (subjectUuid != null) {
                userOpt = userRepository.findById(subjectUuid);
            }
        }

        if (userOpt.isPresent() && isAdminRole(userOpt.get().getRole())) {
            authorities.add(new SimpleGrantedAuthority("ROLE_ADMIN"));
        }

        return authorities;
    }

    private boolean isAdminRole(String role) {
        if (role == null) {
            return false;
        }
        String normalized = role.trim().toLowerCase(Locale.ROOT);
        return "admin".equals(normalized) || "role_admin".equals(normalized);
    }

    private UUID tryParseUuid(String value) {
        try {
            return UUID.fromString(value);
        } catch (IllegalArgumentException ex) {
            return null;
        }
    }
}
