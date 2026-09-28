/**
 * Generates src/modules/data/compositions/compositions.js from THIS PROJECT's
 * own source: every component in src/modules/ui/, and every `sep-` class in
 * src/assets/css/site.css.
 *
 *   npm run compositions
 *
 * Why this exists. The rules draw a line between composing what Salesforce
 * ships and reproducing it, and between setting a published styling hook and
 * fighting the stylesheet. Both are invisible in a screenshot and both decide
 * whether a component survives a package upgrade. So the page this feeds does
 * not ask "what does it look like" -- it asks, for each wrapper we wrote:
 *
 *   - what shipped things does it compose?
 *   - how much CSS did we have to write, and what does that CSS touch?
 *   - does it reach for anything the rules put off limits?
 *
 * The prose for each wrapper is its OWN leading docblock, read out of the
 * source file. That keeps the explanation next to the code it explains, so it
 * cannot rot into a second, disagreeing description.
 */

import fs from 'node:fs';
import path from 'node:path';

const UI_DIR = path.resolve('src/modules/ui');
const SITE_CSS = path.resolve('src/assets/css/site.css');
const SLDS_COMPONENTS = path.resolve(
    'node_modules/@salesforce-ux/design-system-2/dist/components'
);
const OUT = path.resolve('src/modules/data/compositions/compositions.js');

// -- Which blueprint declares a given class? --------------------------------
// Built by scanning the shipped blueprint CSS, so a template's classes can be
// attributed without depending on the other generator having run first.

