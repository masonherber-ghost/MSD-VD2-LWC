/**
 * Assess this project's components against the customisation tiers.
 *
 *   node .claude/skills/assess-tiers/assess-tiers.mjs          # markdown
 *   node .claude/skills/assess-tiers/assess-tiers.mjs --json   # raw data
 *
 * READ-ONLY. Run from the repo root. The tiers are defined in
 * `_docs/customisation-tiers.md`; this script measures, the skill's SKILL.md
 * says how to judge what it measures.
 *
 * What it reads:
 *   - the generated inventories (`src/modules/data/{catalog,blueprints,tokens}`)
 *     — run `npm run compositions` / `npm run tokens` first if they are stale;
 *   - every component in `src/modules/example/*` (pages) and `src/modules/ui/*`
 *     (wrappers): template, script, stylesheet;
 *   - the three global stylesheets in `src/assets/css/`.
 *
 * How a component is tiered — the HIGHEST tier anything in it reaches:
 *   T4   script owns behaviour: imports `data/api` / `data/session`, assigns to
 *        `this.*` (state), runs lifecycle callbacks, or touches window/navigator
 *   T3B  stylesheet sets real properties, uses ::part, or selects elements
 *   T3A  stylesheet only sets/reads custom properties (hooks and tokens)
 *   T2B  no stylesheet, presentational script (`@api`, getters, re-dispatch)
 * Out-of-bounds findings are reported separately as flags; they do not change
 * the tier, because a component can be T2B and still set a private hook.
 *
 * Heuristics, not a parser: it reads source text with regular expressions, so
 * treat a surprising result as a prompt to read the file, not as a verdict.
 */

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const asJson = process.argv.includes('--json');

const read = (p) => (fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '');
const load = async (rel) => import(pathToFileURL(path.join(ROOT, rel)).href);
const uniq = (xs) => [...new Set(xs)];
const stripCssComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '');
const stripHtmlComments = (s) => s.replace(/<!--[\s\S]*?-->/g, '');
const stripJsComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

// -- Inventories (what Salesforce makes available) ---------------------------

const { COMPONENTS } = await load('src/modules/data/catalog/catalog.js');
const { BLUEPRINTS } = await load('src/modules/data/blueprints/blueprints.js');
const tokens = await load('src/modules/data/tokens/tokens.js');
const routes = JSON.parse(read(path.join(ROOT, 'routes.json'))).routes ?? [];

const countFamily = (families) =>
    families.reduce((n, f) => n + (f.tokens?.length ?? f.hooks?.length ?? 0), 0);

const inventory = {
    baseComponents: COMPONENTS.length,
    blueprints: BLUEPRINTS.length,
    blueprintsUncovered: BLUEPRINTS.filter((b) => !b.coveredBy?.length).length,
    blueprintsUsed: BLUEPRINTS.filter((b) => b.usedIn?.length).length,
    globalHooks: countFamily(tokens.GLOBAL_FAMILIES),
    componentHooks: countFamily(tokens.COMPONENT_HOOKS),
    privateHooks: tokens.PRIVATE_HOOKS.length,
    projectTokens: tokens.PROJECT_TOKENS.length,
    routes: routes.length
};

// SLDS utility classes, by family — read from the stylesheet we actually load,
// because the blueprint data does not catalogue them. Tier 2 (see
// `_docs/customisation-tiers.md` § Tier 2 — Utility classes).
const UTILITY_FAMILIES = {
    spacing: /^slds-(m|p)-/,
    text: /^slds-text-/,
    grid: /^slds-(grid|col|wrap|nowrap|gutters|grow|shrink|no-flex|has-flexi|order_)/,
    sizing: /^slds-(x-small-|small-|medium-|large-|max-[a-z]+-)?size_/,
    visibility: /^slds-(show|hide|hidden|show-only|max-[a-z]+-hide)/,
    alignment: /^slds-(align|float|text-align|clearfix)/,
    position: /^slds-is-(relative|absolute|fixed|static)/,
    truncation: /^slds-(truncate|line-clamp|hyphenate|text-longform)/,
    'borders & theme': /^slds-(border_|theme_|box)/,
    scrolling: /^slds-scrollable/,
    assistive: /^slds-assistive-text/
};
const utilityFamilyOf = (c) => Object.keys(UTILITY_FAMILIES).find((k) => UTILITY_FAMILIES[k].test(c));
const SLDS_CSS = read(path.join(ROOT, 'node_modules/@salesforce-ux/design-system-2/dist/css/bundled/slds2.cosmos.css'));
const shippedClasses = new Set(
    [...SLDS_CSS.matchAll(/\.(slds-[a-z0-9_-]+)/g)].map((m) => m[1]).filter((c) => !c.includes('--'))
);
const utilitiesAvailable = {};
for (const c of shippedClasses) {
    const f = utilityFamilyOf(c);
    if (f) (utilitiesAvailable[f] ??= new Set()).add(c);
}

