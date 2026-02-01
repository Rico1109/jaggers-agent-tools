---
name: delegation
description: >-
  Delegate tasks to optimal backend (CCS simple or unitAI workflows).
  Auto-selects based on keywords. Interactive menu for user choice.
version: 6.0.0
---

# Delegation

Delegate tasks to cost-optimized models (CCS) or multi-agent workflows (unitAI).

## When to Suggest

**Task Pattern → Backend Mapping** (auto-selection logic):

| Task Pattern                  | Backend     | Cost   | Reason                         |
|-------------------------------|-------------|--------|--------------------------------|
| `typo\|test\|doc\|format`     | CCS (GLM)   | LOW    | Simple deterministic           |
| `think\|analyze\|reason`      | CCS (Gemini)| MEDIUM | Requires reasoning             |
| `review.*(code\|security)`    | unitAI      | HIGH   | Multi-agent code review        |
| `implement.*feature`          | unitAI      | HIGH   | Full development workflow      |
| `validate.*commit`            | unitAI      | MEDIUM | Security+Quality validation    |
| `debug\|bug.*unknown`         | unitAI      | HIGH   | Root cause investigation       |

**Never Suggest For:**
- Architecture decisions requiring human judgment
- Security-critical without review
- Performance optimization (needs profiling first)

---

## Interactive Menu

### Step 1: Delegation Choice
```typescript
AskUserQuestion({
  questions: [{
    question: "This task can be delegated. How would you like to proceed?",
    header: "Execution",
    multiSelect: false,
    options: [
      {
        label: "Delegate (Recommended)",
        description: "Execute via optimal backend. Saves main session tokens and uses cost-efficient models."
      },
      {
        label: "Work in main session",
        description: "Execute in current Claude session. Better for tasks requiring discussion or complex context."
      }
    ]
  }]
});
```

