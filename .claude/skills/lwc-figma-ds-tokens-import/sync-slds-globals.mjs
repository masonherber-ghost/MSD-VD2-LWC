#!/usr/bin/env node
// The SLDS half of design-tokens.css: every public --slds-g-* global that nothing else declares,
// at the value SLDS ships. A MODULE — write-tokens.mjs imports `sldsEntries(declared)` and writes
// the whole token block. Each entry is labelled:
//
//   default              SLDS 2's own value — the Cosmos and Lightning Blue themes agree
//   cosmos — default X   the Cosmos theme's value; Lightning Blue (SLDS's base) has X
//
// Values are written light-only (this project imports no dark mode): light-dark(a, b) becomes a.
// References to Cosmos's private --slds-r-* reference ramps are resolved to their literal value;
// references to another --slds-g-* token are KEPT as var(), so a Figma override of the
// referenced token still flows through. Re-run write-tokens.mjs after upgrading
// @salesforce-ux/design-system-2.

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../..');
const DIST = join(ROOT, 'node_modules/@salesforce-ux/design-system-2/dist/css/bundled');

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

/** Every shipped --slds-g-* global NOT in `declared`, in the order Cosmos declares them. */
export function sldsEntries(declared) {
    const out = [];
    for (const name of cosmos.keys()) {
        if (!name.startsWith('--slds-g-') || declared.has(name)) continue;
        const value = written(cosmos, name);
        const rc = resolved(cosmos, name);
        const rb = blue.has(name) ? resolved(blue, name) : null;
        const label = rb !== null && rc === rb
            ? 'default'
            : rb === null ? 'cosmos — not in Lightning Blue'
            : rb.length <= 48 ? `cosmos — default ${rb}` : 'cosmos — default differs';
        out.push({ hook: name, value, label, source: label === 'default' ? 'default' : 'cosmos' });
    }
    return out;
}

/** Every public global SLDS ships — the 524 the file must declare. */
export const shippedGlobals = [...cosmos.keys()].filter((n) => n.startsWith('--slds-g-'));
