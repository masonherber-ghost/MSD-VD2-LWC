/**
 * Generates src/modules/data/foundations/foundations.js from the INSTALLED SLDS
 * stylesheet — the data behind the Foundations tab at /design-system.
 *
 * Typography is the first foundation. It answers one question: "what classes
 * can I use to set type?". SLDS 2 documents its type scale on a JavaScript-
 * rendered site, and the scale has more steps than there are classes, so the
 * only honest list is one read off the stylesheet this site actually loads.
 * Re-run after upgrading @salesforce-ux/design-system-2:
 *
 *   npm run foundations
 *
 * Three lists, all parsed, none hand-written:
 *   classes  every standalone `.slds-text-*` / `.slds-font-*` class that sets a
 *            font-size, with the weight, line-height and case it also sets
 *   scale    every `--slds-g-font-scale-*` step, and the classes that use it —
 *            so a step with no class shows as "CSS only"
 *   weights  every `--slds-g-font-weight-*` token, and the classes that set one
 */

import fs from 'node:fs';
import path from 'node:path';

const SLDS_CSS = path.resolve(
    'node_modules/@salesforce-ux/design-system-2/dist/css/bundled/slds2.cosmos.css'
);
const PKG = path.resolve('node_modules/@salesforce-ux/design-system-2/package.json');
const OUT = path.resolve('src/modules/data/foundations/foundations.js');

const css = fs.readFileSync(SLDS_CSS, 'utf8');
const version = JSON.parse(fs.readFileSync(PKG, 'utf8')).version;

/** Every `--slds-g-font-*: value;` declaration. First wins: the defaults block. */
const tokens = new Map();
for (const m of css.matchAll(/(--slds-g-font-[a-z0-9-]+)\s*:\s*([^;}]+)[;}]/g)) {
    if (!tokens.has(m[1])) tokens.set(m[1], m[2].trim());
}

/** Follow `var(--a)` chains to a literal; keep the first token name seen. */
function resolve(value, depth = 0) {
    const m = /^var\((--slds-g-[a-z0-9-]+)(?:\s*,\s*(.+))?\)$/.exec(String(value).trim());
    if (!m || depth > 8) return String(value).trim();
    const next = tokens.get(m[1]);
    return next ? resolve(next, depth + 1) : (m[2] ?? m[1]);
}

/** The first `--slds-g-…` token a declaration reads, or ''. */
const tokenOf = (value) => (/var\((--slds-g-[a-z0-9-]+)/.exec(value ?? '') ?? [])[1] ?? '';

/** `0.75rem` -> `12px` (SLDS sizes are rem against a 16px root). */
function px(value) {
    const m = /^([\d.]+)rem$/.exec(value);
    return m ? `${Math.round(parseFloat(m[1]) * 16 * 100) / 100}px` : '';
}

// -- classes -----------------------------------------------------------------

const classes = new Map();
for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const body = m[2];
    const size = /(?:^|;)\s*font-size\s*:\s*([^;]+);/.exec(body);
    if (!size) continue;
    const decl = (prop) => (new RegExp(`(?:^|;)\\s*${prop}\\s*:\\s*([^;]+);`).exec(body) ?? [])[1]?.trim() ?? '';
    for (const raw of m[1].split(',')) {
        const sel = raw.trim();
        // Standalone utility classes only: no descendants, no BEM `--` aliases.
        if (!/^\.slds-(?:text|font)-[a-z0-9_-]+$/.test(sel) || sel.includes('--')) continue;
        if (classes.has(sel)) continue;
        const sizeValue = size[1].trim();
        if (sizeValue === 'inherit') continue; // `slds-text-link_reset` resets, it does not size
        const weight = decl('font-weight');
        const lineHeight = decl('line-height');
        classes.set(sel, {
            name: sel.slice(1),
            sizeToken: tokenOf(sizeValue),
            size: resolve(sizeValue),
            px: px(resolve(sizeValue)),
            weightToken: tokenOf(weight),
            weight: weight ? resolve(weight) : '',
            lineHeightToken: tokenOf(lineHeight),
            lineHeight: lineHeight ? resolve(lineHeight) : '',
            transform: decl('text-transform')
        });
    }
}

const classList = [...classes.values()].sort(
    (a, b) => parseFloat(b.size) - parseFloat(a.size) || a.name.localeCompare(b.name)
);

// -- scale -------------------------------------------------------------------

/** Steps in display order: largest first, aliases (scale-9 -> scale-8) kept. */
const stepOrder = (name) => {
    const s = name.replace('--slds-g-font-scale-', '');
    if (s === 'base') return 0.5;
    if (s.startsWith('neg-')) return -parseInt(s.slice(4), 10);
    return parseInt(s, 10);
};

const scale = [...tokens.keys()]
    .filter((n) => /^--slds-g-font-scale-(?:neg-\d+|\d+|base)$/.test(n))
    .sort((a, b) => stepOrder(b) - stepOrder(a))
    .map((name) => {
        const declared = tokens.get(name);
        const value = resolve(declared);
        const alias = /^var\(/.test(declared) ? tokenOf(declared) : '';
        // A class "uses" a step when it reads it directly, or reads a token that aliases to it.
        const users = classList
            .filter((c) => c.sizeToken === name || (c.sizeToken && tokens.get(c.sizeToken) === `var(${name})`))
            .map((c) => c.name);
        return { name, value, px: px(value), aliasOf: alias, classes: users };
    });

// -- weights -----------------------------------------------------------------

const weights = [...tokens.keys()]
    .filter((n) => /^--slds-g-font-weight-\d+$/.test(n))
    .sort()
    .map((name) => ({
        name,
        value: resolve(tokens.get(name)),
        classes: classList.filter((c) => c.weightToken === name).map((c) => c.name)
    }));

// -- write -------------------------------------------------------------------

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(
    OUT,
    `// GENERATED by scripts/build-foundations.mjs - do not edit.\n` +
        `// Source: @salesforce-ux/design-system-2@${version} (slds2.cosmos.css)\n\n` +
        `export const SLDS_VERSION = ${JSON.stringify(version)};\n\n` +
        `export const TYPE_CLASSES = ${JSON.stringify(classList, null, 4)};\n\n` +
        `export const TYPE_SCALE = ${JSON.stringify(scale, null, 4)};\n\n` +
        `export const TYPE_WEIGHTS = ${JSON.stringify(weights, null, 4)};\n`
);

const withClass = scale.filter((s) => s.classes.length).length;
console.log(
    `foundations: ${classList.length} type classes, ${scale.length} scale steps ` +
        `(${withClass} with a class), ${weights.length} weights`
);
console.log(`wrote ${path.relative(process.cwd(), OUT)}`);
