# Claude Code Guide for Jaggers Agent Tools

## Architecture
- **Skills**: stored in `skills/`. Each skill has `SKILL.md` and optional `README.md`.
- **Hooks**: stored in `hooks/`. Python scripts (`.py`) for lifecycle events.
- **Config**: stored in `config/`. `settings.json` template.
- **CLI**: stored in `cli/`. Node.js tool for installation and sync.
- **Documentation**: stored in `docs/` and `.serena/memories/` (SSOT).

## Development Environment
- **Runtime**: Node.js (CLI), Python 3.8+ (Hooks/Scripts)
- **Dependencies**:
  - CLI: `npm install` in `cli/`
  - Python: Standard library only (no external deps for hooks)

## Key Files & Directories
- `cli/lib/sync.js`: Logic for syncing/backporting configurations.
- `cli/lib/transform-gemini.js`: Logic for transforming Claude config to Gemini.
- `skills/delegating/config.yaml`: Configuration for delegation skill.
- `hooks/*.py`: Hook implementation scripts.

## Common Commands

### CLI Development
- `cd cli && npm install` - Install dependencies
- `npx ./cli` - Run config manager (from root)
- `node cli/index.js --reset` - Reset CLI context/config

### Hook Testing
- `python3 hooks/skill-suggestion.py` - Test hook logic manually
- `cat test-input.json | python3 hooks/skill-suggestion.py` - Test with input

### Documentation
- `python3 skills/documenting/scripts/orchestrator.py` - Document changes
- `python3 skills/documenting/scripts/generate_template.py` - Create memory

## Gemini Support
- The CLI automatically detects `~/.gemini` environments.
- `settings.json` is dynamically transformed for Gemini compatibility:
  - Event names mapped (UserPromptSubmit -> BeforeAgent)
  - Paths rewritten to target directory
  - Unsupported fields filtered out
