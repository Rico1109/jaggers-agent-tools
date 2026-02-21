# AWS CLI Agent Orchestrator (CAO) Integration Analysis

**Created:** 2026-02-20
**Status:** Analysis Complete

---

## Executive Summary

After evaluating AWS's [cli-agent-orchestrator](https://github.com/awslabs/cli-agent-orchestrator), this analysis compares CAO's architecture with our current Jaggers orchestration system and provides recommendations for integration or improvement.

### Key Finding

**CAO and Jaggers solve different problems with different philosophies.** CAO is a **tmux-based session manager** with HTTP API control, while Jaggers is a **file-based handover protocol** with direct CLI invocation. They can complement each other, but serve different use cases.

---

## Architecture Comparison

| Aspect | Jaggers (Current) | AWS CAO |
|--------|-------------------|---------|
| **Session Management** | UUID pinning via CLI flags (`--session-id`, `-r <uuid>`) | tmux sessions with `CAO_TERMINAL_ID` env var |
| **Communication** | File-based handover (`.jaggers/handover/*.md`) | HTTP API + inbox messaging (SQLite-backed) |
| **State Storage** | JSON file (`.jaggers/sessions.json`) | SQLite database |
| **Agent Isolation** | Separate terminal windows | tmux panes/windows |
| **Control Plane** | Node.js script (`orchestrate.mjs`) | FastAPI HTTP server (port 9889) |
| **Provider Support** | Gemini, Qwen (direct CLI) | Amazon Q CLI, Kiro CLI, Claude Code, Codex CLI |
| **Status Detection** | Manual (diff `--list-sessions`) | Automatic (IDLE/BUSY/COMPLETED/ERROR) |
| **Parallelism** | Sequential only | Handoff (sync), Assign (async), Send Message |

---

## Detailed Feature Analysis

### 1. Session Management

**Jaggers Approach:**
```js
// Gemini: diff --list-sessions before/after
const before = listGeminiSessions()
run('gemini', ['-p', prompt])
const after = listGeminiSessions()
const uuid = findNewUUID(before, after)

// Qwen: pre-generate UUID
const qwenId = randomUUID()
run('qwen', ['-p', '--session-id', qwenId, prompt])
```

**CAO Approach:**
```python
# Automatic terminal ID assignment
terminal = terminal_service.create_terminal(
    provider="q_cli",
    agent_profile="developer"
)
# terminal.id = "a1b2c3d4" (auto-generated)
# CAO_TERMINAL_ID env var set in tmux session
```

**Verdict:** CAO's approach is more robust for session tracking, but Jaggers' direct UUID control enables deterministic session resumption across restarts.

### 2. Inter-Agent Communication

**Jaggers Approach:**
```
.jaggers/handover/
  turn_1_abc123.md  ← Gemini proposal
  turn_2_def456.md  ← Qwen critique
  turn_3_ghi789.md  ← Gemini synthesis
```

**CAO Approach:**
```bash
# HTTP API messaging
POST /terminals/{receiver_id}/inbox/messages
{
  "sender_id": "a1b2c3d4",
  "message": "Review this code..."
}

# Messages queued in SQLite, delivered when receiver is IDLE
```

**Verdict:** 
- **Jaggers** file-based approach is human-readable, version-controllable, and works offline
- **CAO** API-based approach enables real-time messaging and status tracking

### 3. Orchestration Patterns

**Jaggers Workflows:**
| Workflow | Turns | Pattern |
|----------|-------|---------|
| collaborative | 3 | Propose → Critique → Refine |
| adversarial | 3 | Propose → Attack → Defend |
| troubleshoot | 4 | Hypothesis → Verify → Root Cause |
| handshake | 1 | Quick second opinion |

**CAO Orchestration Modes:**
| Mode | Behavior |
|------|----------|
| Handoff | Sync: Create agent → Send task → Wait → Return result |
| Assign | Async: Create agent → Send task → Return immediately |
| Send Message | Direct communication with existing agent |

**Verdict:** CAO's **Assign** mode enables true parallelism that Jaggers lacks. Jaggers' predefined workflows are more structured for specific use cases.

### 4. Status Detection

**Jaggers:** Manual detection via CLI output parsing
```js
// No built-in status detection
// Must parse CLI output to determine completion
```

**CAO:** Automatic status tracking
```python
class TerminalStatus(str, Enum):
    IDLE = "idle"
    PROCESSING = "processing"
    COMPLETED = "completed"
    WAITING_USER_ANSWER = "waiting_user_answer"
    ERROR = "error"
```

**Verdict:** CAO's status detection is superior for automation. This is a significant gap in Jaggers.

---

## Integration Possibilities

### Option A: Adopt CAO Entirely

**Pros:**
- Mature, maintained by AWS
- Built-in status detection
- HTTP API for programmatic control
- Multiple provider support
- Scheduled flows (cron-like)

**Cons:**
- Requires tmux (additional dependency)
- Python-based (our stack is Node.js)
- Less control over session IDs
- No file-based handover (loses human readability)
- Tied to AWS ecosystem (Amazon Q CLI default)

**Recommendation:** ❌ Not recommended as full replacement. Too much architectural divergence.

### Option B: Hybrid Approach — CAO for Parallelism, Jaggers for Workflows

