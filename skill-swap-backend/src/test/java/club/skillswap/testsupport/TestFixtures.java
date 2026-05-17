package club.skillswap.testsupport;

import club.skillswap.user.entity.UserAccount;

import java.util.UUID;

public final class TestFixtures {

    private TestFixtures() {
    }

    public static UserAccountBuilder userAccount() {
        return new UserAccountBuilder();
    }

    public static final class UserAccountBuilder {
        private UUID id = UUID.fromString("11111111-1111-1111-1111-111111111111");
        private String authProvider = "test";
        private String authSubject = "test-user";
        private String username = "Test User";
        private String email = "test.user@example.test";
        private String avatarUrl = null;
        private String bio = null;
        private String role = "member";
        private Integer creditBalance = 0;

        private UserAccountBuilder() {
        }

        public UserAccountBuilder id(UUID id) {
            this.id = id;
            return this;
        }

        public UserAccountBuilder authProvider(String authProvider) {
            this.authProvider = authProvider;
            return this;
        }

        public UserAccountBuilder authSubject(String authSubject) {
            this.authSubject = authSubject;
            return this;
        }

        public UserAccountBuilder username(String username) {
            this.username = username;
            return this;
        }

        public UserAccountBuilder email(String email) {
            this.email = email;
            return this;
        }

        public UserAccountBuilder avatarUrl(String avatarUrl) {
            this.avatarUrl = avatarUrl;
            return this;
        }

        public UserAccountBuilder bio(String bio) {
            this.bio = bio;
            return this;
        }

        public UserAccountBuilder role(String role) {
            this.role = role;
            return this;
        }

        public UserAccountBuilder creditBalance(Integer creditBalance) {
            this.creditBalance = creditBalance;
            return this;
        }

        public UserAccount build() {
            UserAccount user = new UserAccount();
            user.setId(id);
            user.setAuthProvider(authProvider);
            user.setAuthSubject(authSubject);
            user.setUsername(username);
            user.setEmail(email);
            user.setAvatarUrl(avatarUrl);
            user.setBio(bio);
            user.setRole(role);
            user.setCreditBalance(creditBalance);
            return user;
        }
    }
}
