---
name: delegating
description: >-
  Delegate tasks to cost-optimized models (CCS) or multi-agent workflows (unitAI).
  Use when the user asks to "delegate" a task, or for simple deterministic tasks (typos, tests),
  complex code reviews, or large-scale refactoring that can be offloaded.
version: 6.0.0
---

# Delegating Tasks

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

**Configuration-Driven:** All pattern matching is defined in [config.yaml](config.yaml), not hardcoded.

### Configuration Structure

The skill reads `config.yaml` to determine:
1. **Available backends** (CCS profiles + unitAI workflows)
2. **Pattern mappings** (task keywords → backend selection)
3. **Priority order** (unitAI workflows checked before CCS)
4. **Default fallback** (when no pattern matches)

### Selection Algorithm

```javascript
function selectBackend(task, config) {
  const taskLower = task.toLowerCase();

  // 1. Check override flags first (--glm, --unitai, etc.)
  const override = parseOverrideFlag(task, config.override_flags);
  if (override) return override;

  // 2. Check patterns in priority order
  for (const backendType of config.priority) {
    const backends = config[backendType];

    for (const [name, settings] of Object.entries(backends)) {
      // Test each pattern for this backend
      for (const pattern of settings.patterns) {
        if (new RegExp(pattern, 'i').test(taskLower)) {
          return {
            backend: backendType === 'ccs_profiles' ? 'ccs' : 'unitai',
            profile: backendType === 'ccs_profiles' ? name : undefined,
            workflow: backendType === 'unitai_workflows' ? name : undefined,
            params: settings.params,
            reason: `Matched pattern: ${pattern}`
          };
        }
      }
    }
  }

  // 3. No pattern matched, use default
  return config.default;
}
```

### Auto-Focus Detection

For workflows with `focus: auto` parameter, the skill detects focus from keywords:

```javascript
function detectFocus(task, config) {
  const taskLower = task.toLowerCase();

  for (const [focusType, settings] of Object.entries(config.auto_focus)) {
    if (settings.keywords.some(kw => taskLower.includes(kw))) {
      return focusType; // "security", "performance", "quality"
    }
  }

  return 'quality'; // default
}
```

### Override Flags

Users can force specific backends via command-line flags:

```bash
/delegation --glm add tests        # Force CCS GLM
/delegation --gemini analyze code  # Force CCS Gemini
/delegation --unitai review code   # Force unitAI (auto-select workflow)
/delegation --review check auth    # Force unitAI parallel-review workflow
```

Flags are defined in `config.yaml` under `override_flags`.

---

## Configuration

### Config File Location

**`skills/delegation/config.yaml`** - Source of truth for all delegation behavior.

### Customizing Patterns

Edit `config.yaml` to add/modify pattern mappings:

```yaml
ccs_profiles:
  glm:
    patterns:
      - "typo|spelling"
      - "test|unit.*test"
      - "your-custom-pattern"  # Add your pattern
```

### Adding Custom Workflows

Add new unitAI workflows to config:

```yaml
unitai_workflows:
  your-workflow:
    patterns:
      - "your.*pattern"
    cost: medium
    params:
      autonomyLevel: low
    description: "Your workflow description"
```

### Fallback Behavior

If `config.yaml` is missing or corrupted, the skill uses minimal hardcoded defaults:
- CCS GLM for simple tasks
- unitAI parallel-review for complex tasks

**Recommendation:** Always keep `config.yaml` in sync with skill updates.

---

## unitAI Workflow Selection (Autonomous)

When `backend: 'unitai'` is selected (either via auto-selection or user choice), **Claude autonomously** chooses the appropriate workflow.

### Selection Process

1. **Load config** - Read workflow definitions from `config.yaml`
2. **Match patterns** - Already done by auto-selection (selected workflow from config)
3. **Resolve auto params** - If params contain `auto`, detect from keywords:
   - `focus: auto` → Detect security/performance/quality
   - `architecturalFocus: auto` → Detect from context
4. **Load unitAI tools** - `ToolSearch("unitAI")` to access MCP
5. **Execute workflow** - `mcp__unitAI__workflow_{name}({ params })`

### Auto-Parameter Resolution

When workflow params contain `auto` values, resolve from task keywords:

**Example: parallel-review with `focus: auto`**
```javascript
// Task: "review this code for security issues"
// Config: { focus: auto }

const keywords = extractKeywords(task);
if (keywords.includes('security')) {
  params.focus = 'security';
} else if (keywords.includes('performance')) {
  params.focus = 'performance';
} else {
  params.focus = 'quality'; // default
}
```

See `config.yaml` → `auto_focus` section for keyword mappings.

### Workflow Execution

```javascript
// 1. Workflow already selected from config pattern matching
const { workflow, params } = selectedBackend;

// 2. Resolve auto parameters
const resolvedParams = resolveAutoParams(params, task, config);

// 3. Execute via MCP
const result = await mcp__unitAI__workflow_{workflow}(resolvedParams);

// 4. Report results
return formatResults(result, workflow, resolvedParams);
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

### Version 6.0.0 - Configuration-Driven Delegation
- **Unified backends**: CCS (cost-optimized) + unitAI (multi-agent workflows)
- **Configuration-driven**: All behavior defined in `config.yaml`
- **Autonomous workflow selection**: Claude picks optimal workflow based on config patterns
- **User-customizable**: Edit config.yaml to add patterns or workflows

### Migration from /ccs-delegation
- **Old skill** (`/ccs-delegation`): Deprecated, hardcoded logic
- **New skill** (`/delegation`): Replaces /ccs-delegation completely
- **Config**: Standalone `config.yaml` in skill directory (not dependent on ~/.ccs/config.yaml)

### References
- **Workflow Details**: [references/unitai-workflows.md](references/unitai-workflows.md) - consulted when needed
- **Config Schema**: See `config.yaml` for full structure and examples
- **Token Optimized**: References loaded on-demand only

### Customization Guide
1. Edit `skills/delegation/config.yaml`
2. Add/modify patterns under `ccs_profiles` or `unitai_workflows`
3. Adjust `priority` order if needed
4. Test with `/delegation [task]`
