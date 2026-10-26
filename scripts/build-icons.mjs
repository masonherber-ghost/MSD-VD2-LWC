/**
 * Builds the SEP icon library that stands in for Salesforce's icon libraries.
 *
 *   src/icons/svg/*.svg      the SEP icons, one per file (lwc-figma-icons-import writes them)
 *   src/icons/placeholder.svg  drawn for any name with no SEP icon
 *   src/icons/icon-map.json  Salesforce name -> SEP icon ("utility:search": "search")
 *        ↓
 *   src/icons/sepIcons/      GENERATED — one LWC template per icon, plus sepIcons.js
 *
 * WHY. `lightning-primitive-icon` renders an icon by importing the WHOLE library for its
 * category — `lightning/iconSvgTemplatesUtility` is 777 templates, Standard 646 — the
 * first time any icon of that category appears. Under `npm run dev` each template is
 * its own module, so a page made 5,000–10,700 requests and took 10–57s (measured
 * 2026-10-26); the build bundled the lot. lwr.config.json now resolves all ten of those
 * specifiers (five categories, each with an Rtl twin) to category.js, placed ABOVE the
 * lightning-base-components entry: the module resolver takes the first match.
 *
 * ONE LIBRARY, TEN NAMES. category.js only re-exports `sep/icons` (sepIcons.js). LWR names
 * a template module after the module importing it, so ten specifiers pointing straight at
 * sepIcons.js would load every template once per category a page uses — measured: job
 * detail, which draws utility and standard icons, made 3,528 requests that way.
 *
 * WHAT A NAME RESOLVES TO.
 *   - A name in icon-map.json      -> that SEP icon. Markup keeps the Salesforce name, so a
 *                                     component lifted into a real org draws Salesforce's icon.
 *   - utility:sep_<name>           -> that SEP icon, for every icon (utility:sep_match_partial).
 *                                     SEP-only: a real org has no such icon.
 *   - anything else                -> the placeholder. standard:*, custom:* and action:* are
 *                                     placeholders by decision (user, 2026-10-26); an unmapped
 *                                     utility:* name also logs a console warning, once.
 *
 * It also writes data/icons, which the Icons tab at /design-system renders.
 *
 *   npm run icons              write src/icons/sepIcons/, data/icons and the lwr.config.json entries
 *   npm run icons -- --check   exit 1 if either is out of date
 *
 * Run it by hand (the lwc-figma-icons-import skill does). It is deliberately NOT a
 * pre-step of `dev` or `build`: the output is committed, and both use what is there.
 *
 * Every run prints the coverage report: which names our code and the base components use,
 * and which of those fall back to the placeholder.
 */

import fs from 'node:fs';
import path from 'node:path';

const SRC = path.resolve('src/icons');
const SVG_DIR = path.join(SRC, 'svg');
const OUT = path.join(SRC, 'sepIcons');
const TEMPLATES = path.join(OUT, 'templates');
const MAP_FILE = path.join(SRC, 'icon-map.json');
const DATA_MODULE = 'src/modules/data/icons/icons.js';
const CONFIG = path.resolve('lwr.config.json');
const LBC = path.resolve('node_modules/lightning-base-components/src/lightning');

const CATEGORIES = ['utility', 'standard', 'action', 'doctype', 'custom'];
const cap = (s) => s[0].toUpperCase() + s.slice(1);
const SPECIFIERS = CATEGORIES.flatMap((c) => [`lightning/iconSvgTemplates${cap(c)}`, `lightning/iconSvgTemplates${cap(c)}Rtl`]);
const LIBRARY = { name: 'sep/icons', path: '$rootDir/src/icons/sepIcons/sepIcons.js' };
const CATEGORY_PATH = '$rootDir/src/icons/sepIcons/category.js';

// Prefixed so no slug can become a reserved word (`delete` is an icon).
const camel = (slug) => `icon-${slug}`.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());
const sepName = (slug) => `sep_${slug.replace(/-/g, '_')}`;

