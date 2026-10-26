#!/usr/bin/env node
/**
 * Split ONE Figma SVG export of an icon grid into one normalised SVG per icon.
 *
 *   node .claude/skills/lwc-figma-icons-import/split-figma-icons.mjs <grid.svg> <metadata.xml>
 *
 * <grid.svg>      download_assets export of the frame that holds the icon components
 *                 (format svg). Figma writes every icon into it in the FRAME's coordinates,
 *                 one <g id="<icon name>"> per component.
 * <metadata.xml>  get_metadata of that same frame, saved verbatim. Supplies each icon's
 *                 name, node id and x/y — the export itself carries no positions.
 *
 * Writes src/icons/svg/<slug>.svg (viewBox 0 0 24 24, paths only, no colour) and
 * src/icons/icons.json (the manifest: slug, Figma name, node id, notes). Removes any
 * svg/ file the new export no longer has, and says so.
 *
 * Why one grid export and not one call per icon: download_assets caps svgAssets at 20,
 * and passing 110 SVG strings through a conversation invites transcription errors.
 * One file, downloaded with curl, never passes through it.
 *
 * Fails loudly rather than guessing:
 *  - a metadata icon with no group in the export
 *  - a shape that is not a <path> (circle, rect, …) inside an icon
 *  - a relative path command (Figma emits absolute ones only)
 *  - a coordinate outside the icon's own 24×24 box — the tell of a wrong x/y
 */
import fs from 'node:fs';
import path from 'node:path';

const [gridFile, metaFile] = process.argv.slice(2);
if (!gridFile || !metaFile) {
    console.error('usage: split-figma-icons.mjs <grid.svg> <metadata.xml>');
    process.exit(2);
}

const OUT_DIR = path.resolve('src/icons/svg');
const MANIFEST = path.resolve('src/icons/icons.json');
const SIZE = 24;
// Bézier control points may sit a little outside the drawn shape.
const TOLERANCE = 1.5;

const slugify = (name) =>
    name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const unescape = (s) =>
    s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');

function attrs(text) {
    const out = {};
    for (const [, k, v] of text.matchAll(/([a-zA-Z:-]+)="([^"]*)"/g)) out[k] = unescape(v);
    return out;
}

// ---------------------------------------------------------------------------
// Metadata: <symbol id name x y …/> (Figma's get_metadata calls components "symbol")
// ---------------------------------------------------------------------------

const icons = [...fs.readFileSync(metaFile, 'utf8').matchAll(/<(?:symbol|instance)\b([^>]*)\/?>/g)]
    .map(([, a]) => attrs(a))
    .map((a) => ({ name: a.name, node: a.id, x: Number(a.x), y: Number(a.y) }));
if (!icons.length) throw new Error(`no <symbol> entries in ${metaFile}`);

const slugs = new Map();
for (const icon of icons) {
    icon.slug = slugify(icon.name);
    if (slugs.has(icon.slug)) {
        throw new Error(`"${icon.name}" and "${slugs.get(icon.slug)}" both slug to "${icon.slug}" — rename one in Figma`);
    }
    slugs.set(icon.slug, icon.name);
}

// ---------------------------------------------------------------------------
// Export: a minimal tag walker. Figma's SVG has no text nodes or CDATA we need.
// ---------------------------------------------------------------------------

const svg = fs.readFileSync(gridFile, 'utf8');
const byName = new Map(icons.map((i) => [i.name, i]));
const found = new Map(); // name -> { tags: [{ tag, attrs }] }
const stack = [];        // open elements: { tag, owner } — owner = icon being collected

for (const [, close, tag, rest, selfClose] of svg.matchAll(/<(\/?)([a-zA-Z]+)\b([^>]*?)(\/?)>/g)) {
    if (close) {
        stack.pop();
        continue;
    }
    const a = attrs(rest);
    const parentOwner = stack.at(-1)?.owner ?? null;
    let owner = parentOwner;
    // The OUTERMOST element named after an icon owns it; inner "Vector_n" groups do not.
    if (!owner && a.id && byName.has(a.id) && !found.has(a.id)) {
        owner = a.id;
        found.set(owner, { tags: [] });
    }
    if (owner && !['g', 'clipPath', 'defs'].includes(tag)) found.get(owner).tags.push({ tag, attrs: a });
    if (!selfClose) stack.push({ tag, owner });
}

// ---------------------------------------------------------------------------
// Path translation: absolute commands only, shifted into the icon's own box.
// ---------------------------------------------------------------------------

