#!/usr/bin/env node

import kleur from 'kleur';
import minimist from 'minimist';
import path from 'path';
import { fileURLToPath } from 'url';
import prompts from 'prompts';
import { getContext, resetContext } from './lib/context.js';
import { calculateDiff } from './lib/diff.js';
import { executeSync } from './lib/sync.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

const args = minimist(process.argv.slice(2));

function printDetails(title, items, colorFn) {
    if (items.length > 0) {
        console.log(colorFn(`\n  ${title}:`));
        items.forEach(item => console.log(colorFn(`    - ${item}`)));
    }
}

async function processTarget(targetDir, syncMode) {
    console.log(kleur.cyan().bold(`\nTarget: ${targetDir}`));
    
    // 1. Scan/Diff
    console.log(kleur.gray('Scanning differences...'));
    const changeSet = await calculateDiff(repoRoot, targetDir);

    const totalMissing = changeSet.skills.missing.length + changeSet.hooks.missing.length + changeSet.config.missing.length;
    const totalOutdated = changeSet.skills.outdated.length + changeSet.hooks.outdated.length + changeSet.config.outdated.length;
    const totalDrifted = changeSet.skills.drifted.length + changeSet.hooks.drifted.length + changeSet.config.drifted.length;

    // 2. Display Detailed Breakdown
    if (totalMissing === 0 && totalOutdated === 0 && totalDrifted === 0) {
        console.log(kleur.green('System is up to date.'));
    } else {
        console.log(kleur.bold('Analysis Results:'));
        
        // Missing (Green)
        printDetails('[+] Missing in System (Will be Installed)', 
            [
                ...changeSet.skills.missing.map(s => `skills/${s}`), 
                ...changeSet.hooks.missing.map(h => `hooks/${h}`),
                ...changeSet.config.missing.map(c => `config/${c}`)
            ], 
            kleur.green
        );

        // Outdated (Blue)
        printDetails('[^] Outdated in System (Will be Updated)', 
            [
                ...changeSet.skills.outdated.map(s => `skills/${s}`), 
                ...changeSet.hooks.outdated.map(h => `hooks/${h}`),
                ...changeSet.config.outdated.map(c => `config/${c}`)
            ], 
            kleur.blue
        );

        // Drifted (Magenta)
        printDetails('[<] Drifted / Locally Modified (Needs Backport or Manual Merge)', 
            [
                ...changeSet.skills.drifted.map(s => `skills/${s}`), 
                ...changeSet.hooks.drifted.map(h => `hooks/${h}`),
                ...changeSet.config.drifted.map(c => `config/${c}`)
            ], 
            kleur.magenta
        );
        console.log(''); // spacer
    }

    // 3. Prompt for Action (Per Target)
    const actions = [];
    if (totalMissing > 0 || totalOutdated > 0) {
        actions.push({ title: 'Sync Repo -> System (Update/Install)', value: 'sync' });
    }
    if (totalDrifted > 0) {
        actions.push({ title: 'Backport System -> Repo (Save local changes)', value: 'backport' });
    }
    
    actions.push({ title: 'Skip this target', value: 'skip' });

    const response = await prompts({
        type: 'select',
        name: 'action',
        message: 'What would you like to do?',
        choices: actions
    });

    if (!response.action || response.action === 'skip') {
        console.log(kleur.gray('Skipping.'));
        return;
    }

    // Execute Sync/Backport
    console.log(kleur.gray('\nExecuting changes...'));
    const count = await executeSync(repoRoot, targetDir, changeSet, syncMode, response.action);
    
    console.log(kleur.green().bold(`\nSuccessfully processed ${count} items.`));
}

async function main() {
    console.log(kleur.cyan().bold('\nJaggers Agent Tools - Config Manager'));

    if (args.reset) {
        resetContext();
    }

    try {
        // Get dynamic targets
        const context = await getContext();
        
        console.log(kleur.dim(`\nMode: ${context.syncMode}`));
        console.log(kleur.dim(`Selected Targets: ${context.targets.length}`));

        // Iterate over all selected targets
        for (const target of context.targets) {
            await processTarget(target, context.syncMode);
        }

        console.log(kleur.gray('\nAll operations complete. Goodbye!'));

    } catch (err) {
        if (err.message === 'SIGINT') {
            console.log(kleur.yellow('\nExited.'));
        } else {
            console.error(kleur.red(`\nError: ${err.message}`));
        }
        process.exit(1);
    }
}

main();
