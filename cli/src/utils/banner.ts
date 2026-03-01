import kleur from 'kleur';

// Pre-baked block-font ASCII art — carries over from prototype, zero cost.
const ART_XTRM = [
    ' ██╗  ██╗ ████████╗ ██████╗  ███╗   ███╗',
    ' ╚██╗██╔╝ ╚══██╔══╝ ██╔══██╗ ████╗ ████║',
    '  ╚███╔╝     ██║    ██████╔╝ ██╔████╔██║',
    '  ██╔██╗     ██║    ██╔══██╗ ██║╚██╔╝██║',
    ' ██╔╝ ██╗    ██║    ██║  ██║ ██║ ╚═╝ ██║',
    ' ╚═╝  ╚═╝    ╚═╝    ╚═╝  ╚═╝ ╚═╝     ╚═╝',
];

const ART_TOOLS = [
    ' ████████╗  ██████╗   ██████╗  ██╗      ███████╗',
    ' ╚══██╔══╝ ██╔═══██╗ ██╔═══██╗ ██║      ██╔════╝',
    '    ██║    ██║   ██║ ██║   ██║ ██║      ███████╗',
    '    ██║    ██║   ██║ ██║   ██║ ██║      ╚════██║',
    '    ██║    ╚██████╔╝ ╚██████╔╝ ███████╗ ███████║',
    '    ╚═╝     ╚═════╝   ╚═════╝  ╚══════╝ ╚══════╝',
];

// ANSI 256-color gradient: bright cyan (51) → deep blue (21)
// Applied across all 12 art lines for a smooth top-to-bottom flow.
const GRADIENT = [51, 51, 45, 45, 39, 33, 33, 27, 27, 21, 21, 17];

function ansi256(code: number, text: string): string {
    return `\x1b[38;5;${code}m${text}\x1b[0m`;
}

function applyGradient(lines: string[], offset = 0): string {
    return lines
        .map((line, i) => ansi256(GRADIENT[(i + offset) % GRADIENT.length], line))
        .join('\n');
}

type Tier = 0 | 1 | 2 | 3;

function detectTier(): Tier {
    // Tier 0: non-interactive (CI, piped, redirected)
    if (!process.stdout.isTTY) return 0;

    const cols = process.stdout.columns ?? 0;
    const term = (process.env.TERM ?? '').toLowerCase();

    // Tier 1: dumb terminal or too narrow for any decoration
    if (term === 'dumb' || cols < 60) return 1;

    // Respect NO_COLOR convention (https://no-color.org/) — text only, no ANSI
    if (process.env.NO_COLOR !== undefined) return 1;

    const colorterm = (process.env.COLORTERM ?? '').toLowerCase();
    const has256 =
        term.includes('256color') ||
        colorterm === 'truecolor' ||
        colorterm === '24bit' ||
        term.startsWith('xterm') ||
        term.startsWith('screen');

    // Tier 2: color yes, but no 256-color or too narrow for art (< 80 cols)
    if (!has256 || cols < 80) return 2;

    // Tier 3: modern terminal, full Unicode + 256-color, wide enough
    return 3;
}

export function renderBanner(version: string): void {
    // Never interrupt help/version output
    const isHelpOrVersion = process.argv.some(a =>
        a === '--help' || a === '-h' || a === '--version' || a === '-V'
    );
    if (isHelpOrVersion) return;

    const tier = detectTier();

    if (tier === 0) {
        // Non-interactive: suppress entirely
        return;
    }

    if (tier === 1) {
        // Slim fallback — identical to the previous one-liner
        console.log(kleur.bold(`\n  jaggers-config`) + kleur.dim(` v${version}`));
        console.log(kleur.dim(`  Sync agent tools across AI environments\n`));
        return;
    }

    if (tier === 2) {
        // Styled header — no art, no box-drawing chars that might not render
        const bar = kleur.cyan('─'.repeat(50));
        console.log(`\n  ${bar}`);
        console.log(`  ${kleur.bold().cyan('jaggers-config')} ${kleur.dim(`v${version}`)}`);
        console.log(`  ${kleur.dim('Sync agent tools across AI environments')}`);
        console.log(`  ${bar}\n`);
        return;
    }

    // Tier 3: full block art with 256-color gradient
    const art =
        applyGradient(ART_XTRM, 0) +
        '\n\n' +
        applyGradient(ART_TOOLS, 6);

    const versionLine =
        `  ${kleur.dim(`v${version}`)}  ${kleur.dim('·')}  ${kleur.dim('Sync agent tools across AI environments')}`;

    console.log('\n' + art);
    console.log('\n' + versionLine + '\n');
}
