package club.skillswap.common.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

@Configuration
public class CorsConfig {

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        
        // 鍏佽鐨勫墠绔湴鍧€
        configuration.setAllowedOrigins(Arrays.asList(
            "http://localhost:5173",   // Vite 寮€鍙戞湇鍔″櫒
            "http://localhost:3000",   // 澶囩敤绔彛
            "http://127.0.0.1:5173",
            "http://127.0.0.1:3000",
            "https://www.skillswap-club.site",
            "https://skillswap-club.site"

        ));
        
        // 鍏佽鐨?HTTP 鏂规硶
        configuration.setAllowedMethods(Arrays.asList(
            "GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"
        ));
        
        // 鍏佽鐨勮姹傚ご
        configuration.setAllowedHeaders(List.of(
            "Authorization",
            "Content-Type",
            "Accept",
            "Origin",
            "X-Requested-With"
        ));
        
        // 鍏佽鎼哄甫鍑瘉锛坈ookies, authorization headers锛?
        configuration.setAllowCredentials(true);
        
        // 鏆撮湶鐨勫搷搴斿ご锛堝墠绔彲浠ヨ闂級
        configuration.setExposedHeaders(Arrays.asList(
            "Authorization", "Content-Type"
        ));
        
        // 棰勬璇锋眰缂撳瓨鏃堕棿锛堢锛?
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
