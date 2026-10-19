#!/usr/bin/env node
// Prints what a lightning-* component's OWN stylesheet does with custom properties,
// rule by rule — the honest answer to "which hook styles which state".
//
//   node .claude/skills/lwc-component-review/hook-map.mjs button
//   node .claude/skills/lwc-component-review/hook-map.mjs button --variant destructive
//
// For each rule it lists:
//   SETS   custom properties the rule DECLARES on the inner element. A value the
//          site sets on the host cannot override these — the inner declaration wins.
//   READS  custom properties the rule reads with var(). If nothing inside sets one,
//          the site can set it on the host and it inherits in — that is a lever.
//
// Then a summary: every --slds-c-* hook the component reads, split into
//   OPEN    read and never set inside → settable from the host (rung 4)
//   CLOSED  set inside by some variant rule → only reachable through the globals
//           that rule reads (rung 5, scoped to the host) or not at all
// and every --slds-s-* / --sds-* it reads (private / internal — do not set).
//
// Reads the component's *.slds.css and *.lbc.native.css (the shadow stylesheet),
// not the bundled global SLDS sheet — lightning-* components style themselves.

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const [name, flag, value] = process.argv.slice(2);
if (!name) { console.error('usage: hook-map.mjs <component> [--variant <v>]'); process.exit(2); }
const dir = join(process.cwd(), 'node_modules/lightning-base-components/src/lightning', name);
if (!existsSync(dir)) { console.error(`no component ${name}`); process.exit(2); }

const files = readdirSync(dir).filter((f) => f.endsWith('.slds.css') || f.endsWith('.lbc.native.css'));
const css = files.map((f) => readFileSync(join(dir, f), 'utf8')).join('\n').replace(/\/\*[\s\S]*?\*\//g, '');
const onlyVariant = flag === '--variant' ? value : null;

const rules = [];
for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const sel = m[1].trim().replace(/\s+/g, ' ');
    const body = m[2];
    const sets = [...body.matchAll(/(--[a-z0-9-]+)\s*:/g)].map((x) => x[1]);
    const reads = [...new Set([...body.matchAll(/var\(\s*(--[a-z0-9-]+)/g)].map((x) => x[1]))];
    if (!sets.length && !reads.length) continue;
    if (onlyVariant && !sel.includes(`variant='${onlyVariant}'`) && /variant=/.test(sel)) continue;
    rules.push({ sel, sets, reads });
}

for (const r of rules) {
    console.log(`\n${r.sel}`);
    if (r.sets.length) console.log(`  SETS   ${r.sets.join(' ')}`);
    if (r.reads.length) console.log(`  READS  ${r.reads.join(' ')}`);
}

const setInside = new Set(rules.flatMap((r) => r.sets));
const readAll = new Set(rules.flatMap((r) => r.reads));
const comp = [...readAll].filter((h) => h.startsWith('--slds-c-')).sort();
const open = comp.filter((h) => !setInside.has(h));
const closed = comp.filter((h) => setInside.has(h));
const priv = [...readAll].filter((h) => h.startsWith('--slds-s-') || h.startsWith('--_slds-')).sort();
const sds = [...readAll].filter((h) => h.startsWith('--sds-')).sort();
const glob = [...readAll].filter((h) => h.startsWith('--slds-g-')).sort();

console.log('\n==== SUMMARY' + (onlyVariant ? ` (variant ${onlyVariant} + shared rules)` : ''));
console.log(`OPEN component hooks — settable on the host (${open.length}):\n  ${open.join('\n  ')}`);
console.log(`CLOSED component hooks — some variant sets them inside (${closed.length}):\n  ${closed.join('\n  ')}`);
console.log(`Global tokens read (${glob.length}) — reachable by scoping on the host (rung 5):\n  ${glob.join(' ')}`);
console.log(`Private --slds-s-* read (${priv.length}) — do not set:\n  ${priv.join(' ')}`);
console.log(`Internal --sds-* (${sds.length}) — undocumented primitive layer, do not set`);
