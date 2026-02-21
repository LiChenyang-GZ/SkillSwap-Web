# 开发环境 JWT 认证实现总结

## 概述
本实现为 SkillSwap 应用添加了开发环境下的 JWT 认证流程，避免在频繁数据库修改期间使用 Supabase 导致连接池超标。

## 后端实现

### 1. 添加 JWT 库依赖
**文件**: `build.gradle`
```gradle
implementation 'io.jsonwebtoken:jjwt-api:0.12.3'
runtimeOnly 'io.jsonwebtoken:jjwt-impl:0.12.3'
runtimeOnly 'io.jsonwebtoken:jjwt-jackson:0.12.3'
```

### 2. 创建 SecurityConfig
**文件**: `src/main/java/club/skillswap/config/SecurityConfig.java`

配置 OAuth2 Resource Server，使用 HS256 算法验证 JWT。
- 开放 `/dev/**` 和 `/api/v1/auth/**` 无需认证
- 开放 GET `/api/v1/workshops` 和 `/api/v1/workshops/**`（public endpoints）
- 其他请求需要有效的 JWT token

### 3. 创建 JwtTokenProvider 工具类
**文件**: `src/main/java/club/skillswap/util/JwtTokenProvider.java`

提供生成 JWT token 的功能：
```java
String generateToken(UUID userId, String username)
String generateToken(UUID userId, String username, long expirationMs)
```

### 4. 创建 DevAuthController
**文件**: `src/main/java/club/skillswap/controller/DevAuthController.java`

POST `/dev/token` 端点：
- **仅在 dev 环境开放**
- 接受可选的 `userId` 和 `username` 查询参数
- 返回 JWT token、userId、username 和 expiresIn

示例请求：
```bash
POST /dev/token?userId=550e8400-e29b-41d4-a716-446655440000&username=devuser
```

示例响应：
```json
{
  "token": "eyJhbGc...",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "username": "devuser",
  "expiresIn": 86400
}
```

### 5. 更新 WorkshopController
**文件**: `src/main/java/club/skillswap/controller/WorkshopController.java`

修改 `join` 和 `leave` 端点：
- 移除 request body （不再需要 JoinWorkshopRequestDto/LeaveWorkshopRequestDto）
- 直接从 `Authentication` 对象提取 userId
- userId 来自 JWT token 的 `sub` claim

### 6. 配置更新
**文件**: `src/main/resources/application-dev.properties`

```properties
jwt.secret=${JWT_HS256_SECRET:development-secret-key-change-in-production-min-256-bits}
jwt.expiration=86400000
spring.security.oauth2.resourceserver.jwt.jws-algorithm=HS256
```

## 前端实现

### 1. 更新 apiCall 函数
**文件**: `src/lib/api.ts`

```typescript
async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {},
  token?: string | null
): Promise<T> {
  // ... 
  // 如果没有显式传入 token，尝试从 localStorage 读取
  const tokenToUse = token ?? localStorage.getItem('dev_token');
  
  if (tokenToUse) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${tokenToUse}`;
  }
  // ...
}
```

自动从 localStorage 读取 dev_token 并添加到 Authorization header。

### 2. 添加 devLogin 函数
**文件**: `src/lib/api.ts` → `authAPI`

```typescript
devLogin: async (userId?: string, username?: string) => {
  // POST /dev/token
  // 将返回的 token 保存到 localStorage
}
```

### 3. 更新 signIn 函数
**文件**: `src/contexts/AppContext.tsx`

在成功登录后自动调用 `authAPI.devLogin()`：
```typescript
// Mock 登录成功后
try {
  const tokenData = await authAPI.devLogin(userData.id, userData.username);
  setSessionToken(tokenData.token);
  localStorage.setItem('skill-swap-sessionToken', tokenData.token);
} catch (error) {
  // 降级处理，继续使用本地 mock token
}
```

### 4. 简化 workshopAPI.join/leave
**文件**: `src/lib/api.ts` → `workshopAPI`

```typescript
join: async (workshopId: string): Promise<void> => {
  // 不再需要 token 参数，apiCall 会自动注入
}

