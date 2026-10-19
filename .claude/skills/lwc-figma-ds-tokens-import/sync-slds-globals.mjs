#!/usr/bin/env node
// Writes every --slds-g-* global the Figma import does NOT set into design-tokens.css,
// between the markers
//
//   /* @generated slds-globals:start */  …  /* @generated slds-globals:end */
//
// each labelled with where its value comes from:
//
//   default   SLDS 2's own value — the Cosmos and Lightning Blue themes agree
//   cosmos    the Cosmos theme's value — it differs from Lightning Blue, which is shown
//
// Skipped: every token declared above the block (the generated Figma block C1, and C2).
// So this never overrides or repeats a Figma value. Re-run after upgrading @salesforce-ux/design-system-2 —
// the block is generated, never hand-edited.
//
//   node .claude/skills/lwc-figma-ds-tokens-import/sync-slds-globals.mjs
//
// Values are written light-only (this project imports no dark mode): light-dark(a, b)
// becomes a. References to Cosmos's private --slds-r-* reference ramps are resolved to
// their literal value; references to another --slds-g-* token are KEPT as var(), so a
// Figma override of the referenced token still flows through.

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const DIST = join(ROOT, 'node_modules/@salesforce-ux/design-system-2/dist/css/bundled');
const TOKENS = join(ROOT, 'src/assets/css/design-tokens.css');
const START = '/* @generated slds-globals:start */';
const END = '/* @generated slds-globals:end */';

const props = (file) => {
    const m = new Map();
    for (const x of readFileSync(file, 'utf8').matchAll(/(--slds-[gr]-[a-z0-9-]+)\s*:\s*([^;}]*)/g)) {
        if (!m.has(x[1])) m.set(x[1], x[2].trim());
    }
    return m;
};
const cosmos = props(join(DIST, 'slds2.cosmos.css'));
const blue = props(join(DIST, 'slds2.lightning-blue.css'));

// Split the top-level arguments of a function call starting at s[i] === '('.
const args = (s, i) => {
    let depth = 0, cur = '', out = [];
    for (let j = i; j < s.length; j++) {
        const ch = s[j];
        if (ch === '(') { if (depth++ > 0) cur += ch; continue; }
        if (ch === ')') { if (--depth === 0) { out.push(cur.trim()); return [out, j]; } cur += ch; continue; }
        if (ch === ',' && depth === 1) { out.push(cur.trim()); cur = ''; continue; }
        cur += ch;
    }
    throw new Error('unbalanced: ' + s);
};

// light-dark(a, b) -> a, everywhere.
const lightOnly = (v) => {
    let k;
    while ((k = v.indexOf('light-dark(')) >= 0) {
        const [a, end] = args(v, k + 'light-dark'.length);
        v = v.slice(0, k) + a[0] + v.slice(end + 1);
    }
    return v;
};

// Replace var(--name[, fallback]) for names matching `test` with resolve(name, fallback).
const replaceVars = (v, test, resolve) => {
    let out = '', i = 0;
    for (;;) {
        const k = v.indexOf('var(', i);
        if (k < 0) return out + v.slice(i);
        const [a, end] = args(v, k + 3);
        const name = a[0];
        out += v.slice(i, k) + (test(name) ? resolve(name, a[1]) : v.slice(k, end + 1));
        i = end + 1;
    }
};

// Value as written here: light only, --slds-r-* resolved, --slds-g-* kept.
const written = (map, name, seen = new Set()) => {
    if (seen.has(name)) throw new Error('cycle at ' + name);
    seen.add(name);
    let v = lightOnly(map.get(name));
    v = replaceVars(v, (n) => n.startsWith('--slds-r-'), (n, fb) =>
        map.has(n) ? written(map, n, new Set(seen)) : (fb ?? n));
    return v;
};

// Fully resolved light value — every var() followed — for comparing the two themes.
const resolved = (map, name, seen = new Set()) => {
    if (seen.has(name) || !map.has(name)) return `?${name}`;
    seen.add(name);
    let v = lightOnly(map.get(name));
    v = replaceVars(v, () => true, (n, fb) =>
        map.has(n) ? resolved(map, n, new Set(seen)) : (fb !== undefined ? fb : `?${n}`));
    return v.replace(/\s+/g, ' ').toLowerCase();
};

// Names the Figma import declares — everything live outside the generated block.
let file = readFileSync(TOKENS, 'utf8');
const outside = file.includes(START)
    ? file.slice(0, file.indexOf(START)) + file.slice(file.indexOf(END) + END.length)
    : file;
const figma = new Set(
    [...outside.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/(--slds-g-[a-z0-9-]+)\s*:/g)].map((m) => m[1]),
);

// Family = the name up to its first numeric or state segment.
const family = (n) => {
    const p = n.replace(/^--slds-g-/, '').split('-');
    if (p[0] === 'color' && p[1] === 'palette') return 'Palette: ' + n.replace(/^--slds-g-color-palette-/, '').replace(/-\d+$/, '') + ' — not in Figma';
    if (p[0] === 'color' && /-base-/.test(n)) return p.slice(0, 3).join('-');
    if (p[0] === 'color') return 'color-' + p[1];
    if (p[0] === 'font') return 'font-' + p[1];
    if (p[0] === 'shadow') return 'shadow';
    return p[0];
};

const groups = new Map();
let nCosmos = 0, nDefault = 0;
for (const name of cosmos.keys()) {
    if (!name.startsWith('--slds-g-') || figma.has(name)) continue;
    const value = written(cosmos, name);
    const rc = resolved(cosmos, name);
    const rb = blue.has(name) ? resolved(blue, name) : null;
    const isDefault = rb !== null && rc === rb;
    isDefault ? nDefault++ : nCosmos++;
    const note = isDefault
        ? 'default'
        : rb === null ? 'cosmos — not in Lightning Blue'
        : rb.length <= 48 ? `cosmos — default ${rb}` : 'cosmos — default differs';
    const fam = family(name);
    if (!groups.has(fam)) groups.set(fam, []);
    groups.get(fam).push({ name, value, note });
}

const lines = [START, ':root {'];
for (const [fam, rows] of groups) {
    lines.push('', `    /* ${fam} */`);
    for (const r of rows) {
        const decl = `    ${r.name}: ${r.value};`;
        lines.push(decl.length < 72 ? `${decl.padEnd(72)}/* ${r.note} */` : `${decl} /* ${r.note} */`);
    }
}
lines.push('}', END);
const block = lines.join('\n');

if (file.includes(START)) {
    file = file.slice(0, file.indexOf(START)) + block + file.slice(file.indexOf(END) + END.length);
} else {
    const anchor = file.indexOf('/* -----------------------------------------------------------------------------\n * D. Component hooks');
    if (anchor < 0) throw new Error('section D not found — place the markers by hand');
    file = file.slice(0, anchor) + block + '\n\n' + file.slice(anchor);
}
writeFileSync(TOKENS, file);
console.log(`declared above (C1 Figma + C2 effect styles): ${figma.size}   cosmos: ${nCosmos}  default: ${nDefault}  total: ${figma.size + nCosmos + nDefault}`);