const fmt = (n) => String(Number(n.toFixed(3))).replace(/^-0$/, '0');
// Which argument of each command is an x (0), a y (1), or neither (-1); length = arity.
const AXES = { M: [0, 1], L: [0, 1], T: [0, 1], C: [0, 1, 0, 1, 0, 1], S: [0, 1, 0, 1], Q: [0, 1, 0, 1], H: [0], V: [1], A: [-1, -1, -1, -1, -1, 0, 1], Z: [] };

function translate(d, dx, dy, where) {
    const tokens = d.match(/[a-zA-Z]|-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/g) ?? [];
    const out = [];
    let cmd = null;
    let args = [];
    let min = Infinity;
    let max = -Infinity;
    const flush = () => {
        const axes = AXES[cmd];
        if (!axes.length) return;
        if (args.length % axes.length) throw new Error(`${where}: "${cmd}" has ${args.length} numbers`);
        const shifted = args.map((n, i) => {
            const axis = axes[i % axes.length];
            const v = axis === 0 ? n - dx : axis === 1 ? n - dy : n;
            if (axis !== -1) { min = Math.min(min, v); max = Math.max(max, v); }
            return fmt(v);
        });
        out.push(shifted.join(' '));
        args = [];
    };
    for (const t of tokens) {
        if (/[a-zA-Z]/.test(t)) {
            if (cmd) flush();
            if (!(t in AXES)) throw new Error(`${where}: relative or unknown path command "${t}"`);
            cmd = t;
            out.push(t);
        } else {
            args.push(Number(t));
        }
    }
    if (cmd) flush();
    return { d: out.join(' ').replace(/ ([A-Z])/g, '$1').replace(/([A-Z]) /g, '$1'), min, max };
}

// ---------------------------------------------------------------------------
// Emit
// ---------------------------------------------------------------------------

const errors = [];
const manifest = [];
fs.mkdirSync(OUT_DIR, { recursive: true });

for (const icon of icons) {
    const group = found.get(icon.name);
    if (!group) {
        errors.push(`${icon.name}: no element with id="${icon.name}" in the export`);
        continue;
    }
    const notes = [];
    const paths = [];
    for (const { tag, attrs: a } of group.tags) {
        if (tag !== 'path') {
            if (tag === 'rect' && a.fill === 'white' && /^translate/.test(a.transform ?? '')) continue; // a clip box
            errors.push(`${icon.name}: <${tag}> is not a path — flatten it in Figma`);
            continue;
        }
        const t = translate(a.d ?? '', icon.x, icon.y, icon.name);
        if (t.min < -TOLERANCE || t.max > SIZE + TOLERANCE) {
            errors.push(`${icon.name}: path runs ${fmt(t.min)}..${fmt(t.max)}, outside 0..${SIZE} — check its x/y`);
        }
        if (a.stroke) notes.push(`has a stroke (${a.stroke}) — dropped; the shape is filled like every other icon`);
        if (a.fill && !/^#333333$/i.test(a.fill)) notes.push(`fill ${a.fill} (expected #333333) — dropped; icons take the SLDS icon colour`);
        if (a.opacity || a['fill-opacity']) notes.push('has opacity — dropped');
        const rule = a['fill-rule'] === 'evenodd' ? ' fill-rule="evenodd" clip-rule="evenodd"' : '';
        paths.push(`  <path${rule} d="${t.d}"/>`);
    }
    if (!paths.length) {
        errors.push(`${icon.name}: no paths`);
        continue;
    }
    fs.writeFileSync(
        path.join(OUT_DIR, `${icon.slug}.svg`),
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE} ${SIZE}">\n${paths.join('\n')}\n</svg>\n`
    );
    manifest.push({ slug: icon.slug, name: icon.name, figmaNode: icon.node, ...(notes.length ? { notes: [...new Set(notes)] } : {}) });
}

if (errors.length) {
    console.error(`\n${errors.length} problem(s) — nothing should be trusted until these are fixed:\n  ${errors.join('\n  ')}`);
    process.exit(1);
}

const keep = new Set(manifest.map((m) => `${m.slug}.svg`));
const removed = fs.readdirSync(OUT_DIR).filter((f) => f.endsWith('.svg') && !keep.has(f));
for (const f of removed) fs.rmSync(path.join(OUT_DIR, f));

fs.writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);

console.log(`icons: ${manifest.length} written to ${path.relative(process.cwd(), OUT_DIR)}/`);
if (removed.length) console.log(`  removed (no longer in Figma): ${removed.join(', ')}`);
for (const m of manifest.filter((m) => m.notes)) console.log(`  ${m.name}: ${m.notes.join('; ')}`);
