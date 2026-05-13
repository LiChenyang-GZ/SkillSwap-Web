# 开发登录实现说明（已更新）

## 结论

当前项目不再使用 `/dev` 登录接口与本地开发 JWT。  
开发/测试/生产统一走 Clerk 身份认证。

## 登录链路

1. 用户在前端 Clerk 组件中登录。
2. 前端通过 Clerk SDK 读取会话 token。
3. 前端调用后端 API 时携带 `Authorization: Bearer <token>`。
4. 后端通过 JWKS 验证 token，并根据数据库角色授予权限（如 `ROLE_ADMIN`）。

## 本地联调步骤

1. 启动后端（`dev` profile）。
2. 启动前端。
3. 使用 Clerk 账号登录。
4. 在浏览器 Network 确认受保护接口请求包含 Bearer token。
5. 在后端日志确认认证成功并可访问 `/api/**` 受保护接口。

## 常见误区

- 不需要 `dev_token` localStorage 注入逻辑。
- 不应再调用 `/dev/token` 或 `/dev/auth/dev-login`。
- 如果出现 401，优先检查 Clerk 会话是否过期或请求是否携带 token。
