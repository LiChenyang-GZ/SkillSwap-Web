# 开发环境认证说明（已更新）

## 当前状态

`/dev/**` 开发专用登录端点与本地 HS256 JWT 流程已移除。  
项目当前统一使用 Clerk 登录 + 后端 JWKS 验证（`oauth2ResourceServer.jwt`）。

## 本地开发正确做法

1. 前端通过 Clerk 完成登录。
2. 前端请求后端接口时携带 Clerk Session Token（Bearer）。
3. 后端通过 `issuer-uri` / `jwk-set-uri` 验证 JWT。

## 配置检查

后端 `application-*.properties` 需要配置至少一项：

- `spring.security.oauth2.resourceserver.jwt.issuer-uri`
- `spring.security.oauth2.resourceserver.jwt.jwk-set-uri`

可选配置：

- `spring.security.oauth2.resourceserver.jwt.jws-algorithms`（如 `ES256`）

## 备注

- 若你看到历史文档或脚本仍提到 `/dev/token`、`/dev/auth/dev-login`、`dev_token`，请以本文件为准。
- 旧说明仅用于历史排障，不再代表当前实现。
