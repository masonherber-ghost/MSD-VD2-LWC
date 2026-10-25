// Writes _docs/handover-styling-register.md: every live declaration in the project's CSS that styles a
// shipped lightning-* component, classified by how supported its lever is in a production org.
// Reads the site bundle's SOURCES (src/assets/css/site/**, in bundle order — scripts/build-css.mjs)
// and every wrapper's own stylesheet (src/modules/**/*.css), never the generated site.css.
// Decision (user, 2026-10-20): component hooks, re-pointed globals and deprecated --sds-c-*
// hooks are prototype-only levers, listed here for the developer at handover.
//
//   node .claude/skills/component-from-design/styling-register.mjs [--lint <slds-linter output>]
//
// --lint marks the --slds-c-* lines the SLDS Linter does not recognise as SLDS 2 hooks. Lint a copy
// of src/assets/css/site/ (paths and line numbers must match) — see SKILL.md § 4a.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { sources } from '../../../scripts/build-css.mjs';

const ROOT = new URL('../../../', import.meta.url).pathname;
const OUT = '_docs/handover-styling-register.md';
const moduleCss = (dir) =>
    readdirSync(ROOT + dir, { recursive: true })
        .filter((f) => f.endsWith('.css'))
        .sort()
        .map((f) => `${dir}/${f}`);
const FILES = [...sources().map((f) => `src/assets/css/site/${f}`), ...moduleCss('src/modules')];

// Linter: "file:line" → rule names. Matched on the path's tail, wherever the copy was linted.
const flagged = new Map();
const li = process.argv.indexOf('--lint');
if (li > 0) {
    for (const l of readFileSync(process.argv[li + 1], 'utf8').replace(/\x1b\][^\x07]*\x07/g, (o) => o.replace(/^\x1b\]8;;(vscode:\/\/file\/)?/, '').replace(/\x07$/, ' ')).replace(/\x1b\[[0-9;]*m/g, '').split('\n')) {
        const m = l.match(/([\w./-]+\.css):(\d+):\d+.*?(slds\/(?:no-slds-namespace-for-custom-hooks|no-unsupported-hooks-slds2))\s*$/);
        if (!m) continue;
        // The linter prints the absolute path of the copy it linted: match on the
        // tail it shares with ours (site/… or modules/…).
        const file = FILES.find((f) => m[1].endsWith(f.replace(/^src\/(assets\/css\/)?/, '')));
        if (!file) continue;
        const key = `${file}:${m[2]}`;
        (flagged.get(key) ?? flagged.set(key, new Set()).get(key)).add(m[3].replace('slds/', ''));
    }
}

const LEVELS = [
    ['private', 'Private hook (`--slds-s-*`, `--_slds-*`)', 'Never supported. Remove or rebuild'],
    ['part', '`::part()`', 'Documented part, but styles the internals directly. Tier 3, signed off'],
    ['deprecated', 'Legacy `--sds-c-*` hook', "Not supported. `--sds-` was the beta namespace, renamed `--slds-` at GA (Spring '22). The names used here are the component's internal variables, never published. May stop working in any release"],
    ['unpublished', 'Component hook the SLDS 2 linter does not recognise', 'Read by this build of the component; not published for SLDS 2'],
    ['component', 'Component hook (`--slds-c-*`)', 'SLDS 2 developer preview — not for production'],
    ['global', 'Global hook re-pointed on one component', 'Salesforce reserves global assignment for theming tools'],
    ['host', 'Property on the host', 'Supported: plain CSS on the host element. It reaches inside the component only where the property inherits'],
];
const rows = [];
for (const file of FILES) {
    // Blank out comments, keeping newlines, so offsets still map to lines.
    const live = readFileSync(ROOT + file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, ' '));
    const lineAt = (i) => live.slice(0, i).split('\n').length;
    const ruleRe = /([^{}]+)\{([^{}]*)\}/g;
    let m;
    while ((m = ruleRe.exec(live))) {
        const selector = m[1].trim().replace(/\s+/g, ' ');
        if (!/lightning-[a-z-]+/.test(selector) || selector.startsWith('@')) continue;
        const bodyStart = m.index + m[0].indexOf('{') + 1;
        const declRe = /([-\w]+)\s*:\s*([^;]+);?/g;
        let d;
        while ((d = declRe.exec(m[2]))) {
            const [prop, value] = [d[1], d[2].trim().replace(/\s+/g, ' ')];
            const line = lineAt(bodyStart + d.index);
            const lint = flagged.get(`${file}:${line}`);
            let level;
            if (/^--(slds-s|_slds)-/.test(prop) || /var\(--(slds-s|_slds)-/.test(value)) level = 'private';
            else if (selector.includes('::part')) level = 'part';
            else if (prop.startsWith('--sds-')) level = 'deprecated';
            else if (prop.startsWith('--slds-c-')) level = lint ? 'unpublished' : 'component';
            else if (prop.startsWith('--slds-g-')) level = 'global';
            else if (prop.startsWith('--')) continue; // our own --sep-* tokens
            else level = 'host';
            rows.push({ file: file.replace(/^src\/(assets\/css\/site\/|modules\/)/, ''), line, selector, prop, value, level, lint: lint ? [...lint].join(', ') : '' });
        }
    }
}

