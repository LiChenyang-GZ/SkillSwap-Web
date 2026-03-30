package club.skillswap;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import org.springframework.context.annotation.Bean;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

import javax.sql.DataSource; 
import java.sql.ResultSet;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@SpringBootApplication(scanBasePackages = "club.skillswap")
@EnableJpaAuditing
public class SkillSwapBackendApplication {

	private static final Logger log = LoggerFactory.getLogger(SkillSwapBackendApplication.class);

	public static void main(String[] args) {
		SpringApplication.run(SkillSwapBackendApplication.class, args);
	}

	// 鍚姩鍚庢墽琛屼竴鏉＄畝鍗?SQL锛岄獙璇佽繛鎺ユ槸鍚?OK
    @Bean
    public org.springframework.boot.CommandLineRunner dbSmokeTest(DataSource ds) {
        return args -> {
            try (var conn = ds.getConnection();
                 var stmt = conn.createStatement();
                 ResultSet rs = stmt.executeQuery(
                     "select current_user, current_database(), version()")) {

                if (rs.next()) {
                    log.info("DB ok: user={}, db={}, version={}",
                            rs.getString(1), rs.getString(2), rs.getString(3));
                }
            }
        };
    }

}