// ---------------------------------------------------------------------------
// Sources
// ---------------------------------------------------------------------------

function readIcons() {
    const slugs = fs.readdirSync(SVG_DIR).filter((f) => f.endsWith('.svg')).map((f) => f.slice(0, -4)).sort();
    return slugs.map((slug) => ({ slug, svg: fs.readFileSync(path.join(SVG_DIR, `${slug}.svg`), 'utf8') }));
}

function template(svg, file) {
    const paths = svg.match(/<path\b[^>]*\/>/g);
    if (!paths) throw new Error(`${file}: no <path/> elements`);
    if (/<(?!path\b|\/?svg\b)[a-z]/i.test(svg)) throw new Error(`${file}: only <path> is supported inside the <svg>`);
    if (paths.some((p) => /[{}]/.test(p))) throw new Error(`${file}: braces would be read as an LWC expression`);
    return [
        '<template>',
        '    <svg class={computedClass} focusable="false" data-key={name} aria-hidden="true" viewBox="0 0 24 24" part="icon">',
        ...paths.map((p) => `        ${p}`),
        '    </svg>',
        '</template>',
        ''
    ].join('\n');
}

const sfExists = (name) => {
    const [category, icon] = name.split(':');
    return fs.existsSync(path.join(LBC, `iconSvgTemplates${cap(category)}`, 'buildTemplates', category, `${icon}.html`));
};

// ---------------------------------------------------------------------------
// Generated output
// ---------------------------------------------------------------------------

function generate() {
    const icons = readIcons();
    const known = new Set(icons.map((i) => i.slug));
    const map = JSON.parse(fs.readFileSync(MAP_FILE, 'utf8'));

    const errors = [];
    const warnings = [];
    for (const [name, slug] of Object.entries(map)) {
        if (!/^(utility|standard|action|doctype|custom):[a-zA-Z]\w*$/.test(name)) errors.push(`map key "${name}" is not a Salesforce icon name`);
        else if (fs.existsSync(LBC) && !sfExists(name)) warnings.push(`map key "${name}" is not in the shipped icon set — check the spelling`);
        if (!known.has(slug)) errors.push(`"${name}" maps to "${slug}", which is not in src/icons/svg/`);
    }

    const files = new Map(); // path relative to OUT -> content
    files.set('templates/placeholder.html', template(fs.readFileSync(path.join(SRC, 'placeholder.svg'), 'utf8'), 'placeholder.svg'));
    for (const { slug, svg } of icons) files.set(`templates/${slug}.html`, template(svg, `svg/${slug}.svg`));

    const entries = [
        ...Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).map(([name, slug]) => [name.replace(':', '_'), camel(slug)]),
        ...icons.map(({ slug }) => [`utility_${sepName(slug)}`, camel(slug)])
    ];
    files.set('sepIcons.js', [
        '/* GENERATED by scripts/build-icons.mjs (`npm run icons`) — DO NOT EDIT.',
        ' * Stands in for every lightning/iconSvgTemplates<Category> library (lwr.config.json).',
        ' * Sources: src/icons/svg/*.svg, src/icons/placeholder.svg, src/icons/icon-map.json. */',
        '',
        "import placeholder from './templates/placeholder.html';",
        ...icons.map(({ slug }) => `import ${camel(slug)} from './templates/${slug}.html';`),
        '',
        '// `<category>_<name>`, the key lightning-primitive-icon looks up.',
        'const ICONS = {',
        ...entries.map(([key, id]) => `    ${key}: ${id},`),
        '};',
        '',
        '// Only icon keys fall back to the placeholder. Anything else must read through:',
        '// this object is returned from an async function, so the runtime probes its `then`,',
        '// and a template there makes it look like a promise.',
        'const ICON_KEY = /^(utility|standard|action|doctype|custom)_/;',
        'const warned = new Set();',
        '',
        'export default new Proxy(ICONS, {',
        '    get(target, key) {',
        "        if (typeof key !== 'string' || !ICON_KEY.test(key)) return target[key];",
        '        if (key in target) return target[key];',
        "        // standard/custom/action names are placeholders by decision; say so only for utility.",
        "        if (key.startsWith('utility_') && !warned.has(key)) {",
        '            warned.add(key);',
        "            console.warn(`[sep-icons] ${key.replace('_', ':')} has no SEP icon; drawing the placeholder. Map it in src/icons/icon-map.json.`);",
        '        }',
        '        return placeholder;',
        '    }',
        '});',
        ''
    ].join('\n'));
    files.set('category.js', [
        '/* GENERATED by scripts/build-icons.mjs (`npm run icons`) — DO NOT EDIT.',
        ' * Every lightning/iconSvgTemplates<Category> specifier resolves here. Re-exporting one',
        ' * module keeps its templates to one copy per page, whichever categories the page uses. */',
        '',
        "export { default } from 'sep/icons';",
        ''
    ].join('\n'));

    return { files, errors, warnings, map, icons };
}