const comp = (s) => [...new Set(s.match(/lightning-[a-z-]+/g))].join(', ');
const count = (lv) => rows.filter((r) => r.level === lv).length;
let md = `# Handover: styling register

**Generated** by \`.claude/skills/component-from-design/styling-register.mjs\` from the site bundle's sources (\`src/assets/css/site/\`) and the wrappers' own stylesheets (\`src/modules/\`), ${new Date().toISOString().slice(0, 10)}. Do not edit by hand; re-run it after any skin change.

**Readers: the Salesforce developer taking these components into an org.** This prototype matches the MSD design with levers that work here but are **not all supported in production**. By decision (2026-10-20), component hooks, re-pointed globals and deprecated hooks are **prototype-only**: each one is listed below so you can decide, per line, to keep it, replace it, or accept the component's default.

Salesforce's position (SLDS 2 Best Practices, and the SLDS Linter):

- Component-level \`--slds-c-*\` hooks in SLDS 2 are a **developer preview**: "Don't implement functionality in production with these."
- "Don't assign direct values to global styling hooks, as value assignment is reserved for theming tools."
- The \`--sds-*\` namespace was the beta name for styling hooks, replaced by \`--slds-*\` at GA (Spring '22); the linter's \`enforce-sds-to-slds-hooks\` rule converts it.
- The newest global hooks are **not supported on Experience Cloud sites**.

Every line was measured working in this prototype (headless Chrome, \`lightning-base-components\` 1.28.19-alpha, SLDS 2 Cosmos). None has been tested in an org.

## Summary

| Lever | Status | Lines |
|---|---|---:|
${LEVELS.map(([k, label, note]) => `| ${label} | ${note} | ${count(k)} |`).join('\n')}
| **Total** | | **${rows.length}** |
${li > 0 ? '' : '\n*Run with `--lint` to separate the component hooks the SLDS 2 linter does not recognise.*\n'}
`;
for (const [k, label, note] of LEVELS) {
    const rs = rows.filter((r) => r.level === k);
    if (!rs.length) continue;
    md += `\n## ${label}\n\n${note}.\n\n| File:line | Component | Selector | Property | Value${k === 'unpublished' ? ' | Linter' : ''} |\n|---|---|---|---|---|${k === 'unpublished' ? '---|' : ''}\n`;
    for (const r of rs) md += `| ${r.file}:${r.line} | ${comp(r.selector)} | \`${r.selector}\` | \`${r.prop}\` | \`${r.value.replace(/\|/g, '\\|')}\`${k === 'unpublished' ? ` | ${r.lint}` : ''} |\n`;
}
writeFileSync(ROOT + OUT, md);
console.log(`${OUT}: ${rows.length} lines — ` + LEVELS.map(([k]) => `${k} ${count(k)}`).join(', '));
