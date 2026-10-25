#!/usr/bin/env node
// Writes the token block of src/assets/css/design-tokens.css, between
//
//   /* @generated tokens:start */  …  /* @generated tokens:end */
//
// from three sources, merged per hook (the first that defines a hook wins):
//
//   1. hand-tokens.mjs        effect styles, shadow tints, deliberate deviations
//   2. import-figma.mjs       every Figma variable that lands on a public hook
//   3. sync-slds-globals.mjs  every other public global, at the value SLDS ships
//
// and grouped by TYPE of token — spacing, sizing, type, colour ramps, palettes, semantic
// colours, shadows, motion — not by where a value came from. Each line keeps its source label.
// Everything outside the markers (header, layout tokens, closing notes) is hand-written.
//
//   node .claude/skills/lwc-figma-ds-tokens-import/write-tokens.mjs            # write
//   node .claude/skills/lwc-figma-ds-tokens-import/write-tokens.mjs --dry-run  # counts only

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { handEntries } from './hand-tokens.mjs';
import { figmaEntries, PALETTE_NOTE } from './import-figma.mjs';
import { sldsEntries, shippedGlobals } from './sync-slds-globals.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../..');
const TOKENS = join(ROOT, 'src/assets/css/design-tokens.css');
const START = '/* @generated tokens:start */';
const END = '/* @generated tokens:end */';

// ---------- merge: hand > figma > slds ----------
const byHook = new Map();
for (const e of [...handEntries, ...figmaEntries]) if (!byHook.has(e.hook)) byHook.set(e.hook, e);
for (const e of sldsEntries(new Set(byHook.keys()))) byHook.set(e.hook, e);

const missing = shippedGlobals.filter((h) => !byHook.has(h));
if (missing.length) throw new Error(`globals not declared: ${missing.join(', ')}`);

