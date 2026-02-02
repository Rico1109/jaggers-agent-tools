import path from 'path';
import fs from 'fs-extra';
import kleur from 'kleur';
import { transformGeminiConfig } from './transform-gemini.js';

/**
 * Execute a sync plan based on changeset and mode
 */
export async function executeSync(repoRoot, systemRoot, changeSet, mode, actionType) {
    const categories = ['skills', 'hooks', 'config'];
    let count = 0;

    // Mapping for special file locations (repo relative path -> system relative path)
    const fileMapping = {
        'config/settings.json': { repo: 'config/settings.json', sys: 'settings.json' }
    };

    const isClaude = systemRoot.includes('.claude') || systemRoot.includes('Claude');

    for (const category of categories) {
        const itemsToProcess = [];

        if (actionType === 'sync') {
            itemsToProcess.push(...changeSet[category].missing);
            itemsToProcess.push(...changeSet[category].outdated);
        } else if (actionType === 'backport') {
            itemsToProcess.push(...changeSet[category].drifted);
        }

        for (const item of itemsToProcess) {
            // Previously skipped settings.json for non-Claude here. Removed to allow Gemini processing.

            let src, dest;

            if (category === 'config') {
                // Special handling for config files
                const mapping = fileMapping[`config/${item}`] || { repo: `config/${item}`, sys: item };

                if (actionType === 'backport') {
                    src = path.join(systemRoot, mapping.sys);
                    dest = path.join(repoRoot, mapping.repo);
                } else {
                    src = path.join(repoRoot, mapping.repo);
                    dest = path.join(systemRoot, mapping.sys);
                }
            } else {
                // Standard folders (skills/hooks)
                const repoPath = path.join(repoRoot, category);
                const systemPath = path.join(systemRoot, category);

                if (actionType === 'backport') {
                    src = path.join(systemPath, item);
                    dest = path.join(repoPath, item);
                } else {
                    src = path.join(repoPath, item);
                    dest = path.join(systemPath, item);
                }
            }

            console.log(kleur.gray(`  ${actionType === 'backport' ? '<--' : '-->'} ${category}/${item}`));

            // For config files, we usually want to Backup before Overwrite in sync mode
            if (category === 'config' && actionType === 'sync' && fs.existsSync(dest)) {
                await fs.copy(dest, `${dest}.bak`);
                console.log(kleur.gray(`      (Backup created: ${path.basename(dest)}.bak)`));
            }

            if (category === 'config' && item === 'settings.json' && !isClaude && actionType === 'sync') {
                // Transform for Gemini: generate compatible config and write it
                const configContent = await fs.readJson(src);
                const transformedConfig = transformGeminiConfig(configContent, systemRoot);
                await fs.remove(dest);
                await fs.writeJson(dest, transformedConfig, { spaces: 2 });
            } else if (mode === 'symlink' && actionType === 'sync') {
                await fs.remove(dest);
                await fs.ensureSymlink(src, dest);
            } else {
                // Copy mode
                await fs.remove(dest);
                await fs.copy(src, dest);
            }
            count++;
        }
    }

    return count;
}