/** The Icons tab's data: every icon with the names that draw it, and every placeholder in use. */
function dataModule({ map, icons }, cov) {
    const manifest = new Map(JSON.parse(fs.readFileSync(path.join(SRC, 'icons.json'), 'utf8')).map((m) => [m.slug, m]));
    const ICONS = icons.map(({ slug }) => ({
        slug,
        name: manifest.get(slug)?.name ?? slug,
        iconName: `utility:${sepName(slug)}`,
        figmaNode: manifest.get(slug)?.figmaNode ?? null,
        notes: manifest.get(slug)?.notes ?? [],
        drawnFor: Object.keys(map).filter((n) => map[n] === slug).sort()
    }));
    const component = (file) => file.split(path.sep).at(-2);
    const UNMAPPED = {
        ours: cov.unmappedOurs.sort().map((name) => ({ name, usedIn: [...cov.ours.get(name)].sort() })),
        base: cov.unmappedBase.sort().map((name) => ({ name, usedIn: [...new Set([...cov.base.get(name)].map(component))].sort() }))
    };
    return [
        '// GENERATED by scripts/build-icons.mjs (`npm run icons`) - do not edit.',
        '// Source: src/icons/icons.json, src/icons/icon-map.json, and the icon names in src/ and',
        '// lightning-base-components.',
        '',
        `export const ICONS = ${JSON.stringify(ICONS, null, 4)};`,
        '',
        `export const UNMAPPED = ${JSON.stringify(UNMAPPED, null, 4)};`,
        '',
        `export const MAPPED_COUNT = ${Object.keys(map).length};`,
        ''
    ].join('\n');
}

function configWithLibrary() {
    const text = fs.readFileSync(CONFIG, 'utf8');
    const config = JSON.parse(text);
    const modules = config.lwc.modules.filter((m) => m.name !== LIBRARY.name && !SPECIFIERS.includes(m.name));
    const at = modules.findIndex((m) => m.npm === 'lightning-base-components');
    if (at === -1) throw new Error('lwr.config.json has no lightning-base-components entry');
    modules.splice(at, 0, LIBRARY, ...SPECIFIERS.map((name) => ({ name, path: CATEGORY_PATH })));
    config.lwc.modules = modules;
    return { before: text, after: `${JSON.stringify(config, null, 4)}\n` };
}

// ---------------------------------------------------------------------------
// Coverage: which names the site and the base components actually ask for
// ---------------------------------------------------------------------------

