// Which font does the browser actually DRAW with? Computed `font-family` only says what was asked
// for; a family that never loaded silently falls back. This asks Chrome for the platform font used
// to render each text node (CDP CSS.getPlatformFontsForNode), through shadow roots, and checks it
// against the family fonts.css declares.
//
//   node check-fonts.mjs [port] [path ...]          (default: 3321, a spread of routes)
//   node check-fonts.mjs 3321 --components button input textarea checkboxGroup radioGroup dualListbox
//
// Run from a scratch dir with playwright-core installed (see measure-states.mjs). Exit code 1 if any
// sampled text renders in anything but the expected family. Fails loudly on the trap that hid this
// for days: fonts.css commented out of main.njk while the token still named the family.
import { chromium } from 'playwright-core';

const EXPECT = /Atkinson Hyperlegible Next/i;
const args = process.argv.slice(2);
const PORT = /^\d+$/.test(args[0] ?? '') ? args.shift() : '3321';
const ci = args.indexOf('--components');
const COMPONENTS = ci >= 0 ? args.splice(ci).slice(1) : [];
const PATHS = args.length ? args : (COMPONENTS.length ? [] : ['/', '/jobs', '/jobs/job-detail', '/profile', '/login', '/create-job/step2']);

// What to sample: a label, a selector (searched through shadow roots), and how many.
const SAMPLE = [
    ['heading', 'h1, h2, h3, .slds-page-header__title, .slds-text-heading_large, .slds-text-heading_medium'],
    ['body', 'p, li, .slds-text-body_regular'],
    ['button', 'button'],
    ['input', 'input:not([type=checkbox]):not([type=radio]), textarea'],
    ['label', 'label, legend, .slds-form-element__label'],
    ['badge', '.slds-badge'],
    ['table', 'th, td'],
];

const b = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
const p = await b.newPage({ viewport: { width: 1400, height: 1200 } });
const cdp = await p.context().newCDPSession(p);
await cdp.send('DOM.enable'); await cdp.send('CSS.enable');
const failures = [];

async function audit(where) {
    await p.evaluate(() => document.fonts.ready);
    await p.waitForTimeout(400);
    const loaded = await p.evaluate(() => [...document.fonts].filter((f) => f.status === 'loaded').map((f) => `${f.family} ${f.style}`));
    const { root } = await cdp.send('DOM.getDocument', { depth: -1, pierce: true });
    // Index every element node, through shadow roots, with its node name and a class string.
    const nodes = [];
    const walk = (n) => {
        if (n.nodeType === 1) nodes.push(n);
        for (const c of [...(n.children ?? []), ...(n.shadowRoots ?? []), ...(n.contentDocument ? [n.contentDocument] : [])]) walk(c);
    };
    walk(root);
    const row = [];
    for (const [label, sel] of SAMPLE) {
        // Ask the page which backend ids match, through shadow roots; keep visible ones with text.
        const { result } = await cdp.send('Runtime.evaluate', {
            expression: `(() => { const out = []; const w = (r) => { r.querySelectorAll(${JSON.stringify(sel)}).forEach((e) => { const t = (e.value || e.placeholder || e.textContent || '').trim(); const r2 = e.getBoundingClientRect(); if (t && r2.width && r2.height) out.push(e); }); r.querySelectorAll('*').forEach((e) => e.shadowRoot && w(e.shadowRoot)); }; w(document); return out.slice(0, 4); })()`,
        });
        const { result: props } = await cdp.send('Runtime.getProperties', { objectId: result.objectId, ownProperties: true });
        const fams = new Set();
        for (const pr of props.filter((x) => /^\d+$/.test(x.name))) {
            const { nodeId } = await cdp.send('DOM.requestNode', { objectId: pr.value.objectId });
            if (!nodeId) continue;
            try {
                const { fonts } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId });
                for (const f of fonts) fams.add(f.familyName);
            } catch { /* node without text layout */ }
        }
        if (!fams.size) continue;
        const ok = [...fams].every((f) => EXPECT.test(f));
        if (!ok) failures.push(`${where} ${label}: ${[...fams].join(', ')}`);
        row.push(`${ok ? '✓' : '✗'} ${label}: ${[...fams].join(', ')}`);
    }
    console.log(`${where}\n   faces loaded: ${loaded.length ? [...new Set(loaded)].join(', ') : 'NONE'}\n   ${row.join('\n   ')}`);
}

for (const path of PATHS) {
    await p.goto(`http://localhost:${PORT}${path}`, { waitUntil: 'networkidle' });
    await p.waitForTimeout(1200);
    await audit(path);
}
if (COMPONENTS.length) {
    await p.goto(`http://localhost:${PORT}/design-system`, { waitUntil: 'networkidle' }); await p.waitForTimeout(1500);
    await p.locator('[role=tab]', { hasText: /^Components$/ }).first().click(); await p.waitForTimeout(600);
    for (const c of COMPONENTS) {
        await p.locator(`[data-name="${c}"]`).first().click(); await p.waitForTimeout(1500);
        await audit(`/design-system → ${c}`);
    }
}
await b.close();
if (failures.length) { console.log(`\n✗ ${failures.length} sample(s) not in ${EXPECT}:\n   ${failures.join('\n   ')}`); process.exit(1); }
console.log(`\n✓ every sampled text renders in ${EXPECT}`);
