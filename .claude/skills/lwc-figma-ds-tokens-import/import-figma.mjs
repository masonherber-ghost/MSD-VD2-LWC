#!/usr/bin/env node
// The Figma half of design-tokens.css: every Figma variable that lands on a public --slds-g-*
// hook, with Figma's value. A MODULE — write-tokens.mjs imports `figmaEntries` and writes the
// whole token block; run this file directly for the importer's findings (the report's raw data).
//
// Reads figma-variables.txt (the snapshot step 1 of SKILL.md produces). Light values only.
// Each entry is labelled:
//
//   figma — cosmos X  Figma's value differs from Cosmos (X) — this is MSD's theme
//   figma = cosmos    Figma's value equals the Cosmos theme's (which differs from Lightning Blue)
//   figma = default   Figma's value equals SLDS's own default (Cosmos and Lightning Blue agree)
//
// The hook written is the one Figma MEANS, not always the code syntax it exports:
//   - a code syntax that is an SLDS alias (Cosmos defines it as var(--slds-g-x)) → x
//   - a ramp variable whose code syntax names a different step than its name → the named step
//   - a ramp variable with no code syntax whose step SLDS ships → that step
// Everything else that cannot land on a shipped hook is reported, not written.
//
//   node .claude/skills/lwc-figma-ds-tokens-import/import-figma.mjs   # findings + tally

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '../../..');
const DIST = join(ROOT, 'node_modules/@salesforce-ux/design-system-2/dist/css/bundled');

// ---------- shipped stylesheets ----------
const props = (file) => {
    const m = new Map();
    for (const x of readFileSync(file, 'utf8').matchAll(/(--slds-[gr]-[a-z0-9-]+)\s*:\s*([^;}]*)/g)) if (!m.has(x[1])) m.set(x[1], x[2].trim());
    return m;
};
const cosmos = props(join(DIST, 'slds2.cosmos.css'));
const blue = props(join(DIST, 'slds2.lightning-blue.css'));
const ships = (h) => cosmos.has(h);

