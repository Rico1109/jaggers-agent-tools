import { describe, it, expect } from 'vitest';
import { mergeSettingsHooks } from '../src/commands/install-service-skills.js';

describe('mergeSettingsHooks', () => {
    it('adds all three hooks to empty settings', () => {
        const { result, added, skipped } = mergeSettingsHooks({});
        const hooks = result.hooks as Record<string, unknown>;
        expect(added).toEqual(['SessionStart', 'PreToolUse', 'PostToolUse']);
        expect(skipped).toEqual([]);
        expect(hooks).toHaveProperty('SessionStart');
        expect(hooks).toHaveProperty('PreToolUse');
        expect(hooks).toHaveProperty('PostToolUse');
    });

    it('preserves existing keys and skips them', () => {
        const existing = { hooks: { SessionStart: [{ custom: true }] } };
        const { result, added, skipped } = mergeSettingsHooks(existing);
        const hooks = result.hooks as Record<string, unknown>;
        expect(skipped).toEqual(['SessionStart']);
        expect(added).toEqual(['PreToolUse', 'PostToolUse']);
        expect(hooks.SessionStart).toEqual([{ custom: true }]);
    });

    it('preserves non-hook keys in settings', () => {
        const existing = { apiKey: 'abc', permissions: { allow: [] } };
        const { result } = mergeSettingsHooks(existing);
        expect(result.apiKey).toBe('abc');
        expect(result.permissions).toEqual({ allow: [] });
    });
});