leave: async (workshopId: string): Promise<void> => {
  // 不再需要 token 参数，apiCall 会自动注入
}
```

### 5. 连接到后端 API
**文件**: `src/contexts/AppContext.tsx`

`attendWorkshop` 和 `cancelWorkshopAttendance` 现在调用真实后端 API：
```typescript
const attendWorkshop = async (workshopId: string) => {
  // 调用 workshopAPI.join()
  // 成功后更新本地状态
}
```

## 测试流程

### 完整端到端流程：

1. **启动后端** (确保使用 `dev` profile)
   ```bash
   ./gradlew bootRun --args='--spring.profiles.active=dev'
   ```

2. **启动前端**
   ```bash
   npm run dev
   ```

3. **测试 Mock 登录**
   - 访问 AuthPage
   - 输入邮箱: `demo@skillswap.com`
   - 输入密码: `demo`
   - 点击登录

4. **验证 Token 获取**
   - 打开浏览器开发工具 → LocalStorage
   - 应该看到 `dev_token` 和其他 dev_token_* 字段
   - Console 应显示 "✅ Dev JWT token obtained"

5. **测试加入工作坊**
   - 在 ExploreWorkshops 页面点击 "Attend" 按钮
   - 应成功调用后端 `/api/v1/workshops/{id}/join`
   - workshop_participants 表应添加新记录
   - user_account.credit_balance 应减少
   - credit_transaction 表应添加 JOIN 记录

6. **测试离开工作坊**
   - 在 Dashboard 页面点击 "Cancel" 按钮
   - 应成功调用后端 `/api/v1/workshops/{id}/leave`
   - workshop_participants 记录应删除
   - user_account.credit_balance 应增加（退款）
   - credit_transaction 表应添加 LEAVE 记录

## 数据库影响

### 新建表/更新字段：

1. **workshop_participants** (已存在)
   - 记录用户参加的工作坊

2. **credit_transaction** (新建)
   - 记录所有积分变动
   - 字段: id, user_id, workshop_id, credit_amount, transaction_type, description, created_at

3. **user_account** (更新)
   - 添加 `credit_balance` 字段 (Integer, nullable)
   - 用于跟踪用户的可用积分

## 关键设计决策

### 为什么选择这个方案？

1. **避免 Supabase 连接池超标**
   - 开发环境使用本地 JWT，不需要查询 Supabase
   - 保留现有 Supabase 基础设施以供生产环境使用

2. **最小化代码变更**
   - 保留现有 Mock 登录 UI
   - 只在后台添加 `/dev/token` 端点
   - 前端自动获取和注入 token

3. **安全考虑**
   - `/dev/token` 端点仅在 `dev` profile 启用
   - 默认 JWT 密钥在生产环境应修改
   - 可通过 `JWT_HS256_SECRET` 环境变量配置

4. **易于切换**
   - 后端只需改变 `spring.profiles.active`
   - 前端 `USE_SUPABASE` flag 可切换认证方式
   - 升级到生产环境时无需代码改动

## 已完成的任务清单

- ✅ 添加 jjwt 库到 build.gradle
- ✅ 创建 SecurityConfig 启用 OAuth2 Resource Server
- ✅ 创建 JwtTokenProvider 工具类生成 token
- ✅ 创建 DevAuthController 的 /dev/token 端点
- ✅ 修改 WorkshopController join/leave 使用 Authentication
- ✅ 修改 apiCall() 自动注入 Authorization header
- ✅ 添加 devLogin() 函数获取 JWT
- ✅ 修改 AppContext.signIn() 自动调用 devLogin()
- ✅ 连接 attendWorkshop/cancelWorkshopAttendance 到后端 API
- ✅ 修复 Workshop ID 映射（使用 Long.toString() 而不是 "w_" 前缀）
- ✅ 修复 FacilitatorDto ID 映射（使用 UUID.toString() 而不是 "u_" 前缀）

## 下一步建议

1. **完整测试流程**（参见上面的测试流程部分）

2. **处理其他 Controller**
   - 检查 UserController 是否需要类似更新
   - 检查 create/delete workshop 端点

3. **错误处理**
   - 添加更详细的错误日志
   - 处理 token 过期的场景

4. **性能优化**
   - 考虑缓存 workshop 列表
   - 优化数据库查询

5. **生产迁移**
   - 配置 Supabase JWT 验证
   - 移除 /dev/token 端点
   - 设置 `JWT_HS256_SECRET` 环境变量