const classOwner = new Map();
{
    /** Same stem rule the blueprint generator uses: `slds-page-header__row`
     *  belongs to `slds-page-header`. */
    const stemOf = (cls) => {
        const el = cls.indexOf('__');
        const mod = cls.indexOf('_');
        const cut = el !== -1 ? el : mod;
        return cut > 0 ? cls.slice(0, cut) : cls;
    };

    const declaredBy = new Map(); // class -> [blueprint]
    const roots = new Map(); // blueprint -> its main class

    for (const entry of fs.readdirSync(SLDS_COMPONENTS, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        const dir = path.join(SLDS_COMPONENTS, entry.name);
        const classes = [];
        for (const file of fs.readdirSync(dir)) {
            if (!file.endsWith('.css') || file.includes('.deprecated.')) continue;
            const css = fs.readFileSync(path.join(dir, file), 'utf8');
            for (const m of css.matchAll(/\.(slds-[a-z0-9]+(?:[-_]{1,2}[a-z0-9]+)*)/g)) {
                classes.push(m[1]);
                if (!declaredBy.has(m[1])) declaredBy.set(m[1], []);
                if (!declaredBy.get(m[1]).includes(entry.name)) {
                    declaredBy.get(m[1]).push(entry.name);
                }
            }
        }
        const counts = new Map();
        for (const c of classes) counts.set(stemOf(c), (counts.get(stemOf(c)) ?? 0) + 1);
        const root = [...counts.entries()].sort(
            (a, b) => b[1] - a[1] || a[0].length - b[0].length
        )[0]?.[0];
        if (root) roots.set(entry.name, root);
    }

    // A class is declared by several blueprints far more often than not --
    // `slds-form-element__label` appears in six. Attribute it to the one whose
    // OWN main class it is built on, and only fall back to first-seen when no
    // blueprint claims the stem.
    for (const [cls, owners] of declaredBy) {
        const stem = stemOf(cls);
        const owner = owners.find((o) => roots.get(o) === stem);
        // No fallback. A class no blueprint claims by stem -- `slds-grid`,
        // `slds-media`, `slds-text-body_small` -- is shared furniture declared
        // in a dozen files, and naming one of them as its home is a guess
        // dressed up as a fact.
        if (owner) classOwner.set(cls, owner);
    }
}

const kebab = (s) => s.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
const uniq = (a) => [...new Set(a)].sort();

/** The leading `/** ... *\/` block of a source file, as plain lines. */
function docblock(source) {
    const m = source.match(/\/\*\*([\s\S]*?)\*\//);
    if (!m) return '';
    return m[1]
        .split('\n')
        .map((l) => l.replace(/^\s*\*/, '').trim())
        .join('\n')
        .trim();
}

/**
 * What a stylesheet actually does, in the terms the rules care about. A line
 * count says nothing; `::part()` versus a raw hex says everything.
 */
function analyseCss(css) {
    const strip = css.replace(/\/\*[\s\S]*?\*\//g, '');
    return {
        lines: css.split('\n').filter((l) => l.trim()).length,
        text: css.trimEnd(),
        selectors: uniq(
            [...strip.matchAll(/(^|\})\s*([^{}@]+)\{/g)]
                .map((m) => m[2].trim().replace(/\s+/g, ' '))
                .filter(Boolean)
        ),
        // Tier 4/5: the published API. Using these is the sanctioned path.
        hooks: uniq([...strip.matchAll(/--slds-[sc]-[a-z0-9-]+/g)].map((m) => m[0])),
        tokens: uniq([...strip.matchAll(/--slds-g-[a-z0-9-]+/g)].map((m) => m[0])),
        siteTokens: uniq([...strip.matchAll(/--site-[a-z0-9-]+/g)].map((m) => m[0])),
        // Tier 6: allowed, but only for parts a component really declares, and
        // it is the most upgrade-sensitive thing on the sanctioned list.
        parts: uniq([...strip.matchAll(/::part\(\s*([a-z0-9-]+)\s*\)/g)].map((m) => m[1])),
        // Off limits. Should always be empty; the page shows it if it is not.
        privateHooks: uniq([...strip.matchAll(/--_slds-[a-z0-9-]+/g)].map((m) => m[0])),
        // Not forbidden, but every one is a value that will not follow a theme.
        rawColors: uniq(
            [...strip.matchAll(/#[0-9a-fA-F]{3,8}\b/g)].map((m) => m[0])
        ).filter((c) => !strip.includes(`, ${c})`) && !strip.includes(`,${c})`)),
        important: (strip.match(/!important/g) ?? []).length
    };
}

const components = fs
    .readdirSync(UI_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort()
    .map((name) => {
        const dir = path.join(UI_DIR, name);
        const files = fs.readdirSync(dir);
        const read = (ext) => {
            const f = files.find((x) => x === `${name}${ext}`);
            return f ? fs.readFileSync(path.join(dir, f), 'utf8') : '';
        };

        const html = read('.html');
        const script = read('.ts') || read('.js');
        const css = read('.css');

        const classes = uniq(
            [...html.matchAll(/slds-[a-z0-9]+(?:[-_]{1,2}[a-z0-9]+)*/g)].map((m) => m[0])
        );

        return {
            name,
            tag: `ui-${kebab(name)}`,
            doc: docblock(script),
            // Tier 1. What ships, used as it ships.
            composes: uniq([...html.matchAll(/<(lightning-[a-z-]+)/g)].map((m) => m[1])),
            // Other wrappers of ours, so the page shows composition depth.
            wraps: uniq([...html.matchAll(/<(ui-[a-z-]+)/g)].map((m) => m[1])),
            // Tier 2, attributed back to the blueprint that declares each class.
            blueprints: uniq(
                classes.map((c) => classOwner.get(c)).filter(Boolean)
            ),
            sepClasses: uniq([...html.matchAll(/sep-[a-z0-9-]+(?:_[a-z0-9-]+)?/g)].map((m) => m[0])),
            hasCss: Boolean(css),
            css: css ? analyseCss(css) : null,
            htmlLines: html.split('\n').filter((l) => l.trim()).length
        };
    });

// -- The site-level half: our opt-in classes over shipped blueprints ---------

const siteCss = fs.existsSync(SITE_CSS) ? fs.readFileSync(SITE_CSS, 'utf8') : '';

/** Each `sep-` rule block, with the comment above it as its explanation. */
const sepClasses = [];
// The comment is only taken when it sits directly above the selector, and the
// comment body is matched so that it cannot contain `*\/`. Without both, the
// lazy match walked backwards and swallowed every comment between the previous
// rule and this one.
for (const m of siteCss.matchAll(
    /(?:\/\*((?:[^*]|\*(?!\/))*)\*\/[ \t]*\n[ \t]*)?(\.sep-[a-z0-9-]+(?:_[a-z0-9-]+)?[^{}]*)\{([^}]*)\}/g
)) {
    const [, comment, selector, body] = m;
    const name = selector.match(/\.(sep-[a-z0-9-]+(?:_[a-z0-9-]+)?)/)?.[1];
    if (!name) continue;
    const existing = sepClasses.find((s) => s.name === name);
    const rule = { selector: selector.trim().replace(/\s+/g, ' '), body: body.trim() };
    if (existing) {
        existing.rules.push(rule);
        continue;
    }
    sepClasses.push({
        name,
        note: (comment ?? '')
            .split('\n')
            .map((l) => l.replace(/^\s*\*?/, '').trim())
            .filter((l) => l && !/^[=-]+$/.test(l))
            .join(' '),
        rules: [rule],
        usedIn: []
    });
}

// Where each one is written, so an unused class is visible as unused.
function walk(dir, hit) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full, hit);
        else if (/\.(html|ts|js)$/.test(entry.name)) hit(full);
    }
}
walk(path.resolve('src/modules'), (file) => {
    const text = fs.readFileSync(file, 'utf8');
    if (text.startsWith('// GENERATED by')) return;
    const rel = path.relative(process.cwd(), file);
    for (const s of sepClasses) {
        if (new RegExp(`${s.name}(?![a-z0-9-])`).test(text)) s.usedIn.push(rel);
    }
});

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(
    OUT,
    `// GENERATED by scripts/build-compositions.mjs - do not edit.
// Source: src/modules/ui/*, src/assets/css/site.css.

export const COMPOSITIONS = ${JSON.stringify(components, null, 4)};

export const SEP_CLASSES = ${JSON.stringify(sepClasses, null, 4)};
`
);

const styled = components.filter((c) => c.hasCss).length;
const cssLines = components.reduce((n, c) => n + (c.css?.lines ?? 0), 0);
console.log(
    `compositions: ${components.length} wrappers, ${styled} with a stylesheet ` +
        `(${cssLines} lines total), ${components.length - styled} with none; ` +
        `${sepClasses.length} sep- classes`
);
console.log(`wrote ${path.relative(process.cwd(), OUT)}`);
