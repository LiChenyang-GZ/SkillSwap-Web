const fs = require("fs");

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
  const tokens = [...reviewComment.toLowerCase().matchAll(/\/review-([a-z0-9.\-]+)/g)].map(
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
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
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

function buildPrompt({ mode, generalSkill, specificSkill, diff }) {
  return `
You are reviewing a GitHub pull request.

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
Return markdown only.

Prefer fewer, higher-confidence comments.
Do not comment on formatting only.
Do not invent issues not supported by the diff.
Do not request large rewrites unless there is clear behavioral or maintainability impact.

Output format:

## Summary
1-2 sentences.

## Review Comments

For each issue:
- Severity: High / Medium / Low
- Area:
- Observed issue:
- Impact:
- Suggested minimal change:

If there are no meaningful issues, return:
No major issues found.
</OUTPUT_RULES>

<PR_DIFF>
${diff}
</PR_DIFF>
`;
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
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "No review generated.";
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
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Claude API error: ${response.status} ${errorText}`);
  }

  const data = await response.json();

  const textBlocks = data.content
    ?.filter((block) => block.type === "text")
    ?.map((block) => block.text)
    ?.join("\n\n");

  return textBlocks || "No review generated.";
}

async function main() {
  const reviewComment = process.env.REVIEW_COMMENT || "";
  const skillFiles = loadSkillFiles();

  const mode = detectMode(reviewComment);
  const { provider, model } = resolveModelSelection(reviewComment);

  const diff = readFile("pr_limited.diff");
  const generalSkill = readFirstExisting(skillFiles.general);
  const specificSkill = buildSpecificSkill(mode, skillFiles);

  const prompt = buildPrompt({
    mode,
    generalSkill,
    specificSkill,
    diff,
  });

  let review;

  if (provider === "claude") {
    review = await reviewWithClaude(prompt, model);
  } else {
    review = await reviewWithOpenAI(prompt, model);
  }

  const header = `Model provider: ${provider}\nModel name: ${model}\nReview mode: ${mode}\n\n`;

  fs.writeFileSync("review.md", header + review, "utf8");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