// ---------- taxonomy ----------
// [section, group, test, note?]. A group title prints once; a section title prints when it
// changes. Notes are for issues worth knowing — everything else lives in the docs.
const RAMP = (fam) => new RegExp(`--slds-g-color-${fam}-base-\\d+$`);
const SEM = (re) => (h) => /^--slds-g-color-/.test(h) && !/-base-\d+$|palette-/.test(h) && re.test(h);
const GROUPS = [
    ['Spacing', 'Spacing', /^--slds-g-spacing-/],
    ['Sizing', 'Sizing', /^--slds-g-sizing-(?!border)/],
    ['Sizing', 'Border widths', /^--slds-g-sizing-border-/,
        'sizing-border-2 is 1.5px: Figma\'s value, though its label says 2px. Kept — the button\n' +
        '   outline is drawn at 1.5px. /3 and /4 to confirm (report § 3.1).'],
    ['Sizing', 'Radius', /^--slds-g-radius-/],
    ['Type', 'Font family', /^--slds-g-font-family/],
    ['Type', 'Font scale', /^--slds-g-font-(scale|size)/],
    ['Type', 'Font weight', /^--slds-g-font-weight/,
        'Weight 6 is 500, not Figma\'s 600 (user, 2026-10-23): the site uses 300 / 400 / 500 / 700.\n' +
        '   SLDS reads weight 6 for labels, alerts and table headers. Delete the override in\n' +
        '   hand-tokens.mjs if Figma moves SemiBold to 500.'],
    ['Type', 'Line height', /^--slds-g-font-(line|lineheight)/],
    ['Colour — ramps', 'Neutral', RAMP('neutral')],
    ['Colour — ramps', 'Brand', RAMP('brand')],
    ['Colour — ramps', 'Error', RAMP('error')],
    ['Colour — ramps', 'Warning', RAMP('warning')],
    ['Colour — ramps', 'Success', RAMP('success')],
    ['Colour — ramps', 'Info', RAMP('info')],
    ['Colour — palettes', null, /^--slds-g-color-palette-/],   // one group per palette
    ['Colour — semantic', 'Surface', SEM(/^--slds-g-color-surface-/)],
    ['Colour — semantic', 'On surface', SEM(/-on-surface/)],
    ['Colour — semantic', 'Border', SEM(/^--slds-g-color-border(-inverse)?-\d$/)],
    ['Colour — semantic', 'Accent', SEM(/accent/)],
    ['Colour — semantic', 'Error', SEM(/error/)],
    ['Colour — semantic', 'Warning', SEM(/warning/)],
    ['Colour — semantic', 'Success', SEM(/success/)],
    ['Colour — semantic', 'Info', SEM(/info/)],
    ['Colour — semantic', 'Disabled', SEM(/disabled/)],
    ['Shadows', 'Shadow colours', /^--sep-color-shadow-/,
        'MSD navy (#162c45) where SLDS uses black. No SLDS name, so --sep-*.'],
    ['Shadows', 'Elevation', /^--slds-g-shadow-(?!.*focus)/,
        'Figma: Elevation/1 - right is a copy of /1 - left. inline-end-1 mirrors left, as levels\n' +
        '   2–4 do — fix the style in Figma.'],
    ['Shadows', 'Focus', /^--slds-g-shadow-.*focus/],
    ['Motion and ratio', 'Duration', /^--slds-g-duration-/],
    ['Motion and ratio', 'Aspect ratio', /^--slds-g-ratio-/],
];
const test = (t, h) => (typeof t === 'function' ? t(h) : t.test(h));
const placed = new Map(); // key -> {section, title, note, entries}
const order = [];
for (const e of byHook.values()) {
    const g = GROUPS.find(([, , t]) => test(t, e.hook));
    if (!g) throw new Error(`no group for ${e.hook} — add one to GROUPS`);
    let [section, title, , note] = g;
    if (title === null) {
        const name = e.hook.match(/^--slds-g-color-palette-([a-z-]+)-\d+$/)[1];
        title = `${name[0].toUpperCase()}${name.slice(1)}${PALETTE_NOTE[name] ? ' — ' + PALETTE_NOTE[name] : ''}`;
    }
    const key = `${section}|${title}`;
    if (!placed.has(key)) { placed.set(key, { section, title, note, entries: [] }); order.push(key); }
    placed.get(key).entries.push(e);
}
// Keep the taxonomy's order; palettes in the order they first appear (Figma's, then SLDS's).
const rank = (k) => GROUPS.findIndex(([s, t]) => k.startsWith(`${s}|`) && (t === null || k === `${s}|${t}`));
order.sort((a, b) => rank(a) - rank(b));
const step = (h) => { const m = h.match(/-(\d+)$/); return m ? +m[1] : null; };
for (const k of order) {
    const g = placed.get(k);
    if (/ramps|palettes/.test(g.section)) g.entries.sort((a, b) => step(b.hook) - step(a.hook));
}

// ---------- emit ----------
const lines = [START, ':root {'];
let section = '';
for (const k of order) {
    const g = placed.get(k);
    if (g.section !== section) {
        section = g.section;
        lines.push('', `    /* ==== ${section} ${'='.repeat(Math.max(4, 66 - section.length))} */`);
    }
    // A group named like its section (Spacing under Spacing) needs no second title.
    if (g.title !== g.section || g.note) {
        lines.push('', `    /* ${g.title}${g.note ? '\n       ' + g.note.replace(/\n/g, '\n    ') : ''} */`);
    }
    for (const e of g.entries) {
        const decl = `    ${e.hook}: ${e.value};`;
        lines.push(decl.length < 72 ? `${decl.padEnd(72)}/* ${e.label} */` : `${decl} /* ${e.label} */`);
    }
}
lines.push('}', END);

const count = (s) => [...byHook.values()].filter((e) => e.source === s).length;
const globals = [...byHook.keys()].filter((h) => h.startsWith('--slds-g-')).length;
console.log(`globals ${globals}/${shippedGlobals.length}  figma ${count('figma')}  msd ${count('msd')}  cosmos ${count('cosmos')}  default ${count('default')}  --sep ${byHook.size - globals}`);

if (!process.argv.includes('--dry-run')) {
    let file = readFileSync(TOKENS, 'utf8');
    if (!file.includes(START)) throw new Error(`markers missing — add ${START} … ${END} where the block belongs`);
    file = file.slice(0, file.indexOf(START)) + lines.join('\n') + file.slice(file.indexOf(END) + END.length);
    writeFileSync(TOKENS, file);
    console.log('wrote', TOKENS.replace(ROOT + '/', ''));
}
