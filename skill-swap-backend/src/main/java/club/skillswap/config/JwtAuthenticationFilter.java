// package club.skillswap.config;

// import jakarta.servlet.FilterChain;
// import jakarta.servlet.ServletException;
// import jakarta.servlet.http.HttpServletRequest;
// import jakarta.servlet.http.HttpServletResponse;
// import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
// import org.springframework.security.core.context.SecurityContextHolder;
// import org.springframework.security.oauth2.jwt.Jwt;
// import org.springframework.security.oauth2.jwt.JwtDecoder;
// import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
// import org.springframework.stereotype.Component;
// import org.springframework.web.filter.OncePerRequestFilter;

// import java.io.IOException;

// //@Component  // 已禁用，改用 Spring Security OAuth2 Resource Server
// public class JwtAuthenticationFilter extends OncePerRequestFilter {

//     private final JwtDecoder jwtDecoder;

//     public JwtAuthenticationFilter(JwtDecoder jwtDecoder) {
//         this.jwtDecoder = jwtDecoder;
//     }

//     @Override
//     protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
//             throws ServletException, IOException {

//         try {
//             // 从 Authorization header 提取 Bearer token
//             String authHeader = request.getHeader("Authorization");
//             if (authHeader != null && authHeader.startsWith("Bearer ")) {
//                 String token = authHeader.substring(7);

//                 // 使用 JwtDecoder 解析和验证 token
//                 Jwt jwt = jwtDecoder.decode(token);
//                 String userId = jwt.getSubject();
//                 String username = (String) jwt.getClaims().get("username");

//                 if (userId != null) {
//                     // 创建 Authentication 对象
//                     UsernamePasswordAuthenticationToken authentication =
//                             new UsernamePasswordAuthenticationToken(userId, null, null);
//                     authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

//                     // 设置到 SecurityContext
//                     SecurityContextHolder.getContext().setAuthentication(authentication);
//                 }
//             }
//         } catch (Exception e) {
//             // token 无效或过期，继续（public endpoints 不需要 token）
//         }

//         filterChain.doFilter(request, response);
//     }
// }
