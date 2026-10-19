#!/usr/bin/env node
// Checks src/assets/css/design-tokens.css against the SLDS stylesheet this site loads.
//
//   node .claude/skills/lwc-figma-ds-tokens-import/check-tokens.mjs
//
// Fails (exit 1) when:
//   - a declaration, live or [OFF], sets a non --sep-* name the shipped stylesheet lacks
//   - any var() in the file, or in any stylesheet under src/, resolves to nothing
//     (not SLDS, not a lightning-* component, not declared by us)
//   - a light-dark() appears in a declaration (the import is light values only)
//   - a --site-* name appears anywhere under src/ (the prefix is --sep-)
//
// Warns (no failure) when a switched-on block reads a name only a still-[OFF] block sets.
//
// Reads only. Prints a summary per block.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const TOKENS = join(ROOT, 'src/assets/css/design-tokens.css');
const SLDS = join(ROOT, 'node_modules/@salesforce-ux/design-system-2/dist/css/bundled/slds2.cosmos.css');
const LBC = join(ROOT, 'node_modules/lightning-base-components/src/lightning');

const walk = (dir, ext, out = []) => {
    for (const f of readdirSync(dir)) {
        const p = join(dir, f);
        if (statSync(p).isDirectory()) walk(p, ext, out);
        else if (p.endsWith(ext)) out.push(p);
    }
    return out;
};

const slds = readFileSync(SLDS, 'utf8');
const lbcCss = walk(LBC, '.css').map((p) => readFileSync(p, 'utf8')).join('\n');
const srcCss = walk(join(ROOT, 'src'), '.css').map((p) => [p, readFileSync(p, 'utf8')]);
const tokens = readFileSync(TOKENS, 'utf8');
const ours = srcCss.map(([, s]) => s).join('\n');

const declaredSomewhere = (name) =>
    slds.includes(`${name}:`) || lbcCss.includes(name) || ours.includes(`${name}:`);

const problems = [];

// Live declarations: strip every comment (which removes the [OFF] blocks with them).
// A live --slds-* name is a block someone switched on — allowed, but it must ship.
const live = tokens.replace(/\/\*[\s\S]*?\*\//g, '');
const liveNames = [...live.matchAll(/(--[a-z0-9-]+)\s*:/g)].map((m) => m[1]);
const liveOverrides = [...new Set(liveNames.filter((n) => !n.startsWith('--sep-')))];
const liveUnshipped = liveOverrides.filter((n) => !slds.includes(`${n}:`) && !lbcCss.includes(n));
if (liveUnshipped.length) problems.push(`live declarations SLDS does not ship: ${liveUnshipped.join(', ')}`);
console.log(`live declarations: ${liveNames.length} (${liveOverrides.length} switched-on SLDS overrides)`);

// Every block that is still [OFF], and the names it would set.
const offBlocks = [...tokens.matchAll(/\[OFF — ([^\]]+)\][\s\S]*?\[END OFF — \1\]/g)];
const offNames = new Map();
for (const m of offBlocks) {
    for (const x of m[0].matchAll(/^\s*(--[a-z0-9-]+)\s*:/gm)) offNames.set(x[1], m[1]);
}

// A switched-on override that reads a name only an [OFF] block sets resolves to the
// shipped value of that name — usually not what the design meant. Warn, don't fail.
const dependsOnOff = new Map();
for (const r of new Set([...live.matchAll(/var\((--[a-z0-9-]+)/g)].map((x) => x[1]))) {
    if (offNames.has(r)) dependsOnOff.set(offNames.get(r), (dependsOnOff.get(offNames.get(r)) ?? 0) + 1);
}
for (const [block, n] of dependsOnOff) {
    console.log(`WARNING: live declarations read ${n} names that only the [OFF] block "${block}" sets — they resolve to Salesforce's values until it is on`);
}

for (const m of offBlocks) {
    const body = m[0];
    const decl = [...body.matchAll(/^\s*(--[a-z0-9-]+)\s*:/gm)].map((x) => x[1]);
    const notShipped = decl.filter((n) => !n.startsWith('--sep-') && !slds.includes(`${n}:`) && !lbcCss.includes(n));
    const refs = [...new Set([...body.matchAll(/var\((--[a-z0-9-]+)/g)].map((x) => x[1]))];
    const unresolved = refs.filter((r) => !declaredSomewhere(r) && !tokens.includes(`${r}:`));
    console.log(`[OFF] ${m[1]}: ${decl.length} declarations`);
    if (notShipped.length) problems.push(`[OFF] ${m[1]} declares names SLDS does not ship: ${notShipped.join(', ')}`);
    if (unresolved.length) problems.push(`[OFF] ${m[1]} reads undeclared: ${unresolved.join(', ')}`);
}

// light-dark() in a declaration (comments may mention it).
if (/:\s*[^;]*light-dark\(/.test(live) || /^\s*--[a-z0-9-]+:\s*light-dark\(/m.test(tokens)) {
    problems.push('light-dark() found in a declaration — the import is light values only');
}

// var() references across every stylesheet. --dxp-* is supplied by the Experience Cloud
// Theme panel on a real site, so it is reported, not failed.
const dxp = new Set();
for (const [path, css] of srcCss) {
    for (const r of new Set([...css.matchAll(/var\((--[a-zA-Z0-9-]+)/g)].map((x) => x[1]))) {
        if (declaredSomewhere(r)) continue;
        if (r.startsWith('--dxp-')) { dxp.add(r); continue; }
        problems.push(`${path.replace(ROOT + '/', '')} reads undeclared ${r}`);
    }
    if (/--site-/.test(css)) problems.push(`${path.replace(ROOT + '/', '')} still uses the old --site- prefix`);
}
if (dxp.size) console.log(`--dxp hooks read but not declared (expected — Theme panel): ${dxp.size}`);

if (problems.length) {
    console.error('\nPROBLEMS');
    for (const p of problems) console.error(`  - ${p}`);
    process.exit(1);
}
console.log('\nok');
