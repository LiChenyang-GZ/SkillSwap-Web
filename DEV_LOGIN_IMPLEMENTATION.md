# 🔧 修复 IDE 编译错误和后端设置

## 问题
IDE 显示 `io.jsonwebtoken cannot be resolved` 错误

## 解决方案

### 方案 1：清理 Gradle 缓存（推荐）
在后端目录运行：

```bash
cd skill-swap-backend

# Windows (PowerShell)
.\gradlew.bat clean --refresh-dependencies
.\gradlew.bat build -x test

# Mac/Linux
./gradlew clean --refresh-dependencies
./gradlew build -x test
```

### 方案 2：在 IDE 中刷新 Gradle
1. **VS Code**:
   - 打开命令面板 (Ctrl+Shift+P / Cmd+Shift+P)
   - 搜索 "Java: Configure Classpath"
   - 运行它

2. **IntelliJ IDEA**:
   - 右键点击 `build.gradle`
   - 选择 "Load Gradle Changes" 或 "Reload Gradle Project"

### 方案 3：删除 IDE 缓存
- **VS Code**: 删除 `.vscode/settings.json` 中的缓存配置
- **IntelliJ**: File → Invalidate Caches → Invalidate and Restart

---

## ✅ 已完成的后端更新

### 1. 添加了 `/dev/auth/dev-login` 端点

**请求**:
```bash
POST http://localhost:8080/dev/auth/dev-login
Content-Type: application/json

{
  "email": "user@example.com",
  "username": "username" // 可选，默认使用 email 前缀
}
```

**响应**:
```json
{
  "access_token": "eyJhbGc...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "email": "user@example.com",
    "username": "username",
    "creditBalance": 100,
    "avatarUrl": "https://i.pravatar.cc/150?img=...",
    "bio": "Dev user"
  },
  "expiresIn": 86400
}
```

**功能**:
- ✅ 仅在 `dev` profile 可用
- ✅ 自动创建新用户或返回已有用户
- ✅ 新用户初始积分为 100
- ✅ 生成有效的 JWT token
- ✅ 支持自定义 avatar 和 bio

### 2. 更新了 UserRepository
- ✅ 添加 `findByEmail(String email)` 方法

### 3. 更新了 DevAuthController
- ✅ 注入 UserRepository
- ✅ 实现 `/dev/auth/dev-login` 端点
- ✅ 错误处理和输入验证

---

## ✅ 已完成的前端更新

### 1. 添加了 `authAPI.devRegisterLogin()`
调用 `/dev/auth/dev-login` 并自动保存 token 到 localStorage

### 2. 更新了 `AppContext.signIn()`
- ✅ 删除了硬编码的 mockUser
- ✅ 调用后端 `devRegisterLogin()`
- ✅ 使用真实用户数据（从后端返回）
- ✅ 自动保存 JWT token
- ✅ 支持多用户（每个 email 独立账户）

---

## 🧪 完整测试流程

### 启动后端
```bash
cd skill-swap-backend
.\gradlew.bat bootRun --args="--spring.profiles.active=dev"
```

### 启动前端
```bash
cd skill-swap-frontend
npm run dev
```

### 测试登录
1. 访问 http://localhost:3000
2. 输入邮箱: `alice@skillswap.com`
3. 输入密码: `demo`
4. 点击登录

### 验证流程
- ✅ 用户成功登录
- ✅ 初始积分为 100
- ✅ localStorage 包含 `dev_token`
- ✅ 页面显示用户信息

### 测试多用户
1. 登出 (Sign Out)
2. 用另一个邮箱登录: `bob@skillswap.com`
3. 验证是不同的用户和独立的数据

### 测试积分功能
1. 登录后进入 "Explore Workshops"
2. 点击 "Attend" 加入工作坊
3. 验证：
   - ✅ Credits 减少（积分扣费）
   - ✅ DB 记录更新
   - ✅ workshop_participants 添加记录
   - ✅ credit_transaction 添加 JOIN 记录

### 验证数据库
```sql
-- 查看创建的用户
SELECT id, email, username, credit_balance FROM user_account 
WHERE email LIKE '%skillswap%' ORDER BY created_at DESC;

-- 查看参与者记录
SELECT up.*, w.title FROM workshop_participants up
JOIN workshops w ON up.workshop_id = w.id
ORDER BY up.registration_date DESC LIMIT 5;

-- 查看积分交易
SELECT * FROM credit_transaction 
ORDER BY created_at DESC LIMIT 10;
```

---

## 📝 密钥点

| 项目 | 说明 |
|-----|------|
| 端点 | `POST /dev/auth/dev-login` |
| 仅限 dev | ✅ Yes (profile check) |
| 自动创建用户 | ✅ Yes |
| 初始积分 | 100 |
| Token 保存位置 | localStorage (`dev_token`) |
| Token 过期时间 | 24 小时 |
| 支持多用户 | ✅ Yes (独立 email) |

---

## ❌ 常见问题

### Q: 登录后没有 token？
A: 检查浏览器 localStorage，应该看到 `dev_token` key

### Q: 每次登录积分重置为 100？
A: 不会。如果 email 已存在，使用已有用户（积分保留）

### Q: 如何清除所有测试数据？
A:
```sql
DELETE FROM credit_transaction;
DELETE FROM workshop_participants;
DELETE FROM user_account WHERE id NOT IN (SELECT facilitator_id FROM workshops);
```

### Q: IDE 还是显示红线错误？
A: 运行 `./gradlew clean --refresh-dependencies`，然后重启 IDE