function namesIn(dir, skipDir) {
    const found = new Map(); // name -> Set(file)
    const walk = (d) => {
        for (const e of fs.readdirSync(d, { withFileTypes: true })) {
            const p = path.join(d, e.name);
            if (e.isDirectory()) {
                if (!skipDir(e.name)) walk(p);
            } else if (/\.(html|js|ts)$/.test(e.name)) {
                for (const [n] of fs.readFileSync(p, 'utf8').matchAll(/\b(?:utility|standard|action|doctype|custom):[a-zA-Z]\w*/g)) {
                    if (!found.has(n)) found.set(n, new Set());
                    found.get(n).add(path.relative(process.cwd(), p));
                }
            }
        }
    };
    if (fs.existsSync(dir)) walk(dir);
    return found;
}

function coverage({ map, icons }) {
    const resolves = (n) => n in map || (n.startsWith('utility:sep_') && icons.some((i) => `utility:${sepName(i.slug)}` === n));
    // Generated data modules and the Icons tab itself name icons without drawing them.
    const generated = ['catalog', 'exampleRegistry', 'tokens', 'blueprints', 'compositions', 'icons', 'iconBrowser'];
    const ours = new Map([
        ...namesIn(path.resolve('src/modules'), (d) => generated.includes(d)),
        ...namesIn(path.resolve('src/examples'), () => false)
    ]);
    const base = namesIn(LBC, (d) => d.startsWith('iconSvgTemplates') || d.startsWith('__'));
    return {
        ours,
        base,
        unmappedOurs: [...ours.keys()].filter((n) => !resolves(n)),
        unmappedBase: [...base.keys()].filter((n) => n.startsWith('utility:') && !resolves(n))
    };
}

function report({ map, icons }, cov) {
    const lines = [`icons: ${icons.length} SEP icons, ${Object.keys(map).length} Salesforce names mapped`];
    const list = (label, names) => names.length && lines.push(`  ${label} (${names.length}): ${[...names].sort().join(' ')}`);
    list('our code, utility:* drawing the PLACEHOLDER', cov.unmappedOurs.filter((n) => n.startsWith('utility:')));
    list('our code, other categories (placeholder by decision)', cov.unmappedOurs.filter((n) => !n.startsWith('utility:')));
    list('base components, utility:* drawing the placeholder', cov.unmappedBase);
    return lines.join('\n');
}

// ---------------------------------------------------------------------------

const result = generate();
for (const w of result.warnings) console.warn(`icons: warning — ${w}`);
if (result.errors.length) {
    console.error(`icons: ${result.errors.length} error(s):\n  ${result.errors.join('\n  ')}`);
    process.exit(1);
}

const cov = coverage(result);
const config = configWithLibrary();
// Every generated file, by path from the repo root.
const outputs = new Map([...[...result.files].map(([f, c]) => [path.join(OUT, f), c]), [path.resolve(DATA_MODULE), dataModule(result, cov)]]);
const stale = [...outputs].filter(([p, c]) => !fs.existsSync(p) || fs.readFileSync(p, 'utf8') !== c);
const extra = fs.existsSync(TEMPLATES)
    ? fs.readdirSync(TEMPLATES).filter((f) => !result.files.has(`templates/${f}`))
    : [];

if (process.argv.includes('--check')) {
    if (stale.length || extra.length || config.before !== config.after) {
        console.error('icons: src/icons/sepIcons/, data/icons or lwr.config.json is out of date — run `npm run icons`.');
        process.exit(1);
    }
    console.log('icons: up to date.');
} else {
    for (const [p, c] of stale) {
        fs.mkdirSync(path.dirname(p), { recursive: true });
        fs.writeFileSync(p, c);
    }
    for (const f of extra) fs.rmSync(path.join(TEMPLATES, f));
    if (config.before !== config.after) fs.writeFileSync(CONFIG, config.after);
    const changed = stale.length + extra.length + (config.before !== config.after ? 1 : 0);
    console.log(changed ? `icons: wrote ${stale.length} file(s), removed ${extra.length}${config.before !== config.after ? ', updated lwr.config.json' : ''}` : 'icons: unchanged');
}
console.log(report(result, cov));
