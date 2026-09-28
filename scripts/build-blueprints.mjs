/**
 * Generates src/modules/data/blueprints/blueprints.js from the INSTALLED SLDS
 * stylesheet package, cross-referenced against this project's own source.
 *
 * SLDS 2 ships its blueprints as CSS only -- `dist/components/<name>/<name>.css`
 * and nothing else. There is no markup, no example and no manifest, so the only
 * honest list of "what blueprints exist and what classes may I write" is one
 * parsed off the CSS that is actually installed. Re-run after upgrading
 * @salesforce-ux/design-system-2:
 *
 *   npm run blueprints
 *
 * COVERAGE is computed, not guessed. The question that matters -- "do I have to
 * write this blueprint by hand, or does a component already render it?" --
 * cannot be answered by comparing names: only 30 of the 89 blueprints have a
 * tag of the same name, and matching the rest by resemblance produces confident
 * nonsense (dataTable -> lightning-tab).
 *
 * So coverage is read off what the components actually EMIT. Every folder in
 * lightning-base-components is scanned for the SLDS classes its markup writes;
 * a blueprint is covered when some component writes its main class. Private
 * components count through their public consumers, resolved by following the
 * import graph upward -- `slds-tabs_default` is written by `tabBar`, which is
 * private, and reached only from `lightning-tabset`, which is not.
 *
 * An exact tag match is taken as coverage too, for the handful a component
 * renders through different markup than the blueprint (`lightning-tree-grid`
 * builds on the datatable, `lightning-alert` on the modal).
 */

import fs from 'node:fs';
import path from 'node:path';

const PKG = 'node_modules/@salesforce-ux/design-system-2';
const COMPONENTS_DIR = path.resolve(PKG, 'dist/components');
const BUNDLED_CSS = path.resolve(PKG, 'dist/css/bundled/slds2.lightning-blue.css');
const CATALOG = path.resolve('src/modules/data/catalog/catalog.js');
const OUT = path.resolve('src/modules/data/blueprints/blueprints.js');

const version = JSON.parse(fs.readFileSync(path.resolve(PKG, 'package.json'), 'utf8')).version;

/** Every `lightning-*` tag that actually ships, for the exact-match column. */
const shippedTags = new Set(
    [...fs.readFileSync(CATALOG, 'utf8').matchAll(/"tag": "([^"]*)"/g)].map((m) => m[1])
);

/**
 * Every class the BUNDLED stylesheet declares -- the one `main.njk` actually
 * loads. A blueprint's own CSS file shipping a class is not the same claim as
 * that class being in the build we serve, and "check the class exists in the
 * shipped stylesheet" is the rule this data is here to answer.
 */
const bundledClasses = new Set(
    [...fs.readFileSync(BUNDLED_CSS, 'utf8').matchAll(/\.(slds-[a-z0-9]+(?:[-_]{1,2}[a-z0-9]+)*)/g)]
        .map((m) => m[1])
);

const kebab = (s) => s.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
const isPublic = (folder) => shippedTags.has(`lightning-${kebab(folder)}`);

// -- What does each shipped component actually render? ----------------------

const LBC = path.resolve('node_modules/lightning-base-components/src/lightning');

/** class -> the component folders whose markup writes it. */
const emitters = new Map();
/** folder -> the folders that use it, public or not. */
const consumers = new Map();

for (const entry of fs.readdirSync(LBC, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const dir = path.join(LBC, entry.name);
    let text = '';
    for (const file of fs.readdirSync(dir)) {
        if (/\.(html|js)$/.test(file)) text += fs.readFileSync(path.join(dir, file), 'utf8');
    }
    for (const m of text.matchAll(/slds-[a-z0-9]+(?:[-_]{1,2}[a-z0-9]+)*/g)) {
        if (!emitters.has(m[0])) emitters.set(m[0], new Set());
        emitters.get(m[0]).add(entry.name);
    }
    // Both ways a component reaches another: the JS import and the tag.
    for (const m of text.matchAll(/["']lightning\/([a-zA-Z0-9]+)["']/g)) {
        if (!consumers.has(m[1])) consumers.set(m[1], new Set());
        consumers.get(m[1]).add(entry.name);
    }
    for (const m of text.matchAll(/<lightning-([a-z-]+)/g)) {
        const camel = m[1].replace(/-([a-z])/g, (_, c) => c.toUpperCase());
        if (!consumers.has(camel)) consumers.set(camel, new Set());
        consumers.get(camel).add(entry.name);
    }
}

/** Walk up from a folder to the public components that can reach it. */
function publicOwners(folder, seen = new Set()) {
    if (seen.has(folder)) return [];
    seen.add(folder);
    if (isPublic(folder)) return [folder];
    return [...(consumers.get(folder) ?? [])].flatMap((p) => publicOwners(p, seen));
}

// -- Where do WE use SLDS classes? ------------------------------------------
// One pass over our source builds class -> files, so the per-blueprint lookup
// below is a map read rather than 89 greps.

const SOURCE_ROOTS = ['src/modules', 'src/assets/css', 'src/layouts'];
const usage = new Map();

function walk(dir, hit) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full, hit);
        else if (/\.(html|css|ts|js|njk)$/.test(entry.name)) hit(full);
    }
}

