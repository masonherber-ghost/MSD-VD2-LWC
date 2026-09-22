/**
 * Reads the installed lightning-base-components package and generates
 * everything the kitchen-sink UI needs:
 *
 *   src/modules/data/catalog/catalog.js   component list + metadata + examples
 *   src/modules/data/catalog/registry.js  lazy loaders for each example bundle
 *   src/assets/example-sources.json       example source, fetched on demand
 *   lwr.config.json                       "examples/*" LWC module records
 *
 * Nothing here is hand-maintained: re-run `npm run catalog` after upgrading
 * lightning-base-components and the whole catalog follows the package.
 */
import fs from 'fs';
import path from 'path';

const LBC_DIR = 'node_modules/lightning-base-components';
const LBC = path.resolve(LBC_DIR);
const SRC = path.join(LBC, 'src/lightning');

const OUT_CATALOG = path.resolve('src/modules/data/catalog/catalog.js');
// LWC module specifiers are exactly namespace/name, so the registry needs its
// own bundle rather than sitting beside catalog.js.
const OUT_REGISTRY = path.resolve('src/modules/data/exampleRegistry/exampleRegistry.js');
const OUT_SOURCES = path.resolve('src/assets/example-sources.json');
const LWR_CONFIG = path.resolve('lwr.config.json');

const pkgVersion = JSON.parse(fs.readFileSync(path.join(LBC, 'package.json'), 'utf8')).version;
const metadata = JSON.parse(fs.readFileSync(path.join(LBC, 'metadata/raptor.json'), 'utf8'));

const kebab = (name) => name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
const titleCase = (name) =>
    name
        .replace(/^with/, 'with ')
        .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
        .replace(/^./, (c) => c.toUpperCase())
        .replace(/\s+/g, ' ')
        .trim();

// Components extend a variety of base classes (LightningShadowBaseClass,
// LightningPrimitiveButton, ...), so the test for "renderable component" is a
// default-exported class plus a template. isExposed alone still lets through
// service modules (navigation) and CSS-only style modules (sldsUtils*).
const NOT_VISUAL = new Set([
    'ariaObserver',
    'configProvider',
    'context',
    'f6Controller',
    'focusTrap',
    'overlayManager',
    'primitiveFigure',
    'baseFormattedText',
    'internalLocalizationService'
]);

function isExposed(dir, name) {
    const metaFile = path.join(dir, `${name}.js-meta.xml`);
    return (
        fs.existsSync(metaFile) &&
        /<isExposed>\s*true\s*<\/isExposed>/.test(fs.readFileSync(metaFile, 'utf8'))
    );
}

// datatable and pill choose a template at runtime, so look anywhere in the bundle.
function hasTemplate(dir) {
    return fs
        .readdirSync(dir, { withFileTypes: true, recursive: true })
        .some((e) => e.isFile() && e.name.endsWith('.html'));
}

function isComponent(dir, name) {
    const js = path.join(dir, `${name}.js`);
    return (
        isExposed(dir, name) &&
        !NOT_VISUAL.has(name) &&
        fs.existsSync(js) &&
        /export default class \w+ extends \w+/.test(fs.readFileSync(js, 'utf8')) &&
        hasTemplate(dir)
    );
}

// An example is only usable if every bare specifier it imports resolves. Most
// import just 'lwc'; a handful reach for namespaces this site does not define
// (overlay/*, context/*), and those are skipped rather than left to fail at runtime.
function unresolvedImports(exampleDir) {
    const unresolved = new Set();
    const files = fs
        .readdirSync(exampleDir)
        .filter((f) => f.endsWith('.js') && !f.endsWith('.d.ts'));

    for (const file of files) {
        const source = fs.readFileSync(path.join(exampleDir, file), 'utf8');
        for (const [, spec] of source.matchAll(/from\s+'([^']+)'/g)) {
            if (spec === 'lwc' || spec.startsWith('.')) continue;
            const [ns, mod] = spec.split('/');
            if (ns === 'lightning' && mod && fs.existsSync(path.join(SRC, mod))) continue;
            unresolved.add(spec);
        }
    }
    return [...unresolved];
}

