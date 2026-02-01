# unitAI Workflows Reference

This document provides detailed information about unitAI workflows. Consult this when task requirements are ambiguous or workflow selection is unclear.

## Contents
- [1. parallel-review (Code Review)](#1-parallel-review-code-review)
- [2. feature-design (Feature Development)](#2-feature-design-feature-development)
- [3. pre-commit-validate (Pre-Commit Validation)](#3-pre-commit-validate-pre-commit-validation)
- [4. bug-hunt (Root Cause Analysis)](#4-bug-hunt-root-cause-analysis)
- [5. refactor-sprint (Large-Scale Refactoring)](#5-refactor-sprint-large-scale-refactoring)
- [6. validate-last-commit (Post-Commit Validation)](#6-validate-last-commit-post-commit-validation)

## Available Workflows

### 1. parallel-review (Code Review)

**Purpose:** Comprehensive code review using multiple AI backends in parallel.

**Backends Used:** ask-gemini (architecture), ask-qwen (patterns), optionally ask-cursor/ask-droid

**Parameters:**
```typescript
{
  files: string[],              // Required: Files to review
  focus: 'security' | 'quality' | 'performance' | 'architecture' | 'all',
  strategy: 'standard' | 'double-check',  // double-check adds Cursor+Droid
  autonomyLevel: 'read-only' | 'low' | 'medium' | 'high'
}
```

**Cost:** HIGH (multiple backends in parallel)
**Duration:** 30-60s

**Best For:**
- Pre-merge code review
- Security audits
- Comprehensive quality checks
- Architecture analysis

**Not Recommended For:**
- Quick syntax fixes (use CCS instead)
- Single file formatting

**Example:**
```javascript
// Security review
mcp__unitAI__workflow_parallel_review({
  files: ['src/auth.ts', 'src/middleware.ts'],
  focus: 'security',
  autonomyLevel: 'read-only'
});

// Comprehensive review with double-check
mcp__unitAI__workflow_parallel_review({
  files: ['src/core/payment.ts'],
  strategy: 'double-check',
  focus: 'quality',
  autonomyLevel: 'read-only'
});
```

---

### 2. feature-design (Feature Development)

**Purpose:** Orchestrates multi-agent team to design, implement, and test a feature.

**Agents:** ArchitectAgent → ImplementerAgent → TesterAgent

**Parameters:**
```typescript
{
  featureDescription: string,   // Required: What to build
  targetFiles?: string[],        // Optional: Files to modify
  architecturalFocus?: 'performance' | 'security' | 'maintainability',
  testType?: 'unit' | 'integration' | 'e2e',
  autonomyLevel: 'low' | 'medium' | 'high'
}
```

**Cost:** HIGH (three agents in sequence)
**Duration:** 45-90s

**Best For:**
- New feature implementation
- Complex refactoring
- End-to-end development

**Not Recommended For:**
- Simple one-line fixes
- Quick bug patches

**Example:**
```javascript
// New API endpoint
mcp__unitAI__workflow_feature_design({
  featureDescription: 'Add GET /api/users endpoint with caching',
  targetFiles: ['src/api/users.ts', 'src/services/cache.ts'],
  architecturalFocus: 'performance',
  testType: 'integration',
  autonomyLevel: 'high'
});
```

---

### 3. pre-commit-validate (Pre-Commit Validation)

**Purpose:** Validate staged changes before committing to git.

**Checks:**
- Security secrets detection
- Code quality (linting, patterns)
- Breaking changes detection

**Parameters:**
```typescript
{
  depth: 'quick' | 'thorough' | 'paranoid',
  autonomyLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'AUTONOMOUS'
}
```

**Cost:** MEDIUM (Gemini + Qwen), HIGH if depth=paranoid (adds Droid)
**Duration:** 15-45s depending on depth

**Best For:**
- Pre-commit hooks
- CI/CD validation
- Quality gates

**Not Recommended For:**
- Committed code (use validate-last-commit instead)

**Example:**
```javascript
// Thorough validation before commit
mcp__unitAI__workflow_pre_commit_validate({
  depth: 'thorough',
  autonomyLevel: 'MEDIUM'
});

// Paranoid mode for critical branches
mcp__unitAI__workflow_pre_commit_validate({
  depth: 'paranoid',
  autonomyLevel: 'HIGH'
});
```

---

### 4. bug-hunt (Root Cause Analysis)

**Purpose:** Multi-agent investigation to find and analyze bugs based on symptoms.

**Process:**
1. Search codebase for relevant files (if not provided)
2. Parallel analysis: Gemini (root cause) + Cursor (hypothesis)
3. Droid generates remediation plan
4. Check related files for impact

**Parameters:**
```typescript
{
  symptoms: string,             // Required: Bug description or error message
  suspected_files?: string[],   // Optional: Files to investigate
  autonomyLevel: 'LOW' | 'MEDIUM' | 'HIGH'
}
```

**Cost:** HIGH (multiple agents + codebase search)
**Duration:** 1-2m

**Best For:**
- Complex bugs with unknown origin
- Root cause analysis
- Generating fix strategies

**Not Recommended For:**
- Simple syntax errors (use CCS)
- Known bugs (fix directly)

**Example:**
```javascript
// Investigate crash
mcp__unitAI__workflow_bug_hunt({
  symptoms: "App crashes on startup with 'undefined is not an object' in auth.ts",
  autonomyLevel: 'MEDIUM'
});

// Performance issue with suspected file
mcp__unitAI__workflow_bug_hunt({
  symptoms: 'Dashboard load time increased by 5s after last deploy',
  suspected_files: ['src/components/Dashboard.tsx'],
  autonomyLevel: 'MEDIUM'
});
```

---

### 5. refactor-sprint (Large-Scale Refactoring)

**Purpose:** Coordinates multi-agent team to plan and execute complex refactor.

**Process:**
1. Cursor Agent: Generates refactoring plan and patches
2. Gemini: Reviews plan for architectural risks
3. Droid: Creates operational checklist for execution

**Parameters:**
```typescript
{
  targetFiles: string[],        // Required: Files to refactor
  scope: string,                // Required: Refactoring description
  depth: 'shallow' | 'deep'
}
```

**Cost:** HIGH (three agents in coordination)
**Duration:** 1-2m

**Best For:**
- Large-scale refactoring
- Technical debt cleanup
- Migration tasks

**Not Recommended For:**
- Small style fixes (use CCS)
- Single function rewrites

**Example:**
```javascript
// Migrate to Context API
mcp__unitAI__workflow_refactor_sprint({
  targetFiles: ['src/components/App.tsx', 'src/store/redux.ts'],
  scope: 'Replace Redux with React Context',
  depth: 'deep'
});
```

---

### 6. validate-last-commit (Post-Commit Validation)

**Purpose:** Analyze a specific git commit for quality, security, and breaking changes.

**Parameters:**
```typescript
{
  commit_ref?: string,          // Default: 'HEAD'
  autonomyLevel: 'read-only' | 'low' | 'medium' | 'high'
}
```

**Cost:** MEDIUM (Gemini + Cursor analysis)
**Duration:** 20-40s

**Best For:**
- CI pipelines
- Post-commit reviews
- Release validation

**Example:**
```javascript
// Validate most recent commit
mcp__unitAI__workflow_validate_last_commit({
  autonomyLevel: 'read-only'
});

// Validate specific commit
mcp__unitAI__workflow_validate_last_commit({
  commit_ref: 'abc123',
  autonomyLevel: 'low'
});
```

---

## Autonomy Levels

| Level         | Behavior                                           |
|---------------|---------------------------------------------------|
| `read-only`   | Only read files, no modifications                 |
| `low/LOW`     | Suggest changes, require explicit approval        |
| `medium/MEDIUM` | Make safe changes, warn on risky operations      |
| `high/HIGH`   | Autonomous execution with minimal intervention    |
| `AUTONOMOUS`  | Full autonomy (use with caution)                  |

**Note:** Case sensitivity varies by workflow. When in doubt, match the examples above.

---

## Cost Indicators

| Cost   | Typical Use Case                          | Token Usage Estimate |
|--------|-------------------------------------------|----------------------|
| LOW    | CCS simple tasks (GLM)                    | 5K-20K tokens        |
| MEDIUM | Single backend analysis, validation       | 30K-80K tokens       |
| HIGH   | Multi-agent workflows, parallel execution | 100K-300K tokens     |

---

## Troubleshooting

### "Invalid enum value" Error
**Cause:** Case mismatch in autonomyLevel parameter
**Solution:** Check workflow description for correct case:
- `parallel_review`: lowercase (`'read-only'`, `'low'`, `'medium'`, `'high'`)
- `bug_hunt`, `pre_commit_validate`: UPPERCASE (`'LOW'`, `'MEDIUM'`, `'HIGH'`)

### "Unable to identify relevant files"
**Cause:** Workflow couldn't find files automatically
**Solution:** Provide `suspected_files` or `targetFiles` parameter explicitly

### "No staged files to validate"
**Cause:** pre-commit-validate requires staged git changes
**Solution:** Run `git add` before validation, or use `validate-last-commit` instead

---

## When to Consult This Reference

- Task pattern is ambiguous (e.g., "improve quality" → review vs refactor?)
- Need to understand workflow parameters for complex cases
- Troubleshooting workflow errors
- Deciding between similar workflows (e.g., parallel-review vs triangulated-review)

For simple keyword-based decisions, the main SKILL.md auto-selection logic is sufficient.
