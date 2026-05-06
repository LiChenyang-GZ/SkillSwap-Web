const fs = require("fs");
const MAX_INLINE_COMMENTS = 20;

function readFile(path) {
  return fs.readFileSync(path, "utf8");
}

function readFirstExisting(paths, { required = false } = {}) {
  for (const path of paths) {
    if (fs.existsSync(path)) {
      return readFile(path);
    }
  }

  if (required) {
    throw new Error(`Required review skill file is missing. Tried: ${paths.join(", ")}`);
  }

  return "";
}

function loadSkillFiles() {
  return {
    frontend: [
      ".ai-review/frontend-skill.md",
      ".ai-review/frontend-review.md",
    ],
    backend: [
      ".ai-review/backend-skill.md",
      ".ai-review/backend-review.md",
    ],
    general: [
      ".ai-review/general-skill.md",
      ".ai-review/general-review.md",
    ],
  };
}

function detectMode(reviewComment) {
  if (reviewComment.includes("/review-fullstack")) return "fullstack";
  if (reviewComment.includes("/review-frontend")) return "frontend";
  if (reviewComment.includes("/review-backend")) return "backend";
  return "fullstack";
}

function parseModelFromComment(reviewComment) {
  const normalizedComment = ` ${reviewComment.toLowerCase()} `;
  const hasGpt55Alias = /(^|\s)(\/review-gpt-5\.5|\/review-gpt55|gpt55)(?=\s|$)/.test(
    normalizedComment,
  );
  const hasGpt54Alias = /(^|\s)(\/review-gpt-5\.4|\/review-gpt54|gpt54)(?=\s|$)/.test(
    normalizedComment,
  );

  if (hasGpt55Alias) {
    return { provider: "openai", model: "gpt-5.5" };
  }

  if (hasGpt54Alias) {
    return { provider: "openai", model: "gpt-5.4" };
  }

  const tokens = [...normalizedComment.matchAll(/\/review-([a-z0-9.\-]+)/g)].map(
    (match) => match[1],
  );
  const reserved = new Set(["frontend", "backend", "fullstack", "summary"]);

  for (const token of tokens) {
    if (reserved.has(token)) {
      continue;
    }

    if (token.startsWith("gpt-")) {
      return { provider: "openai", model: token };
    }

    if (token.startsWith("claude-")) {
      return { provider: "claude", model: token };
    }
  }

  return null;
}

function resolveModelSelection(reviewComment) {
  const parsed = parseModelFromComment(reviewComment);
  if (parsed) {
    return parsed;
  }

  if (reviewComment.toLowerCase().includes("claude")) {
    return {
      provider: "claude",
      model: process.env.CLAUDE_MODEL || "claude-sonnet-4-5",
    };
  }

  return {
    provider: "openai",
    model: process.env.OPENAI_MODEL || "gpt-5.4-mini",
  };
}

function buildSpecificSkill(mode, skillFiles) {
  if (mode === "frontend") {
    return readFirstExisting(skillFiles.frontend, { required: true });
  }

  if (mode === "backend") {
    return readFirstExisting(skillFiles.backend, { required: true });
  }

  if (mode !== "fullstack") {
    throw new Error(`Unsupported review mode: ${mode}`);
  }

  const frontendSkill = readFirstExisting(skillFiles.frontend, { required: true });
  const backendSkill = readFirstExisting(skillFiles.backend, { required: true });

  return `${frontendSkill}\n\n${backendSkill}`;
}

function parseRightSideLinesFromDiff(diff) {
  const allowed = new Map();

  let currentFile = null;
  let newLine = 0;
  let inHunk = false;

  const lines = diff.split("\n");

  for (const rawLine of lines) {
    if (rawLine.startsWith("diff --git ")) {
      currentFile = null;
      inHunk = false;
      continue;
    }

    if (rawLine.startsWith("+++ b/")) {
      currentFile = rawLine.replace("+++ b/", "").trim();
      inHunk = false;
      if (!allowed.has(currentFile)) {
        allowed.set(currentFile, new Set());
      }
      continue;
    }

    const hunkMatch = rawLine.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/);
    if (hunkMatch) {
      newLine = Number(hunkMatch[1]);
      inHunk = true;
      continue;
    }

    if (!currentFile || !inHunk) continue;

    if (rawLine.startsWith("+") && !rawLine.startsWith("+++")) {
      allowed.get(currentFile).add(newLine);
      newLine += 1;
    } else if (rawLine.startsWith("-") && !rawLine.startsWith("---")) {
      // Deleted line. Does not advance new file line number.
    } else if (rawLine.startsWith(" ")) {
      // Context line on RIGHT side.
      allowed.get(currentFile).add(newLine);
      newLine += 1;
    } else if (rawLine.startsWith("\\ No newline at end of file")) {
      // Diff metadata, not an actual line number.
    } else {
      // Any unexpected line ends hunk parsing until the next @@ header.
      inHunk = false;
    }
  }

  return allowed;
}

function isAllowedLine(allowedLines, path, line) {
  return allowedLines.has(path) && allowedLines.get(path).has(Number(line));
}