function readExamples(componentName, componentDir) {
    const examplesDir = path.join(componentDir, '__examples__');
    if (!fs.existsSync(examplesDir)) return [];

    return fs
        .readdirSync(examplesDir, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name)
        .sort()
        .map((exampleName) => {
            const dir = path.join(examplesDir, exampleName);
            const entry = path.join(dir, `${exampleName}.js`);
            if (!fs.existsSync(entry)) return null;

            const skipped = unresolvedImports(dir);
            if (skipped.length) {
                console.warn(
                    `  skip ${componentName}/${exampleName} (unresolved: ${skipped.join(', ')})`
                );
                return null;
            }

            const id = `${componentName}/${exampleName}`;
            const moduleName = `examples/${componentName}${
                exampleName.charAt(0).toUpperCase() + exampleName.slice(1)
            }`;

            // Source shown in the UI: the markup and the controller, nothing generated.
            const sources = fs
                .readdirSync(dir)
                .filter((f) => /\.(html|js|css)$/.test(f) && !f.endsWith('.d.ts'))
                .sort()
                .map((f) => ({ file: f, code: fs.readFileSync(path.join(dir, f), 'utf8') }));

            return {
                id,
                name: exampleName,
                label: titleCase(exampleName),
                module: moduleName,
                entry: path.join(LBC_DIR, path.relative(LBC, entry)),
                sources
            };
        })
        .filter(Boolean);
}

// Read the package once: every component with its examples (sources included).
const scanned = fs
    .readdirSync(SRC, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .filter((name) => isComponent(path.join(SRC, name), name))
    .sort()
    .map((name) => {
        const meta = metadata[name] || {};
        return {
            name,
            tag: `lightning-${kebab(name)}`,
            module: `lightning/${name}`,
            minVersion: meta.minVersion && meta.minVersion !== '0.0' ? meta.minVersion : null,
            properties: (meta.properties || []).map((p) => p.name).sort(),
            slots: meta.slotNames || [],
            examples: readExamples(name, path.join(SRC, name))
        };
    });

// The catalog module ships metadata only; example source is fetched separately.
const components = scanned.map((c) => ({
    ...c,
    examples: c.examples.map(({ sources, entry, ...rest }) => rest)
}));

const allExamples = scanned.flatMap((c) => c.examples);

const banner = (file) =>
    `// GENERATED by scripts/build-catalog.mjs - do not edit.\n` +
    `// Source: lightning-base-components@${pkgVersion}\n` +
    (file ? `// ${file}\n` : '') +
    `\n`;

// -- catalog ---------------------------------------------------------------
fs.mkdirSync(path.dirname(OUT_CATALOG), { recursive: true });
fs.writeFileSync(
    OUT_CATALOG,
    banner() +
        `export const COMPONENTS = ${JSON.stringify(components, null, 4)};\n\n` +
        `export default COMPONENTS;\n`
);

// -- registry --------------------------------------------------------------
// Literal specifiers: LWR rewrites each import() into a lazily fetched module,
// so opening one example does not pull in the other 250-odd.
const registryEntries = allExamples
    .map((e) => `    '${e.id}': () => import('${e.module}')`)
    .join(',\n');

fs.mkdirSync(path.dirname(OUT_REGISTRY), { recursive: true });
fs.writeFileSync(
    OUT_REGISTRY,
    banner() +
        `export const EXAMPLE_LOADERS = {\n${registryEntries}\n};\n\n` +
        `export function loadExample(id) {\n` +
        `    const loader = EXAMPLE_LOADERS[id];\n` +
        `    return loader ? loader() : Promise.reject(new Error('Unknown example: ' + id));\n` +
        `}\n\n` +
        `export default EXAMPLE_LOADERS;\n`
);

// -- sources ---------------------------------------------------------------
const sourceMap = {};
for (const e of allExamples) {
    sourceMap[e.id] = e.sources;
}
fs.mkdirSync(path.dirname(OUT_SOURCES), { recursive: true });
fs.writeFileSync(OUT_SOURCES, JSON.stringify(sourceMap));

// -- lwr.config.json -------------------------------------------------------
// Replace only the records this script owns; everything else is left alone.
const config = JSON.parse(fs.readFileSync(LWR_CONFIG, 'utf8'));
config.lwc.modules = [
    ...config.lwc.modules.filter((m) => !String(m.name || '').startsWith('examples/')),
    ...allExamples.map((e) => ({ name: e.module, path: e.entry }))
];

// Keep the lazily loaded examples out of the main bundle graph. LWR merges
// this list with its own defaults. See README ("Why the build uses compat mode").
const OWNED_EXCLUSIONS = ['data/exampleRegistry', 'ui/exampleStage'];
config.bundleConfig = config.bundleConfig || {};
config.bundleConfig.exclude = [
    ...(config.bundleConfig.exclude || []).filter(
        (s) => !String(s).startsWith('examples/') && !OWNED_EXCLUSIONS.includes(s)
    ),
    ...OWNED_EXCLUSIONS,
    ...allExamples.map((e) => e.module)
];

fs.writeFileSync(LWR_CONFIG, JSON.stringify(config, null, 4) + '\n');

const withExamples = components.filter((c) => c.examples.length).length;
console.log(
    `catalog: ${components.length} components (${withExamples} with examples), ` +
        `${allExamples.length} examples, ${(JSON.stringify(sourceMap).length / 1024).toFixed(0)}KB of source`
);
