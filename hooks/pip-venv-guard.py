#!/usr/bin/env python3
import json
import sys
import os

def check_venv():
    # Check VIRTUAL_ENV env var
    if os.environ.get('VIRTUAL_ENV'):
        return True
    
    # Check for common directories
    common_names = ['.venv', 'venv', 'env', 'virtualenv', '.env']
    for name in common_names:
        if os.path.isdir(name) and os.path.exists(os.path.join(name, 'bin', 'activate')):
            return name # Found inactive venv
    return False

try:
    # Read JSON from stdin
    data = json.load(sys.stdin)
    
    # Only run for Bash tool
    if data.get('tool_name') != 'Bash':
        sys.exit(0)
        
    command = data.get('tool_input', {}).get('command', '')
    
    # Check for pip install commands
    if 'pip install' in command or 'pip3 install' in command:
        venv_status = check_venv()
        
        if venv_status is True:
            # Case 1: Active venv -> Allow
            sys.exit(0)
            
        elif venv_status:
            # Case 2: Inactive venv found -> Block and warn
            print(json.dumps({
                "hookSpecificOutput": {
                    "hookEventName": "PreToolUse",
                    "permissionDecision": "deny",
                    "permissionDecisionReason": f"Safety Guard: Attempting pip install without activating virtual environment (found at ./{venv_status})."
                },
                "systemMessage": f"⚠️  Please activate your virtual environment first:

source {venv_status}/bin/activate"
            }))
            sys.exit(0)
            
        else:
            # Case 3: No venv found -> Warn but allow (legacy behavior)
            print(json.dumps({
                "systemMessage": "⚠️  WARNING: Running pip install without a detected virtual environment. Consider creating one: 'python -m venv .venv'"
            }))
            sys.exit(0)

except Exception:
    # Fail open
    sys.exit(0)
