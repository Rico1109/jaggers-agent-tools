import path from 'path';
import fs from 'fs-extra';
import { parse, assign, stringify } from 'comment-json';
import kleur from 'kleur';

/**
 * Safely inject hook configuration into settings.json
 */
export async function injectHookConfig(targetDir, repoRoot) {
    const settingsPath = path.join(targetDir, 'settings.json');
    
    if (!fs.existsSync(settingsPath)) {
        console.log(kleur.yellow(`  [!] settings.json not found in ${targetDir}. Skipping auto-config.`));
        return false;
    }

    try {
        const rawContent = await fs.readFile(settingsPath, 'utf8');
        const settings = parse(rawContent);

        if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
            console.log(kleur.yellow(`  [!] settings.json is not a valid object. Skipping auto-config.`));
            return false;
        }

        // Define our required hooks
        const requiredHooks = [
            {
                name: "skill-suggestion",
                path: path.join(targetDir, 'hooks', 'skill-suggestion.sh'),
                events: ["userPromptSubmit"]
            },
            {
                name: "serena-workflow-reminder",
                path: path.join(targetDir, 'hooks', 'serena-workflow-reminder.sh'),
                events: ["toolUse"]
            }
        ];

        let modified = false;

        if (!Array.isArray(settings.hooks)) {
            settings.hooks = [];
            modified = true;
        }

        for (const req of requiredHooks) {
            const exists = settings.hooks.find(h => h.name === req.name || h.path === req.path);
            
            if (!exists) {
                console.log(kleur.blue(`  [+] Adding hook: ${req.name}`));
                settings.hooks.push(req);
                modified = true;
            } else {
                // Optional: Update path if it changed
                if (exists.path !== req.path) {
                    console.log(kleur.blue(`  [^] Updating hook path: ${req.name}`));
                    exists.path = req.path;
                    modified = true;
                }
            }
        }

        if (modified) {
            // Backup
            const backupPath = `${settingsPath}.bak`;
            await fs.copy(settingsPath, backupPath);
            console.log(kleur.gray(`  [i] Backup created at settings.json.bak`));

            // Write back with comments preserved
            await fs.writeFile(settingsPath, stringify(settings, null, 2));
            return true;
        }

        return false;
    } catch (err) {
        console.error(kleur.red(`  [!] Error parsing settings.json: ${err.message}`));
        return false;
    }
}