function buildPrompt({ mode, generalSkill, specificSkill, diff }) {
  return `
You are reviewing a GitHub pull request and must produce inline review comments.

Review mode: ${mode}

Use the following review rules.

<GENERAL_REVIEW_RULES>
${generalSkill}
</GENERAL_REVIEW_RULES>

<SPECIFIC_REVIEW_RULES>
${specificSkill}
</SPECIFIC_REVIEW_RULES>

<PROJECT_CONTEXT>
This repository contains frontend refactoring work and backend Spring Boot logic.

Frontend areas may include:
- React / React Native
- state ownership
- derived state
- useEffect dependencies
- component boundaries
- hook contracts

Backend areas may include:
- Spring Boot / Java 17
- controller/service/repository boundaries
- authorization and validation
- transactions and data consistency
- API contract stability
- deployment configuration
</PROJECT_CONTEXT>

<OUTPUT_RULES>
Return ONLY valid JSON. Do not wrap it in markdown.

Schema:
{
  "summary": "short overall summary",
  "comments": [
    {
      "path": "relative/path/to/file.ext",
      "line": 123,
      "severity": "High | Medium | Low",
      "body": "Observed issue first. Then one sentence impact. Then one minimal suggested change."
    }
  ]
}

Rules:
- Only comment on lines that exist on the RIGHT side of a diff hunk (+ or context lines).
- Use the new-file line number shown by the diff.
- Prefer concise but sufficiently broad coverage.
- Report all clearly supported issues that affect correctness, predictable behavior, maintainability, security, API contracts, frontend state/effect correctness, backend data consistency, or production safety.
- Maximum ${MAX_INLINE_COMMENTS} inline comments.
- Do not comment on formatting only.
- Do not invent issues not supported by the diff.
- Prefer minimal-diff recommendations.
- Do not request large rewrites unless there is clear behavioral or maintainability impact.
- If there are no meaningful issues, return:
{
  "summary": "No major issues found.",
  "comments": []
}

<PR_DIFF>
${diff}
</PR_DIFF>
`;
}

function extractJson(text) {
  const trimmed = text.trim();

  try {
    return JSON.parse(trimmed);
  } catch (_) {
    const first = trimmed.indexOf("{");
    const last = trimmed.lastIndexOf("}");

    if (first === -1 || last === -1 || last <= first) {
      throw new Error("Model did not return JSON.");
    }

    return JSON.parse(trimmed.slice(first, last + 1));
  }
}

async function reviewWithOpenAI(prompt, model) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is missing");
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "{}";
}

async function reviewWithClaude(prompt, model) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is missing");
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 2500,
      temperature: 0.2,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Claude API error: ${response.status} ${errorText}`);
  }

  const data = await response.json();

  return data.content
    ?.filter((block) => block.type === "text")
    ?.map((block) => block.text)
    ?.join("\n\n") || "{}";
}

async function githubRequest(path, options = {}) {
  const token = process.env.GITHUB_TOKEN;
  const [owner, repo] = process.env.GITHUB_REPOSITORY.split("/");

  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`GitHub API error: ${response.status} ${errorText}`);
  }

  return response.json();
}

function formatReviewBody({ provider, model, mode, summary, skippedCount }) {
  let body = `AI inline review using ${provider} (${model}). Mode: ${mode}.\n\n${summary || ""}`;

  if (skippedCount > 0) {
    body += `\n\nNote: ${skippedCount} generated comment(s) were skipped because their path/line was not present on the RIGHT side of the diff hunk.`;
  }

  return body;
}

async function createInlineReview({ comments, body }) {
  const pullNumber = process.env.PR_NUMBER;
  const commitId = process.env.HEAD_SHA;

  return githubRequest(`/pulls/${pullNumber}/reviews`, {
    method: "POST",
    body: JSON.stringify({
      commit_id: commitId,
      event: "COMMENT",
      body,
      comments,
    }),
  });
}

async function createFallbackComment(body) {
  const pullNumber = process.env.PR_NUMBER;

  return githubRequest(`/issues/${pullNumber}/comments`, {
    method: "POST",
    body: JSON.stringify({ body }),
  });
}

async function main() {
  const reviewComment = process.env.REVIEW_COMMENT || "";
  const mode = detectMode(reviewComment);
  const { provider, model } = resolveModelSelection(reviewComment);
  const skillFiles = loadSkillFiles();

  const diff = readFile("pr_limited.diff");
  const allowedLines = parseRightSideLinesFromDiff(diff);

  const generalSkill = readFirstExisting(skillFiles.general);
  const specificSkill = buildSpecificSkill(mode, skillFiles);

  const prompt = buildPrompt({
    mode,
    generalSkill,
    specificSkill,
    diff,
  });

  const rawOutput =
    provider === "claude"
      ? await reviewWithClaude(prompt, model)
      : await reviewWithOpenAI(prompt, model);

  const parsed = extractJson(rawOutput);

  const generatedComments = Array.isArray(parsed.comments) ? parsed.comments : [];

  const validComments = [];
  let skippedCount = 0;

  for (const comment of generatedComments.slice(0, MAX_INLINE_COMMENTS)) {
    const path = String(comment.path || "");
    const line = Number(comment.line);
    const severity = String(comment.severity || "Medium");
    const body = String(comment.body || "").trim();

    if (!path || !line || !body || !isAllowedLine(allowedLines, path, line)) {
      skippedCount += 1;
      continue;
    }

    validComments.push({
      path,
      line,
      side: "RIGHT",
      body: `**${severity}**: ${body}`,
    });
  }

  const reviewBody = formatReviewBody({
    provider,
    model,
    mode,
    summary: parsed.summary,
    skippedCount,
  });

  if (validComments.length > 0) {
    try {
      await createInlineReview({
        comments: validComments,
        body: reviewBody,
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      await createFallbackComment(
        `## 🤖 AI Review\n\n${reviewBody}\n\nInline posting failed, fallback to normal comment.\n\nReason: ${reason}`,
      );
    }
  } else {
    await createFallbackComment(`## 🤖 AI Review\n\n${reviewBody}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
