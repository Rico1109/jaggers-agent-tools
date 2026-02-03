---
name: orchestrating-agents
description: Orchestrates task handoff and "handshaking" between Gemini and Qwen CLI agents. Facilitates specialized reviews, second opinions, and cross-validation of complex logic. Use when a task requires multi-model collaboration, a second LLM perspective, or iterative feedback between terminal agents.
---

# Orchestrating Agents

This skill provides a structured workflow for delegating sub-tasks to neighboring agents (Gemini or Qwen) and iteratively refining their feedback.

## Handshake Workflow

Copy this checklist and track your progress:

```
Handshake Progress:
- [ ] Step 1: Detect available agents (run detect_neighbors.py)
- [ ] Step 2: Prepare context and initial query
- [ ] Step 3: Execute Phase 1 (Initial Proposal)
- [ ] Step 4: Execute Phase 2 (Handshake/Refinement)
- [ ] Step 5: Ingest feedback (via AgentContext)
```

## Protocol Reference

| Agent | Initial Command | Follow-up (Handshake) |
| :--- | :--- | :--- |
| **Gemini** | `gemini -p "..."` | `gemini --resume latest -p "..."` |
| **Qwen** | `qwen "..."` | `qwen -c "..."` |

## Resources

- **Examples**: See [references/examples.md](references/examples.md) for concrete input/output patterns.
- **Handover Details**: See [references/handover-protocol.md](references/handover-protocol.md) for command flags and execution strategies.
- **Integration Guide**: See [references/agent-context-integration.md](references/agent-context-integration.md) for using `hooks/agent_context.py`.

## Best Practices
- **Concise Context**: Send only relevant snippets, not entire files, to the neighboring agent.
- **Specific Tasks**: Ask for a "Security Audit" or "Refactoring Suggestions" rather than a general review.
- **Fail-Safe**: If a neighboring agent is not found, proceed with a self-review but notify the user.