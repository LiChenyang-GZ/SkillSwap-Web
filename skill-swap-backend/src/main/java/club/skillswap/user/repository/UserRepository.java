package club.skillswap.user.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import club.skillswap.user.entity.UserAccount;

import java.util.UUID;
import java.util.Optional;
import java.util.List;

@Repository
public interface UserRepository extends JpaRepository<UserAccount, UUID> {
    Optional<UserAccount> findByEmail(String email);
    Optional<UserAccount> findByAuthSubject(String authSubject);
    List<UserAccount> findByRoleIgnoreCase(String role);

    @Query("""
            select u from UserAccount u
            where lower(function('regexp_replace', coalesce(u.role, ''), '[\\s\\u0000-\\u001F]+', '', 'g'))
                  in ('admin', 'role_admin')
            """)
    List<UserAccount> findAllAdminUsers();
}
