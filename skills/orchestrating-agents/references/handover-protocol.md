# Handover Protocol

This protocol defines how to "hand off" a task to another agent for a second opinion or specialized review.

## Headless Execution

To interact with other agents without blocking the current session, use headless commands.

### Gemini
- **Initial Query:** `gemini -p "Your prompt here"`
- **Follow-up (Handshake):** `gemini -p --resume latest "Your follow-up here"`

### Qwen
- **Initial Query:** `qwen "Your prompt here"`
- **Follow-up (Handshake):** `qwen -c "Your follow-up here"`
- **Note:** Qwen prefers positional prompts over the deprecated `-p` flag. Use `-c` to continue the most recent session.

## Handshaking Strategy

1. **Phase 1: Proposal.** Send the initial context and the specific question/task to the target agent.
2. **Phase 2: Ingestion.** Read the output of the first command.
3. **Phase 3: Refinement (Optional).** Use `--continue` or `--resume latest` to ask the agent to refine its answer or address specific concerns found in Phase 2.
