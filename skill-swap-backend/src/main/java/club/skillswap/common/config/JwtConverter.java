package club.skillswap.common.config;

import org.springframework.core.convert.converter.Converter;
import org.springframework.security.authentication.BadCredentialsException;
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

@Component
@RequiredArgsConstructor
public class JwtConverter implements Converter<Jwt, AbstractAuthenticationToken> {

    private final UserRepository userRepository;

    @Override
    public AbstractAuthenticationToken convert(Jwt jwt) {
        String subject = requireAuthenticatedSubject(jwt);
        Collection<GrantedAuthority> authorities = extractAuthoritiesFromDb(subject);
        return new JwtAuthenticationToken(jwt, authorities, subject);
    }

    private Collection<GrantedAuthority> extractAuthoritiesFromDb(String subject) {
        List<GrantedAuthority> authorities = new ArrayList<>();

        Optional<UserAccount> userOpt = userRepository.findByAuthSubject(subject);

        if (userOpt.isPresent() && isAdminRole(userOpt.get().getRole())) {
            authorities.add(new SimpleGrantedAuthority("ROLE_ADMIN"));
        }

        return authorities;
    }

    private String requireAuthenticatedSubject(Jwt jwt) {
        String subject = jwt != null ? jwt.getSubject() : null;
        if (subject == null || subject.isBlank()) {
            throw new BadCredentialsException("JWT subject is required.");
        }
        return subject;
    }

    private boolean isAdminRole(String role) {
        String normalized = normalizeRole(role);
        return "admin".equals(normalized) || "role_admin".equals(normalized);
    }

    private String normalizeRole(String role) {
        if (role == null) {
            return "";
        }
        return role.replaceAll("[\\s\\p{Cntrl}]+", "").toLowerCase(Locale.ROOT);
    }

}
