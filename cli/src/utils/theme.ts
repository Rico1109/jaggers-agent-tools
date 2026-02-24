import kleur from 'kleur';

/** Semantic color tokens — use these instead of calling kleur directly */
export const t = {
    success:   (s: string) => kleur.green(s),
    error:     (s: string) => kleur.red(s),
    warning:   (s: string) => kleur.yellow(s),
    info:      (s: string) => kleur.blue(s),
    muted:     (s: string) => kleur.gray(s),
    accent:    (s: string) => kleur.cyan(s),
    bold:      (s: string) => kleur.bold(s),
    dim:       (s: string) => kleur.dim(s),
    boldGreen: (s: string) => kleur.bold().green(s),
    boldRed:   (s: string) => kleur.bold().red(s),
};

/** Status symbols with colour baked in */
export const sym = {
    ok:       kleur.green('✓'),
    fail:     kleur.red('✗'),
    warn:     kleur.yellow('⚠'),
    missing:  kleur.green('+'),
    outdated: kleur.yellow('↑'),
    drifted:  kleur.red('!'),
    arrow:    kleur.gray('→'),
    bullet:   kleur.gray('•'),
};
