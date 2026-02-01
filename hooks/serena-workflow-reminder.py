#!/usr/bin/env python3
import json
import sys
import os

# 1. Define Skill Context to Inject
SKILL_REMINDER = """
*** MANDATORY SKILL: Using Serena LSP ***
You are REQUIRED to use semantic tools for all code interactions to ensure safety and token efficiency.

RULES:
1. READING: NEVER read full code files >300 lines.
   - START with `get_symbols_overview(depth=1)` to map the file.
   - READ specific parts with `find_symbol(include_body=True)`.
2. EDITING: NEVER use the generic `Edit` tool on code.
   - USE `replace_symbol_body` for atomic updates.
   - USE `insert_after_symbol` / `insert_before_symbol` for additions.
   - ALWAYS run `find_referencing_symbols` before changing signatures.
3. SEARCH: USE `search_for_pattern` instead of grep/find.

Ref: ~/.claude/skills/using-serena-lsp/SKILL.md
"""

CODE_EXTENSIONS = {'.py', '.ts', '.js', '.jsx', '.tsx', '.go', '.rs', '.java', '.cpp', '.c', '.h'}

def count_lines(filepath):
    try:
        with open(filepath, 'r') as f:
            return sum(1 for _ in f)
    except:
        return 0

def handle_session_start():
    """Inject skill instructions at session start"""
    print(json.dumps({
        "hookSpecificOutput": {
            "hookEventName": "SessionStart",
            "additionalContext": SKILL_REMINDER
        }
    }))
    sys.exit(0)

def handle_pre_tool_use(data):
    """Enforce workflow rules before tools execute"""
    tool_name = data.get('tool_name')
    tool_input = data.get('tool_input', {})
    
    # Rule 1: Block Reading Large Code Files
    if tool_name == 'Read':
        file_path = tool_input.get('file_path', '')
        _, ext = os.path.splitext(file_path)
        if ext in CODE_EXTENSIONS:
            loc = count_lines(file_path)
            if loc > 300:
                print(json.dumps({
                    "hookSpecificOutput": {
                        "hookEventName": "PreToolUse",
                        "permissionDecision": "deny",
                        "permissionDecisionReason": f"VIOLATION: Reading full file of {loc} lines is forbidden. Use 'get_symbols_overview' and 'find_symbol' to save tokens."
                    },
                    "systemMessage": "⚠️ Blocked inefficient file read. Use Serena semantic tools."
                }))
                sys.exit(0)

    # Rule 2: Block Generic Edits on Code
    if tool_name == 'Edit':
        file_path = tool_input.get('file_path', '')
        _, ext = os.path.splitext(file_path)
        if ext in CODE_EXTENSIONS:
             print(json.dumps({
                "hookSpecificOutput": {
                    "hookEventName": "PreToolUse",
                    "permissionDecision": "deny",
                    "permissionDecisionReason": "VIOLATION: Generic 'Edit' is unsafe for code. Use 'replace_symbol_body' or 'insert_after_symbol' for surgical edits."
                },
                "systemMessage": "⚠️ Blocked unsafe edit. Use Serena semantic tools."
            }))
             sys.exit(0)

    # Allow all other tools
    sys.exit(0)

# Main Entry Point
try:
    # Read JSON input from stdin
    input_data = json.load(sys.stdin)
    event = input_data.get('hook_event_name')

    if event == 'SessionStart':
        handle_session_start()
    elif event == 'PreToolUse':
        handle_pre_tool_use(input_data)
    else:
        sys.exit(0) # Ignore other events

except Exception as e:
    # Fail safe: log error but allow operation
    print(f"Hook Error: {e}", file=sys.stderr)
    sys.exit(0)