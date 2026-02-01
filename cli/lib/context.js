import os from 'os';
import path from 'path';
import fs from 'fs-extra';
import Conf from 'conf';
import prompts from 'prompts';
import kleur from 'kleur';

// Initialize configuration (persists sync mode preference only)
const config = new Conf({
    projectName: 'jaggers-config-manager',
    defaults: {
        syncMode: 'copy' // 'copy' or 'symlink'
    }
});

// Define known paths including user requested ones
const CANDIDATE_PATHS = [
    { label: '.claude', path: path.join(os.homedir(), '.claude') },
    { label: '.gemini', path: path.join(os.homedir(), '.gemini') },
    { label: '.qwen', path: path.join(os.homedir(), '.qwen') },
    { label: '~/.gemini/antigravity', path: path.join(os.homedir(), '.gemini', 'antigravity') },
    // Standard XDG/Windows paths
    process.env.APPDATA ? { label: 'AppData/Claude', path: path.join(process.env.APPDATA, 'Claude') } : null
].filter(Boolean);

export async function getContext() {
    // 1. Identify Existing vs Missing Paths
    const choices = [];

    for (const c of CANDIDATE_PATHS) {
        const exists = await fs.pathExists(c.path);
        const icon = exists ? '[X]' : '[ ]';
        const desc = exists ? 'Found' : 'Not found (will create)';
        
        choices.push({
            title: `${icon} ${c.label} (${c.path})`,
            description: desc,
            value: c.path,
            selected: exists // Pre-select existing environments
        });
    }

    // 2. Prompt user with Multiselect
    const response = await prompts({
        type: 'multiselect',
        name: 'targets',
        message: 'Select target environment(s):',
        choices: choices,
        hint: '- Space to select. Return to submit',
        instructions: false
    });

    if (!response.targets || response.targets.length === 0) {
        console.log(kleur.gray('No targets selected. Exiting.'));
        process.exit(0);
    }

    // 3. Ensure directories exist for selected targets
    for (const target of response.targets) {
        await fs.ensureDir(target);
    }

    return {
        targets: response.targets, // Array of path strings
        syncMode: config.get('syncMode'),
        config
    };
}

export function resetContext() {
    config.clear();
    console.log(kleur.yellow('Configuration cleared.'));
}