// Blueprint class -> blueprint name, for attributing hand-written markup.
// `utilities` is excluded: spacing/text utilities are not a blueprint someone
// "wrote by hand" in any meaningful sense.
const classOwner = new Map();
for (const b of BLUEPRINTS) {
    if (b.name === 'utilities') continue;
    for (const c of b.classes ?? []) if (!classOwner.has(c)) classOwner.set(c, b.name);
}

// -- CSS analysis (shared by components and global sheets) -------------------

function analyseCss(raw) {
    const css = stripCssComments(raw);
    const sets = (re) => uniq([...css.matchAll(re)].map((m) => m[1]));
    const decl = (prefix) => sets(new RegExp(`(${prefix}[a-z0-9-]*)\\s*:`, 'g'));
    const reads = (prefix) => sets(new RegExp(`var\\(\\s*(${prefix}[a-z0-9-]*)`, 'g'));

    const selectors = [...css.matchAll(/([^{}]+)\{/g)]
        .map((m) => m[1].trim())
        .filter((s) => s && !s.startsWith('@'))
        .flatMap((s) => s.split(',').map((x) => x.trim()));

    // Real (non-custom) property declarations.
    const realProps = [...css.matchAll(/(?:^|[;{\s])([a-z-]+)\s*:(?!:)/g)]
        .map((m) => m[1])
        .filter((p) => !p.startsWith('--'));

    return {
        lines: raw.split('\n').filter((l) => l.trim()).length,
        setsGlobal: decl('--slds-g-'),
        setsComponent: decl('--slds-c-'),
        setsShared: decl('--slds-s-'),
        setsPrivate: decl('--_slds-'),
        setsDxp: decl('--dxp-'),
        setsSite: decl('--sep-'),
        setsLwc: decl('--lwc-'),
        readsShared: reads('--slds-s-'),
        readsPrivate: reads('--_slds-'),
        readsSite: reads('--sep-'),
        readsDxp: reads('--dxp-'),
        parts: (css.match(/::part\(/g) ?? []).length,
        important: (css.match(/!important/g) ?? []).length,
        // A hex as a var() FALLBACK — `var(--token, #fff)` — is allowed by the
        // rules ("only where a token may legitimately be absent"); a bare hex
        // value is not. Count them apart.
        hexFallback: (css.match(/,\s*#[0-9a-fA-F]{3,8}\b\s*\)/g) ?? []).length,
        hex: uniq(css.replace(/,\s*#[0-9a-fA-F]{3,8}\b\s*\)/g, ')').match(/#[0-9a-fA-F]{3,8}\b/g) ?? []),
        bareSldsSelectors: selectors.filter((s) => /^\.slds-/.test(s)),
        scopedSldsSelectors: selectors.filter((s) => !/^\.slds-/.test(s) && /\.slds-/.test(s)),
        elementSelectors: selectors.filter((s) => /^(lightning-|h[1-6]\b|body|html|[a-z]+\s*$)/.test(s)),
        realProps: realProps.length
    };
}

// -- Component analysis ------------------------------------------------------

function analyseComponent(kind, dir) {
    const name = path.basename(dir);
    const html = stripHtmlComments(read(path.join(dir, `${name}.html`)));
    const js = stripJsComments(read(path.join(dir, `${name}.ts`)) || read(path.join(dir, `${name}.js`)));
    const cssRaw = read(path.join(dir, `${name}.css`));
    const css = cssRaw ? analyseCss(cssRaw) : null;

    const classes = [...html.matchAll(/class="([^"{]*)"/g)].flatMap((m) => m[1].split(/\s+/)).filter(Boolean);
    const blueprints = uniq(classes.map((c) => classOwner.get(c)).filter(Boolean)).sort();

    const script = {
        api: (js.match(/@api\b/g) ?? []).length,
        data: /from\s+'data\/(api|session)'/.test(js),
        state: (js.match(/\bthis\.\w+\s*=(?!=)/g) ?? []).length,
        lifecycle: /\b(connectedCallback|disconnectedCallback|renderedCallback)\s*\(/.test(js),
        browser: /\b(window|navigator|document)\./.test(js),
        dispatch: (js.match(/dispatchEvent\(/g) ?? []).length
    };

    let tier = 'T2B';
    if (css) tier = css.realProps || css.parts || css.elementSelectors.length ? 'T3B' : 'T3A';
    if (script.data || script.state || script.lifecycle || script.browser) tier = 'T4';

    const flags = [];
    if (css) {
        if (css.setsShared.length || css.readsShared.length)
            flags.push(`private --slds-s-* (${uniq([...css.setsShared, ...css.readsShared]).length})`);
        if (css.setsPrivate.length || css.readsPrivate.length) flags.push('private --_slds-*');
        if (css.bareSldsSelectors.length) flags.push(`bare .slds-* override (${css.bareSldsSelectors.length})`);
        if (css.scopedSldsSelectors.length) flags.push(`SLDS class in selector (${css.scopedSldsSelectors.length})`);
        if (css.important) flags.push(`!important (${css.important})`);
        if (css.hex.length) flags.push(`raw hex (${css.hex.length})`);
        if (css.setsLwc.length) flags.push('--lwc-* token');
        if (css.parts) flags.push(`::part (${css.parts}) — on the line`);
    }

    return {
        kind,
        name,
        tier,
        lightning: uniq((html.match(/<lightning-[a-z-]+/g) ?? []).map((t) => t.slice(1))).sort(),
        ui: uniq((html.match(/<ui-[a-z-]+/g) ?? []).map((t) => t.slice(1))).sort(),
        blueprints,
        // Every use, not distinct — the per-family table counts both.
        utilities: classes.filter((c) => shippedClasses.has(c) && utilityFamilyOf(c)),
        slots: (html.match(/\bslot="/g) ?? []).length,
        htmlLines: html.split('\n').filter((l) => l.trim()).length,
        script,
        css,
        flags
    };
}

const componentDirs = (ns) => {
    const base = path.join(ROOT, 'src/modules', ns);
    return fs
        .readdirSync(base, { withFileTypes: true })
        .filter((e) => e.isDirectory())
        .map((e) => path.join(base, e.name));
};

const modules = [
    ...componentDirs('example').map((d) => analyseComponent('page', d)),
    ...componentDirs('ui').map((d) => analyseComponent('wrapper', d))
];

const globals = ['fonts.css', 'design-tokens.css', 'site.css'].map((f) => {
    const raw = read(path.join(ROOT, 'src/assets/css', f));
    return { file: f, ...analyseCss(raw) };
});

// -- Project-wide usage ------------------------------------------------------

const used = {
    lightningTags: uniq(modules.flatMap((m) => m.lightning)).length,
    blueprints: uniq(modules.flatMap((m) => m.blueprints)).length,
    componentHooksSet: uniq([...modules.flatMap((m) => m.css?.setsComponent ?? []), ...globals.flatMap((g) => g.setsComponent)]).length,
    globalHooksSet: uniq([...modules.flatMap((m) => m.css?.setsGlobal ?? []), ...globals.flatMap((g) => g.setsGlobal)]).length,
    sharedHooksTouched: uniq([
        ...modules.flatMap((m) => [...(m.css?.setsShared ?? []), ...(m.css?.readsShared ?? [])]),
        ...globals.flatMap((g) => [...g.setsShared, ...g.readsShared])
    ]).length,
    dxpHooksSet: uniq(globals.flatMap((g) => g.setsDxp)).length,
    parts: modules.reduce((n, m) => n + (m.css?.parts ?? 0), 0) + globals.reduce((n, g) => n + g.parts, 0),
    sepClasses: uniq((read(path.join(ROOT, 'src/assets/css/site.css')).match(/\.sep-[a-z0-9_-]+/g) ?? []).map((c) => c.replace(/_.*$/, (x) => x))).length
};

const utilityUses = modules.flatMap((m) => m.utilities);
const utilities = Object.keys(UTILITY_FAMILIES).map((family) => {
    const uses = utilityUses.filter((c) => utilityFamilyOf(c) === family);
    return {
        family,
        available: utilitiesAvailable[family]?.size ?? 0,
        used: uniq(uses).length,
        uses: uses.length
    };
});
used.utilityClasses = uniq(utilityUses).length;
used.utilityUses = utilityUses.length;
used.templatesWithUtilities = modules.filter((m) => m.utilities.length).length;
inventory.utilityClasses = utilities.reduce((n, u) => n + u.available, 0);

const tierCounts = (kind) =>
    ['T2B', 'T3A', 'T3B', 'T4'].map((t) => [t, modules.filter((m) => m.kind === kind && m.tier === t).length]);

const report = { inventory, used, utilities, modules, globals };

// No process.exit() after writing: on a pipe it cuts the output off at 64 KB.
if (asJson) {
    process.stdout.write(JSON.stringify(report, null, 2) + '\n');
} else {
    printMarkdown();
}

// -- Markdown ----------------------------------------------------------------

function printMarkdown() {
const out = [];
const p = (s = '') => out.push(s);

p('## Inventory — what Salesforce makes available (installed versions)');
p();
p('| Thing | Available | Used here |');
p('|---|---|---|');
p(`| Base components (\`lightning-*\`) | ${inventory.baseComponents} | ${used.lightningTags} distinct tags |`);
p(`| SLDS blueprints | ${inventory.blueprints} (${inventory.blueprintsUncovered} with no component behind them) | ${inventory.blueprintsUsed} |`);
p(`| SLDS utility classes | ${inventory.utilityClasses} in ${utilities.length} families | ${used.utilityClasses} distinct, ${used.utilityUses} uses, in ${used.templatesWithUtilities} of ${modules.length} templates |`);
p(`| Global hooks \`--slds-g-*\` | ${inventory.globalHooks} | ${used.globalHooksSet} set |`);
p(`| Component hooks \`--slds-c-*\` | ${inventory.componentHooks} | ${used.componentHooksSet} set |`);
p(`| Private hooks \`--_slds-*\` (+ \`--slds-s-*\` per the SLDS Linter) | ${inventory.privateHooks} | ${used.sharedHooksTouched} \`--slds-s-*\` touched |`);
p(`| \`--dxp-*\` hooks (Theme panel stand-in) | — | ${used.dxpHooksSet} declared |`);
p(`| Project tokens \`--sep-*\` | ${inventory.projectTokens} | — |`);
p(`| \`sep-\` opt-in classes | — | ${used.sepClasses} |`);
p(`| \`::part()\` selectors | — | ${used.parts} |`);
p(`| Routes | — | ${inventory.routes} |`);
p();

p('## SLDS utility classes by family (Tier 2)');
p();
p('| Family | Available | Used | Uses |');
p('|---|---|---|---|');
for (const u of [...utilities].sort((a, b) => b.uses - a.uses)) {
    p(`| ${u.family} | ${u.available} | ${u.used} | ${u.uses} |`);
}
p();

p('## Built here — components by highest tier reached');
p();
p('| Tier | Pages (`example/*`) | Wrappers (`ui/*`) |');
p('|---|---|---|');
const pages = Object.fromEntries(tierCounts('page'));
const wraps = Object.fromEntries(tierCounts('wrapper'));
for (const t of ['T2B', 'T3A', 'T3B', 'T4']) p(`| ${t} | ${pages[t]} | ${wraps[t]} |`);
p(`| **Total** | ${modules.filter((m) => m.kind === 'page').length} | ${modules.filter((m) => m.kind === 'wrapper').length} |`);
p();

p('## Per component');
p();
p('| Component | Kind | Tier | Base components | Blueprints | CSS lines | Flags |');
p('|---|---|---|---|---|---|---|');
for (const m of [...modules].sort((a, b) => a.kind.localeCompare(b.kind) || a.tier.localeCompare(b.tier) || a.name.localeCompare(b.name))) {
    p(`| \`${m.kind === 'page' ? 'example' : 'ui'}/${m.name}\` | ${m.kind} | ${m.tier} | ${m.lightning.length} | ${m.blueprints.join(', ') || '—'} | ${m.css?.lines ?? 0} | ${m.flags.join('; ') || '—'} |`);
}
p();

p('## Global stylesheets');
p();
p('| File | Lines | Sets `--slds-g-*` | Sets `--slds-c-*` | Touches `--slds-s-*` | `--dxp-*` | `::part` | Bare `.slds-*` | SLDS class in selector | `!important` | Raw hex |');
p('|---|---|---|---|---|---|---|---|---|---|---|');
for (const g of globals) {
    p(`| \`${g.file}\` | ${g.lines} | ${g.setsGlobal.length} | ${g.setsComponent.length} | ${uniq([...g.setsShared, ...g.readsShared]).length} | ${g.setsDxp.length} | ${g.parts} | ${g.bareSldsSelectors.length} | ${g.scopedSldsSelectors.length} | ${g.important} | ${g.hex.length} |`);
}
p();
const globalSets = uniq(globals.flatMap((g) => g.setsGlobal));
p(`Global hooks reassigned site-wide (${globalSets.length}): ${globalSets.map((s) => `\`${s}\``).join(', ') || '—'}`);
p();

process.stdout.write(out.join('\n') + '\n');
}