for (const root of SOURCE_ROOTS) {
    if (!fs.existsSync(root)) continue;
    walk(root, (file) => {
        const text = fs.readFileSync(file, 'utf8');
        // A generated data module quotes SLDS class names as DATA, not as
        // markup -- including this script's OWN output, which on a second run
        // would mark every blueprint as used by the project. Detected by the
        // banner rather than by path, so a new generator cannot reintroduce it.
        if (text.startsWith('// GENERATED by')) return;
        for (const m of text.matchAll(/slds-[a-z0-9]+(?:[-_]{1,2}[a-z0-9]+)*/g)) {
            if (!usage.has(m[0])) usage.set(m[0], new Set());
            usage.get(m[0]).add(file);
        }
    });
}

// -- One blueprint per directory --------------------------------------------

/**
 * The main class of a blueprint, INFERRED: classes are grouped by their stem --
 * the part before the first `__` element or `_` modifier -- and the largest
 * group wins.
 *
 * Inferred rather than derived from the directory name because the two disagree
 * often enough to matter: `scopedNotifications` ships `.slds-scoped-notification`
 * and `activityTimeline` ships `.slds-timeline__*`. It is a heuristic and the
 * page says so; `alert` resolves to `slds-alert` where the blueprint's real root
 * is `slds-notify slds-notify_alert`, because SLDS 2 declares no bare
 * `.slds-notify` rule for it to be counted on.
 */
function stemOf(cls) {
    const el = cls.indexOf('__');
    const mod = cls.indexOf('_');
    const cut = el !== -1 ? el : mod;
    return cut > 0 ? cls.slice(0, cut) : cls;
}

function rootClass(classes) {
    const counts = new Map();
    for (const c of classes) {
        const stem = stemOf(c);
        counts.set(stem, (counts.get(stem) ?? 0) + 1);
    }
    return [...counts.entries()].sort(
        (a, b) => b[1] - a[1] || a[0].length - b[0].length
    )[0][0];
}

const blueprints = fs
    .readdirSync(COMPONENTS_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort()
    .map((name) => {
        const dir = path.join(COMPONENTS_DIR, name);
        const files = fs.readdirSync(dir);
        const main = files.find((f) => f.endsWith('.css') && !f.includes('.deprecated.'));
        const css = main ? fs.readFileSync(path.join(dir, main), 'utf8') : '';

        // Classes as DECLARED -- only those appearing in a selector position,
        // so a class merely named in a comment is not reported as shippable.
        const declared = [
            ...new Set([...css.matchAll(/\.(slds-[a-z0-9]+(?:[-_]{1,2}[a-z0-9]+)*)/g)].map((m) => m[1]))
        ].sort();

        const root = declared.length ? rootClass(declared) : null;
        const own = root ? declared.filter((c) => stemOf(c) === root) : [];
        const borrowed = root ? declared.filter((c) => stemOf(c) !== root) : declared;

        const hooks = [
            ...new Set([...css.matchAll(/--slds-[sc]-[a-z0-9-]+/g)].map((m) => m[0]))
        ].sort();
        const privateHooks = [
            ...new Set([...css.matchAll(/--_slds-[a-z0-9-]+/g)].map((m) => m[0]))
        ].sort();

        // Own classes only. Counting the borrowed ones would mark the timeline
        // blueprint as used by every screen that happens to write `slds-media`.
        const usedIn = [
            ...new Set(own.flatMap((c) => [...(usage.get(c) ?? [])]))
        ].sort();

        // A class in the blueprint's own file but NOT in the bundle we load is
        // a class you cannot write on this build, whatever the package says.
        const missing = own.filter((c) => !bundledClasses.has(c));

        const tag = `lightning-${kebab(name)}`;
        const hasOwnTag = shippedTags.has(tag);

        const coveredBy = [
            ...new Set([
                ...(root ? [...(emitters.get(root) ?? [])] : []).flatMap((f) =>
                    publicOwners(f)
                ),
                ...(hasOwnTag ? [name] : [])
            ])
        ]
            .map((f) => `lightning-${kebab(f)}`)
            .sort();

        return {
            name,
            root,
            tag: hasOwnTag ? tag : '',
            coveredBy,
            classes: own,
            borrowed,
            hooks,
            privateHooks,
            usedIn,
            missing,
            bundled: own.length > 0 && missing.length === 0,
            deprecated: files.some((f) => f.includes('.deprecated.')),
            bytes: css.length
        };
    });

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(
    OUT,
    `// GENERATED by scripts/build-blueprints.mjs - do not edit.
// Source: @salesforce-ux/design-system-2@${version} (dist/components/*/*.css)
//         cross-referenced against src/modules, src/assets/css, src/layouts.

export const SLDS_VERSION = ${JSON.stringify(version)};

export const BLUEPRINTS = ${JSON.stringify(blueprints, null, 4)};
`
);

const used = blueprints.filter((b) => b.usedIn.length).length;
const gaps = blueprints.reduce((n, b) => n + b.missing.length, 0);
const uncovered = blueprints.filter((b) => !b.coveredBy.length).length;
const classCount = blueprints.reduce((n, b) => n + b.classes.length, 0);
console.log(
    `blueprints: ${blueprints.length} from SLDS ${version}, ${classCount} classes, ` +
        `${uncovered} not rendered by any shipped component, ${used} used in this project, ` +
        `${gaps} classes absent from the bundled stylesheet`
);
console.log(`wrote ${path.relative(process.cwd(), OUT)}`);
