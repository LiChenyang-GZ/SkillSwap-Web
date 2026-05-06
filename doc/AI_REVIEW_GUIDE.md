# AI Review 使用说明

## 1. 功能概览

这套 AI Review 支持两条工作流：

1. Inline Review：在代码 diff 行上直接发 review comments。
2. Summary Review：在 PR 时间线发一条汇总评论。

Inline Review 采用 Context First 两阶段：

1. 先基于 `pr_limited.diff` 生成 `prContext`
2. 再基于 `prContext + diff` 生成 inline comments

`prContext` 固定包含四段：

1. Pull request overview
2. Changes
3. Review scope detected
4. Suggested review focus

支持两种模型：

1. OpenAI（默认）
2. Claude（评论里包含 `claude` 即切换，或直接写 `claude-*` 模型命令）

支持三种评审模式：

1. `frontend`
2. `backend`
3. `fullstack`（前后端一起）

## 2. 触发位置与权限

1. 触发位置：必须在 PR 页面底部评论区发命令。
2. 触发事件：`issue_comment` 的 `created`。
3. 触发权限：评论人必须是 `OWNER` / `MEMBER` / `COLLABORATOR`。
4. Bot 评论不会触发 workflow。

## 3. 命令总表

### 3.1 Inline Review 命令

1. `/review-frontend`
作用：生成 PR context + 按前端规则发 inline comments。

2. `/review-backend`
作用：生成 PR context + 按后端规则发 inline comments。

3. `/review-fullstack`
作用：生成 PR context + 按前后端规则发 inline comments。

4. `/review-context`
作用：只输出 PR context（四段），不发 inline comments。

5. `/review-frontend claude` 或 `/review-frontend-claude`
作用：Claude + 前端规则，发 inline comments。

6. `/review-backend claude` 或 `/review-backend-claude`
作用：Claude + 后端规则，发 inline comments。

7. `/review-fullstack claude` 或 `/review-fullstack-claude`
作用：Claude + 前后端规则，发 inline comments。

8. `/review-fullstack /review-gpt-5.4`
作用：强制使用 `gpt-5.4`。

9. `/review-fullstack /review-gpt54` 或 `/review-fullstack gpt54`
作用：OpenAI 模型别名，等价于 `gpt-5.4`。

10. `/review-fullstack /review-gpt-5.5` / `/review-gpt55` / `gpt55`
作用：强制使用 `gpt-5.5`。

11. `/review-frontend /review-claude-sonnet-4-5`
作用：强制使用指定 Claude 模型。

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
3. Inline 中包含 `/review-context`：只发布 PR context，不发布 inline comments。
4. 同时包含多个模式关键字时，优先级为：`/review-fullstack` > `/review-frontend` > `/review-backend`。
5. 评论里出现 `/review-gpt-*` 或 `/review-claude-*` 时，优先使用该模型。
6. 如果没有显式模型命令，评论内容里包含 `claude`（大小写不敏感）就切到 Claude，否则默认 OpenAI。
7. OpenAI 别名支持：`/review-gpt54`、`gpt54`、`/review-gpt55`、`gpt55`。
8. 显式模型命令可与 frontend/backend/fullstack、summary 组合使用。
9. 未写模式关键字时，默认 `fullstack`。

## 5. 依赖的 Secret 与默认模型

在仓库 `Settings -> Secrets and variables -> Actions` 中配置：

1. `OPENAI_API_KEY`
2. `ANTHROPIC_API_KEY`

默认模型（workflow env）：

1. `OPENAI_MODEL: gpt-5.4-mini`
2. `CLAUDE_MODEL: claude-sonnet-4-5`

## 6. 规则文件位置

当前使用的规则文件在：

1. `.ai-review/frontend-review.md`
2. `.ai-review/backend-review.md`
3. `.ai-review/general-review.md`

脚本兼容以下命名（优先前者）：

1. `frontend-skill.md` 或 `frontend-review.md`
2. `backend-skill.md` 或 `backend-review.md`
3. `general-skill.md` 或 `general-review.md`

推荐维护策略：

1. `general-review.md`：全局优先级与 context-first 规则
2. `frontend-review.md`：前端专项风险
3. `backend-review.md`：后端专项风险

## 7. 相关工作流与脚本

1. Inline workflow：`.github/workflows/ai-review-inline.yml`
2. Summary workflow：`.github/workflows/ai-pr-review.yml`
3. Inline 脚本：`.github/scripts/ai-review-inline.js`
4. Summary 脚本：`.github/scripts/ai-review.js`

## 8. 常见问题排查

1. 评论后没有触发 workflow。
检查是否在 PR 评论区发送、是否是 `created` 事件、评论人是否有 OWNER/MEMBER/COLLABORATOR 身份、是否为 Bot。

2. 想走 Claude 但实际走了 OpenAI。
确认评论文本里包含 `claude`（例如 `/review-fullstack claude`）。

3. Inline 没出现，只出现普通评论。
这是兜底逻辑：当 inline API 定位失败或返回校验失败时，会降级成普通评论，避免任务直接失败。

4. 想先看上下文再决定是否 inline。
先使用 `/review-context` 获取 context（四段），再决定跑 `/review-frontend`、`/review-backend` 或 `/review-fullstack`。

5. 评论太少或没命中关键问题。
当前 diff 会被截断（inline 与 summary 都是 `200000` 字符），大 PR 建议拆小后再 review。