const args = (s, i) => {
    let d = 0, c = '', o = [];
    for (let j = i; j < s.length; j++) {
        const ch = s[j];
        if (ch === '(') { if (d++ > 0) c += ch; continue; }
        if (ch === ')') { if (--d === 0) { o.push(c.trim()); return [o, j]; } c += ch; continue; }
        if (ch === ',' && d === 1) { o.push(c.trim()); c = ''; continue; }
        c += ch;
    }
    throw new Error('unbalanced ' + s);
};
const resolve = (map, name, seen = new Set()) => {
    if (seen.has(name) || !map.has(name)) return `?${name}`;
    seen.add(name);
    let v = map.get(name), k;
    while ((k = v.indexOf('light-dark(')) >= 0) { const [a, e] = args(v, k + 10); v = v.slice(0, k) + a[0] + v.slice(e + 1); }
    let out = '', i = 0;
    for (;;) {
        const q = v.indexOf('var(', i);
        if (q < 0) { out += v.slice(i); break; }
        const [a, e] = args(v, q + 3);
        out += v.slice(i, q) + (map.has(a[0]) ? resolve(map, a[0], new Set(seen)) : (a[1] ?? `?${a[0]}`));
        i = e + 1;
    }
    return norm(out);
};
// Normalise for comparison: lowercase, #fff → #ffffff, 0.5rem stays, 8px → 0.5rem.
const norm = (v) => v.trim().toLowerCase().replace(/\s+/g, ' ')
    .replace(/#([0-9a-f])([0-9a-f])([0-9a-f])\b(?![0-9a-f])/g, '#$1$1$2$2$3$3')
    .replace(/(-?\d*\.?\d+)px\b/g, (_, n) => (n === '0' ? '0' : `${+(n / 16).toFixed(4)}rem`));
const aliasOf = (h) => { const v = cosmos.get(h); const m = v && v.match(/^var\((--slds-g-[a-z0-9-]+)\)$/); return m ? m[1] : null; };

// ---------- the snapshot ----------
const rows = [];
let collection = '';
for (const line of readFileSync(join(HERE, 'figma-variables.txt'), 'utf8').split('\n')) {
    if (!line.trim() || line.startsWith('#')) continue;
    if (line.startsWith('@collection')) { collection = line.split(' ')[1]; continue; }
    const [name, syntax, value] = line.split(';').map((s) => s.trim());
    rows.push({ collection, name, syntax: syntax === '-' ? null : syntax, value });
}

// ---------- intended hook ----------
const RAMP = /^(neutral-base|brand-base|error-base|warning-base|success-base|information|palette\/[a-z-]+)\/(\d+)\b/;
const rampHook = (name) => {
    const m = name.match(RAMP);
    if (!m) return null;
    const fam = m[1] === 'information' ? 'info-base' : m[1].replace('/', '-');
    return `--slds-g-color-${fam}-${m[2]}`;
};
const findings = [];
const note = (kind, row, text) => findings.push({ kind, name: row.name, text });

const decided = new Map();   // hook -> row
for (const row of rows) {
    let hook = row.syntax;
    const named = rampHook(row.name);
    if (named && hook !== named) {
        if (hook) note('syntax-step', row, `code syntax ${hook} names a different step than "${row.name}"`);
        else if (ships(named)) note('syntax-missing', row, `no code syntax; SLDS ships ${named}`);
        hook = ships(named) ? named : null;
        if (!hook) { note('no-hook', row, `step has no SLDS name (${named} does not ship) — not imported`); continue; }
    }
    if (!hook) { note('skipped', row, 'no code syntax — handled outside this block (B, D or not imported)'); continue; }
    if (!hook.startsWith('--slds-g-')) { note('not-global', row, `code syntax ${hook} is not a public global`); continue; }
    if (!ships(hook)) { note('not-shipped', row, `code syntax ${hook} — SLDS does not ship it; not imported`); continue; }
    const alias = aliasOf(hook);
    if (alias && !named && !row.value.startsWith('→')) { note('alias', row, `${hook} is an SLDS alias of ${alias} — written to ${alias}`); hook = alias; }
    if (decided.has(hook)) { note('duplicate', row, `${hook} already taken by "${decided.get(hook).name}" — skipped`); continue; }
    decided.set(hook, row);
}

// ---------- values ----------
const WEIGHT = { thin: 100, extralight: 200, light: 300, regular: 400, medium: 500, semibold: 600, bold: 700, extrabold: 800, black: 900 };
const rem = (px) => `${+(px / 16).toFixed(4)}rem`;
const hookFor = (target) => { // an alias target, remapped the same way
    const a = aliasOf(target);
    return a && decided.has(a) ? a : target;
};
const valueOf = (hook, row) => {
    const v = row.value;
    if (v.startsWith('→')) return `var(${hookFor(v.slice(1))})`;
    if (/^#[0-9a-f]+$/i.test(v)) return v.toLowerCase();
    if (/font-weight/.test(hook)) {
        const w = WEIGHT[v.toLowerCase().replace(/[\s-]/g, '')];
        if (!w) throw new Error(`unknown weight ${v}`);
        return String(w);
    }
    if (hook === '--slds-g-font-family-base') {
        // fonts.css registers the webfont as '<family> Variable'; SLDS's own stack is the fallback.
        return `'${v} Variable', '${v}', ${cosmos.get(hook)}`;
    }
    if (hook === '--slds-g-font-family-monospace') return `'${v}', ${cosmos.get(hook)}`;
    if (/^-?\d*\.?\d+$/.test(v)) {
        const n = +v;
        if (/sizing-border/.test(hook)) return `${n}px`;
        if (/radius-border-circle/.test(hook)) return `${n}px`;
        return rem(n);
    }
    return v;
};

// Comparable light value of what Figma sets: follow Figma's own aliases.
const figmaResolved = (hook, seen = new Set()) => {
    if (seen.has(hook)) return '?cycle';
    seen.add(hook);
    const row = decided.get(hook);
    if (!row) return resolve(cosmos, hook);
    const v = valueOf(hook, row);
    const m = v.match(/^var\((--[a-z0-9-]+)\)$/);
    return m ? figmaResolved(m[1], seen) : norm(v);
};

// ---------- entries ----------
export const PALETTE_NOTE = { green: 'MSD teal under Salesforce\'s "green" name', 'hot-orange': 'MSD salmon' };
export const tally = { figma: 0, cosmos: 0, def: 0 };
export const figmaEntries = [];
for (const [hook, row] of decided) {
    const value = valueOf(hook, row);
    const fv = figmaResolved(hook);
    const cv = resolve(cosmos, hook);
    const bv = blue.has(hook) ? resolve(blue, hook) : null;
    let label;
    if (fv === cv) { label = bv === cv ? 'figma = default' : 'figma = cosmos'; bv === cv ? tally.def++ : tally.cosmos++; }
    else { label = `figma — cosmos ${cv.length <= 40 ? cv : 'differs'}`; tally.figma++; }
    figmaEntries.push({ hook, value, label, source: 'figma' });
}
export { findings, rows };

if (import.meta.url === `file://${process.argv[1]}`) {
    console.log(`variables ${rows.length}  on a hook ${decided.size}  (differs from Cosmos ${tally.figma}, = Cosmos ${tally.cosmos}, = SLDS default ${tally.def})`);
    const byKind = {};
    for (const f of findings) (byKind[f.kind] ??= []).push(f);
    for (const [k, list] of Object.entries(byKind)) {
        console.log(`\n${k} (${list.length})`);
        for (const f of list) console.log(`  ${f.name} — ${f.text}`);
    }
    console.log('\nTo write the file: node .claude/skills/lwc-figma-ds-tokens-import/write-tokens.mjs');
}