**Architecture:**
```
┌─────────────────────────────────────────────────────────────┐
│                    Jaggers Orchestrator                      │
│                  (orchestrate.mjs / CLI)                     │
└──────────────────────────┬──────────────────────────────────┘
                           │
           ┌───────────────┴───────────────┐
           │                               │
           ▼                               ▼
┌─────────────────────┐       ┌─────────────────────────────┐
│   Direct CLI Calls  │       │    CAO HTTP API (optional)   │
│   (Sequential)      │       │    (Parallel tasks)          │
│                     │       │                              │
│ • gemini -p/-r      │       │ • POST /sessions             │
│ • qwen --session-id │       │ • POST /terminals/{id}/input │
│                     │       │ • Assign mode for async      │
└─────────────────────┘       └─────────────────────────────┘
           │                               │
           └───────────────┬───────────────┘
                           │
                           ▼
              ┌─────────────────────────┐
              │   .jaggers/handover/    │
              │   (File-based artifacts)│
              └─────────────────────────┘
```

**Implementation:**
1. Keep Jaggers file-based handover for human readability
2. Add CAO client for parallel task execution
3. Use CAO's Assign mode for independent subtasks
4. Fall back to direct CLI for sequential workflows

**Recommendation:** ✅ Recommended for evaluation. Best of both worlds.

### Option C: Improve Jaggers with CAO-Inspired Features

**Features to Adopt:**

1. **Status Detection** — Parse CLI output for status patterns:
   ```js
   const STATUS_PATTERNS = {
     idle: /Waiting for input|Ready/,
     processing: /Thinking|Processing/,
     completed: /Task completed|Done/,
     error: /Error|Failed/
   };
   ```

2. **HTTP API Layer** — Add Fastify/Express server:
   ```js
   // cli/lib/orchestrate-server.js
   fastify.post('/terminals/:id/input', async (req) => {
     return orchestrate.sendInput(req.params.id, req.body.message);
   });
   ```

3. **Async Assign Mode** — Background task spawning:
   ```js
   // Spawn agent in background, return immediately
   const taskId = await orchestrate.assign('qwen', prompt);
   // Later: check status
   const result = await orchestrate.getStatus(taskId);
   ```

4. **SQLite State** — Replace JSON with SQLite for robustness:
   ```js
   // Better concurrency handling than JSON file
   const db = new Database('.jaggers/state.db');
   ```

**Recommendation:** ✅ Recommended. Incremental improvements without architectural overhaul.

---

## Recommended Action Plan

### Phase 1: Quick Wins (1-2 days)

1. **Add status detection** to `orchestrate.mjs`:
   - Parse CLI output for status patterns
   - Update `.jaggers/sessions.json` with status field

2. **Improve error handling**:
   - Timeout detection for hung sessions
   - Automatic retry with exponential backoff

### Phase 2: Enhanced Orchestration (1 week)

1. **Implement Assign mode** in Jaggers:
   ```js
   // Background execution with callback
   async function assign(agent, prompt, callbackTerminal) {
     const id = await spawnAgent(agent, prompt);
     // When complete, send result to callbackTerminal
   }
   ```

2. **Add HTTP API layer** (optional):
   - Enable remote orchestration
   - Support MCP server integration

### Phase 3: Evaluate CAO Integration (2 weeks)

1. **Install CAO locally** and test with Amazon Q CLI
2. **Build adapter** that translates Jaggers workflows to CAO API calls
3. **Benchmark** parallel vs sequential execution for common tasks

---

## Compatibility Matrix

| Feature | Jaggers | CAO | Integration Effort |
|---------|---------|-----|-------------------|
| Gemini CLI | ✅ Direct | ❌ Not supported | N/A |
| Qwen CLI | ✅ Direct | ❌ Not supported | N/A |
| Claude Code | ⚠️ Via CCS | ✅ Native | Low |
| Amazon Q CLI | ❌ | ✅ Native | N/A |
| Session Persistence | ✅ UUID pinning | ✅ tmux sessions | Medium |
| Parallel Execution | ❌ | ✅ Assign mode | High |
| File-based Handover | ✅ | ❌ | N/A |
| Status Detection | ❌ | ✅ | Medium to add |
| HTTP API | ❌ | ✅ | Medium to add |
| Scheduled Flows | ❌ | ✅ | Low (use CAO) |

---

## Conclusion

**Primary Recommendation:** Improve Jaggers with CAO-inspired features (Option C) rather than full CAO adoption.

**Rationale:**
1. **Provider mismatch:** CAO is optimized for Amazon Q CLI / Claude Code, while Jaggers uses Gemini/Qwen directly
2. **Philosophy alignment:** Jaggers' file-based handover fits our "human-readable artifacts" principle
3. **Incremental improvement:** Adding status detection and parallel execution is achievable without architectural changes
4. **No new dependencies:** Avoids tmux requirement and Python stack

**Secondary Recommendation:** Monitor CAO development for:
- Gemini/Qwen provider support
- File-based handover features
- Standalone status detection library

---

## References

- **AWS CAO Repository:** https://github.com/awslabs/cli-agent-orchestrator
- **CAO API Documentation:** https://raw.githubusercontent.com/awslabs/cli-agent-orchestrator/main/docs/api.md
- **Jaggers Orchestration Plan:** [orchestration-implementation.md](orchestration-implementation.md)
- **Jaggers Workflows:** [../skills/orchestrating-agents/references/workflows.md](../skills/orchestrating-agents/references/workflows.md)
