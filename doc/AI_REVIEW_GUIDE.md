# AI Review 使用说明

## 1. 功能概览

这套 AI Review 支持两种输出：

1. Inline Review：在代码 diff 行上直接发 review comments。  
2. Summary Review：在 PR 时间线发一条汇总评论。

支持两种模型：

1. OpenAI（默认）  
2. Claude（评论里包含 `claude` 即切换，或直接写 `claude-*` 模型命令）

支持三种评审模式：

1. `frontend`  
2. `backend`  
3. `fullstack`（前后端一起）

## 2. 触发位置与权限

1. 触发位置：必须在 **PR 页面底部评论区** 发命令。  
2. 触发事件：`issue_comment` 的 `created`。  
3. 触发权限：评论人必须是 `OWNER` / `MEMBER` / `COLLABORATOR`。  

## 3. 命令总表

### 3.1 Inline Review 命令

1. `/review-frontend`  
作用：OpenAI + 前端规则，发 inline comments。

2. `/review-backend`  
作用：OpenAI + 后端规则，发 inline comments。

3. `/review-fullstack`  
作用：OpenAI + 前后端规则，发 inline comments。

4. `/review-frontend claude` 或 `/review-frontend-claude`  
作用：Claude + 前端规则，发 inline comments。

5. `/review-backend claude` 或 `/review-backend-claude`  
作用：Claude + 后端规则，发 inline comments。

6. `/review-fullstack claude` 或 `/review-fullstack-claude`  
作用：Claude + 前后端规则，发 inline comments。

7. `/review-fullstack /review-gpt-5.4`  
作用：强制使用指定 OpenAI 模型（示例：`gpt-5.4`）。

8. `/review-frontend /review-claude-sonnet-4-5`  
作用：强制使用指定 Claude 模型（示例：`claude-sonnet-4-5`）。

### 3.2 Summary Review 命令

1. `/review-summary /review-frontend`  
作用：OpenAI + 前端规则，发一条汇总评论。

2. `/review-summary /review-backend`  
作用：OpenAI + 后端规则，发一条汇总评论。

3. `/review-summary /review-fullstack`  
作用：OpenAI + 前后端规则，发一条汇总评论。

4. `/review-summary /review-frontend claude`  
作用：Claude + 前端规则，发一条汇总评论。

5. `/review-summary /review-backend claude`  
作用：Claude + 后端规则，发一条汇总评论。

6. `/review-summary /review-fullstack claude`  
作用：Claude + 前后端规则，发一条汇总评论。

7. `/review-summary /review-fullstack /review-gpt-5.4`  
作用：Summary 并强制使用指定 OpenAI 模型。

8. `/review-summary /review-backend /review-claude-sonnet-4-5`  
作用：Summary 并强制使用指定 Claude 模型。

## 4. 命令解析规则

1. 包含 `/review-summary`：走 Summary workflow。  
2. 包含 `/review` 且不包含 `/review-summary`：走 Inline workflow。  
3. 同时包含多个模式关键字时，优先级为：`/review-fullstack` > `/review-frontend` > `/review-backend`。  
4. 评论里出现 `/review-gpt-*` 或 `/review-claude-*` 时，优先使用该模型。  
5. 如果没有显式模型命令，评论内容里包含 `claude`（大小写不敏感）就切到 Claude，否则默认 OpenAI。  
6. 显式模型命令示例：`/review-gpt-5.4`、`/review-claude-sonnet-4-5`。  
7. 显式模型命令可与 frontend/backend/fullstack、summary 组合使用。  
8. 未写模式关键字时，默认 `fullstack`。  

## 5. 依赖的 Secret 与默认模型

在仓库 `Settings -> Secrets and variables -> Actions` 中配置：

1. `OPENAI_API_KEY`  
2. `ANTHROPIC_API_KEY`  

默认模型（在 workflow env 中）：

1. `OPENAI_MODEL: gpt-4o-mini`  
2. `CLAUDE_MODEL: claude-sonnet-4-5`  

## 6. 规则文件位置

当前使用的规则文件在：

1. [.ai-review/frontend-review.md](/E:/study/项目/SkillSwap-Web/.ai-review/frontend-review.md)  
2. [.ai-review/backend-review.md](/E:/study/项目/SkillSwap-Web/.ai-review/backend-review.md)  

脚本兼容以下命名（优先前者）：

1. `frontend-skill.md` 或 `frontend-review.md`  
2. `backend-skill.md` 或 `backend-review.md`  

`general` 规则是可选项，不提供也不会阻塞当前 frontend/backend/fullstack 使用。

## 7. 相关工作流与脚本

1. Inline workflow：  
[.github/workflows/ai-review-inline.yml](/E:/study/项目/SkillSwap-Web/.github/workflows/ai-review-inline.yml)

2. Summary workflow：  
[.github/workflows/ai-pr-review.yml](/E:/study/项目/SkillSwap-Web/.github/workflows/ai-pr-review.yml)

3. Inline 脚本：  
[.github/scripts/ai-review-inline.js](/E:/study/项目/SkillSwap-Web/.github/scripts/ai-review-inline.js)

4. Summary 脚本：  
[.github/scripts/ai-review.js](/E:/study/项目/SkillSwap-Web/.github/scripts/ai-review.js)

## 8. 常见问题排查

1. 评论后没有触发 workflow。  
检查是否在 PR 评论区发送、是否是 `created` 事件、评论人是否有 OWNER/MEMBER/COLLABORATOR 身份。

2. 想走 Claude 但实际走了 OpenAI。  
确认评论文本里包含 `claude`（例如 `/review-fullstack claude`）。

3. Inline 没出现，只出现普通评论。  
这是兜底逻辑：当 inline API 定位失败或返回校验失败时，会降级成普通评论，避免任务直接失败。

4. 评论太少或没命中关键问题。  
当前 diff 会被截断（inline: 100000 字符，summary: 60000 字符），大 PR 建议拆小后再 review。
