
/**
 * Transform Claude settings.json to Gemini-compatible format
 * @param {Object} claudeConfig - The source configuration from the repo
 * @param {String} targetDir - The target directory (e.g., /home/user/.gemini)
 * @returns {Object} - The transformed Gemini configuration
 */
export function transformGeminiConfig(claudeConfig, targetDir) {
    const geminiConfig = {
        hooks: {}
    };

    // 1. Transform Hooks
    if (claudeConfig.hooks) {
        for (const [event, hooks] of Object.entries(claudeConfig.hooks)) {
            const geminiEvent = mapEventName(event);
            if (!geminiEvent) continue; // Skip unsupported events

            // Gemini expects an array of Hook Definitions
            geminiConfig.hooks[geminiEvent] = hooks.map(def => transformHookDefinition(def, targetDir));
        }
    }

    // 2. Transfer other compatible fields (if any)
    // Currently, permissions, plugins, statusLine seem incompatible or different
    // We explicitly skip them as per analysis.

    return geminiConfig;
}

/**
 * Map Claude event names to Gemini event names
 */
function mapEventName(claudeEvent) {
    const map = {
        'UserPromptSubmit': 'BeforeAgent',
        'PreToolUse': 'BeforeTool',
        'SessionStart': 'SessionStart',
        // Add more mappings as needed
    };
    return map[claudeEvent] || null; // Return null if not supported
}

/**
 * Transform a single Hook Definition
 */
function transformHookDefinition(claudeDef, targetDir) {
    const geminiDef = {
        hooks: []
    };

    if (claudeDef.matcher) {
        geminiDef.matcher = claudeDef.matcher;
    }

    // Transform individual hooks within the definition
    geminiDef.hooks = claudeDef.hooks.map((h, index) => {
        const cmd = h.command;

        // Dynamically re-target paths
        // Replace .claude paths with the target directory path
        // We use a regex to find absolute paths ending in .claude
        let newCommand = cmd;
        if (targetDir) {
             // More robust replacement: Look for any path segment ending in .claude
             // This handles /home/user/.claude, /Users/foo/.claude, etc.
             const claudePathRegex = /(\/[^\s"']+\.claude)/g;
             newCommand = newCommand.replace(claudePathRegex, (match) => {
                 // Replace the matched .claude path with targetDir
                 return targetDir;
             });
        }

        return {
            name: h.name || `generated-hook-${index}`, // Ensure unique names
            type: "command",
            command: newCommand,
            timeout: h.timeout || 60000
        };
    });

    return geminiDef;
}
