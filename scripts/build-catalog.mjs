/**
 * Generates src/modules/data/catalog/catalog.js from the installed
 * lightning-base-components package. A module is treated as a renderable
 * component when it ships a template of the same name.
 */
import fs from 'fs';
import path from 'path';

const LBC = path.resolve('node_modules/lightning-base-components');
const SRC = path.join(LBC, 'src/lightning');
const OUT = path.resolve('src/modules/data/catalog/catalog.js');

const metadata = JSON.parse(fs.readFileSync(path.join(LBC, 'metadata/raptor.json'), 'utf8'));

const kebab = (name) => name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

// Salesforce marks publicly usable components with isExposed in the component's
// own *.js-meta.xml. That alone still lets through service modules (navigation,
// messageDispatcher) and CSS-only style modules (sldsUtils*), so a component
// also has to render markup: ship a template and extend LightningElement.
// Components extend a variety of base classes (LightningShadowBaseClass,
// LightningPrimitiveButton, ...), so the test is a default-exported class.
// A few exposed components are infrastructure with no standalone visual form.
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

// Templates do not always sit next to the component: datatable and pill pick a
// template dynamically, so look for any .html in the bundle.
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

const components = fs
    .readdirSync(SRC, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .filter((name) => isComponent(path.join(SRC, name), name))
    .map((name) => {
        const meta = metadata[name] || {};
        return {
            name,
            tag: `lightning-${kebab(name)}`,
            module: `lightning/${name}`,
            minVersion: meta.minVersion || null,
            properties: (meta.properties || []).map((p) => p.name).sort(),
            slots: meta.slotNames || []
        };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(
    OUT,
    `// GENERATED FILE - run \`npm run catalog\` to regenerate.\n` +
        `// Source: lightning-base-components@${JSON.parse(fs.readFileSync(path.join(LBC, 'package.json'), 'utf8')).version}\n` +
        `export const COMPONENTS = ${JSON.stringify(components, null, 4)};\n\n` +
        `export default COMPONENTS;\n`
);

console.log(`catalog: ${components.length} components -> ${path.relative(process.cwd(), OUT)}`);