**If user selects "Delegate"** → Continue to Step 2
**If user selects "Work in main session"** → Execute task normally (don't delegate)

### Step 2: Backend Selection
```typescript
AskUserQuestion({
  questions: [{
    question: "Which backend should handle this task?",
    header: "Backend",
    multiSelect: false,
    options: [
      {
        label: "Auto-select (Recommended)",
        description: "Analyzes task keywords and selects optimal backend/profile automatically"
      },

      // CCS Simple (existing)
      {
        label: "GLM - Cost-optimized",
        description: "Fast model for tests, typos, formatting [LOW COST]"
      },
      {
        label: "Gemini - Reasoning",
        description: "Analysis, thinking, architecture tasks [MEDIUM COST]"
      },
      {
        label: "Qwen - Quality",
        description: "Code quality, pattern detection [MEDIUM COST]"
      },

      // unitAI Workflows (NEW - single option, Claude picks workflow)
      {
        label: "unitAI Workflows",
        description: "Multi-agent orchestration for complex tasks (review, feature dev, debugging) [HIGH COST]"
      }
    ]
  }]
});
```

**User Selection Handling:**
- **"Auto-select"** → Use keyword matching (see Auto-Selection Logic below)
- **"GLM/Gemini/Qwen"** → Force CCS with specified profile
- **"unitAI Workflows"** → Claude autonomously selects appropriate workflow based on task analysis

---

## Auto-Selection Logic

### Backend Selection (Keyword-Based)

Simple keyword detection (no complex scoring, fast execution):

```javascript
function selectBackend(task) {
  const taskLower = task.toLowerCase();

  // Priority 1: unitAI workflows (complex tasks)
  if (/review.*(code|security|quality)|code.*(review|audit)/.test(taskLower)) {
    return { backend: 'unitai', autoSelectWorkflow: true };
  }

  if (/implement.*(feature|api|auth)|design.*implement/.test(taskLower)) {
    return { backend: 'unitai', autoSelectWorkflow: true };
  }

  if (/validate.*(commit|staged)|pre.*commit/.test(taskLower)) {
    return { backend: 'unitai', autoSelectWorkflow: true };
  }

  if (/debug|bug|investigate|crash|error.*unknown/.test(taskLower)) {
    return { backend: 'unitai', autoSelectWorkflow: true };
  }

  // Priority 2: CCS simple tasks (fallback)
  if (/typo|test|doc|format|lint|add type/.test(taskLower)) {
    return { backend: 'ccs', profile: 'glm' };
  }

  if (/think|analyze|reason|evaluate/.test(taskLower)) {
    return { backend: 'ccs', profile: 'gemini' };
  }

  // Default: cost-optimized
  return { backend: 'ccs', profile: 'glm' };
}
```

**Override:** If task contains `--{backend}` flag, extract and use that backend/profile directly.

Examples:
- `--glm` → Force CCS with GLM profile
- `--gemini` → Force CCS with Gemini profile
- `--unitai` → Force unitAI (Claude picks workflow)

---

## unitAI Workflow Selection (Autonomous)

When `backend: 'unitai'` is selected, **Claude autonomously** chooses the appropriate workflow based on task analysis.

### Workflow Selection Logic

```javascript
function selectUnitAIWorkflow(task) {
  const taskLower = task.toLowerCase();

  // Code review patterns
  if (/review|analyze.*code|code.*quality|audit/.test(taskLower)) {
    const focus = /security/.test(taskLower) ? 'security' :
                  /performance/.test(taskLower) ? 'performance' : 'quality';
    return {
      workflow: 'parallel-review',
      params: { focus, autonomyLevel: 'read-only' }
    };
  }

  // Feature development patterns
  if (/implement.*feature|create.*endpoint|design.*implement/.test(taskLower)) {
    return {
      workflow: 'feature-design',
      params: { autonomyLevel: 'high' }
    };
  }

  // Validation patterns
  if (/validate|pre.*commit|check.*staged/.test(taskLower)) {
    const depth = /paranoid|thorough/.test(taskLower) ? 'paranoid' : 'thorough';
    return {
      workflow: 'pre-commit-validate',
      params: { depth, autonomyLevel: 'MEDIUM' }
    };
  }

  // Debugging patterns
  if (/debug|bug|crash|investigate/.test(taskLower)) {
    return {
      workflow: 'bug-hunt',
      params: { autonomyLevel: 'MEDIUM' }
    };
  }

  // Refactoring patterns
  if (/refactor.*sprint|major.*refactor|migrate/.test(taskLower)) {
    return {
      workflow: 'refactor-sprint',
      params: { depth: 'deep' }
    };
  }

  // Default: comprehensive review
  return {
    workflow: 'parallel-review',
    params: { focus: 'all', autonomyLevel: 'read-only' }
  };
}
```

**Reference Consultation:**
If task is ambiguous or workflow selection unclear, consult [references/unitai-workflows.md](references/unitai-workflows.md) for detailed workflow descriptions and parameters.

---

## Execution Flow

### For Direct Invocation (`/delegation [task]` or `/delegate [task]`)

1. **Parse override flag** (if present: `--glm`, `--gemini`, `--unitai`, etc.)
2. **Auto-select backend** using keyword-based logic above
3. **Route to appropriate backend:**
   - **CCS**: `ccs {profile} -p "{task}"`
   - **unitAI**:
     - Select workflow autonomously using selectUnitAIWorkflow()
     - Load unitAI tools: `ToolSearch("unitAI")`
     - Execute: `mcp__unitAI__workflow_{name}({ params })`
4. **Report results**: Backend, Workflow (if unitAI), Cost indicator, Duration

### For Continuation (`/delegation:continue [follow-up]` or `/delegate:continue`)

1. **Detect last backend** from delegation context
2. **Execute continuation:**
   - **CCS**: `ccs {profile}:continue -p "{follow-up}"`
   - **unitAI**: Continue with same workflow and session context
3. **Report results**: Session #, Incremental cost, Total cost

---

## Examples

### Auto-Selection Examples

**CCS Simple:**
- `/delegate add unit tests for UserService` → CCS (GLM)
  - Reason: "test" keyword → simple deterministic task

- `/delegate think about the best database schema` → CCS (Gemini)
  - Reason: "think" keyword → requires reasoning

**unitAI Workflows:**
- `/delegate review this code for security issues` → unitAI (parallel-review, focus: security)
  - Reason: "review" + "security" → multi-agent code review

- `/delegate implement OAuth authentication feature` → unitAI (feature-design)
  - Reason: "implement feature" + "authentication" → full development workflow

- `/delegate validate my staged changes` → unitAI (pre-commit-validate)
  - Reason: "validate" + "staged" → validation workflow

- `/delegate debug crash on startup` → unitAI (bug-hunt)
  - Reason: "debug" + "crash" → root cause investigation

### Manual Override Examples

**Force CCS:**
- `/delegate --glm add tests` → Force GLM (even if "add tests" matches auto)
- `/delegate --gemini analyze architecture` → Force Gemini

**Force unitAI:**
- `/delegate --unitai add comprehensive tests` → unitAI (Claude picks appropriate workflow)
  - Claude analyzes: "add tests" → likely feature-design or parallel-review

---

## Decision Framework

**Delegate to CCS when:**
- Simple refactoring, tests, typos, documentation
- Deterministic, well-defined scope
- No discussion/decisions needed

**Delegate to unitAI when:**
- Multi-perspective code review needed
- Complex feature development (design + implement + test)
- Security validation or quality audits
- Root cause debugging
- Large-scale refactoring

**Keep in main session when:**
- Architecture/design decisions requiring human judgment
- Security-critical code requiring discussion
- Complex debugging requiring iterative investigation
- Performance optimization (needs profiling first)
- Breaking changes/migrations requiring careful planning

---

## Notes

- **Version 6.0.0**: Unified CCS + unitAI backends with autonomous workflow selection
- **Backward Compatible**: Use `/ccs` for direct CCS delegation (legacy)
- **unitAI Details**: See [references/unitai-workflows.md](references/unitai-workflows.md) when needed
- **Token Optimized**: Reference loaded on-demand, not included in every skill invocation
