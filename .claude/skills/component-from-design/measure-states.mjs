// Reads the computed style of a shipped lightning-* component in every state, from the
// shipped examples on /design-system — the only honest check of a skin (a compiled hook
// can be a no-op). Usage, with the dev server on PORT:
//   mkdir -p <scratch>/pw && cd <scratch>/pw && npm install playwright-core --cache <scratch>/npmcache
//   cp <repo>/.claude/skills/component-from-design/measure-states.mjs . && node measure-states.mjs button 3321
// Uses the installed Google Chrome. The examples render inside a SHADOW ROOT, where
// the site stylesheet cannot reach — so the script moves each component host into a fixed light-DOM
// box first (as a real page renders it), then forces :hover / :focus-visible / :active
// through CDP CSS.forcePseudoState. Synthetic mouse events proved unreliable for :active.
// Edit the property list in the page.evaluate() to read what your skin sets.
import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
const p = await b.newPage({ viewport: { width: 1400, height: 1200 } });
await p.goto(`http://localhost:${process.argv[3] ?? '3321'}/design-system`, { waitUntil: 'networkidle' });
await p.waitForTimeout(2000);
await p.locator('[role=tab]', { hasText: /^Components$/ }).first().click(); await p.waitForTimeout(800);

const cdp = await p.context().newCDPSession(p);
await cdp.send('DOM.enable'); await cdp.send('CSS.enable');
const hex = (c) => { const m = c.match(/\d+(\.\d+)?/g); if (!m) return c; const [r,g,bl,a] = m.map(Number); if (a === 0) return 'clear'; return '#' + [r,g,bl].map(x => x.toString(16).padStart(2,'0')).join('') + (a !== undefined && a < 1 ? `@${a}` : ''); };
const rows = [];
const [COMPONENT = 'button', PORT = '3321'] = process.argv.slice(2);
await p.locator(`[data-name="${COMPONENT}"]`).first().click(); await p.waitForTimeout(1500);
const IDS = await p.locator('[data-id]').evaluateAll(els => els.map(e => e.dataset.id));
for (const id of IDS) {
  await p.locator(`[data-id="${id}"]`).first().click(); await p.waitForTimeout(1200);
  await p.evaluate((TAG) => { document.getElementById('probe-box')?.remove(); const box = document.createElement('div'); box.id = 'probe-box'; box.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:2147483647;display:flex;flex-wrap:wrap;gap:16px;padding:24px;background:#0a213b';
    document.body.prepend(box); const all = []; const walk = (r) => r.querySelectorAll('*').forEach(el => { if (el.tagName === TAG) all.push(el); if (el.shadowRoot) walk(el.shadowRoot); }); walk(document); all.forEach(el => box.appendChild(el)); }, 'LIGHTNING-' + COMPONENT.replace(/[A-Z]/g, m => '-' + m).toUpperCase());
  await p.waitForTimeout(400);
  await cdp.send('DOM.getDocument', { depth: -1, pierce: true });
  const n = await p.locator('#probe-box > *').count();
  for (let i = 0; i < n; i++) {
    const { result } = await cdp.send('Runtime.evaluate', { expression: `document.querySelectorAll('#probe-box > *')[${i}].shadowRoot.querySelector('[part~=button], button, input, [part]')` });
    const { nodeId } = await cdp.send('DOM.requestNode', { objectId: result.objectId });
    const meta = await p.evaluate((i) => { const h = document.querySelectorAll('#probe-box > *')[i]; return { v: h.getAttribute('variant'), d: h.shadowRoot.querySelector('[part~=button], button, input, [part]').disabled }; }, i);
    const key = meta.v + (meta.d ? ' disabled' : '');
    if (rows.find(r => r.key === key)) continue;
    const states = meta.d ? [['rest', []]] : [['rest', []], ['hover', ['hover']], ['focus', ['focus', 'focus-visible']], ['active', ['hover', 'active']]];
    const out = { key, s: {} };
    for (const [name, forced] of states) {
      await cdp.send('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: forced });
      await p.waitForTimeout(60);
      out.s[name] = await p.evaluate(({ i }) => { const btn = document.querySelectorAll('#probe-box > *')[i].shadowRoot.querySelector('[part~=button], button, input, [part]'); const s = getComputedStyle(btn);
        return [s.backgroundColor, s.borderTopColor, s.color, s.boxShadow, s.paddingLeft]; }, { i });
    }
    await cdp.send('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: [] });
    rows.push(out);
  }
}
for (const r of rows) {
  console.log(`-- ${r.key}  (pad-inline ${r.s.rest[4]})`);
  for (const [st, [bg, bd, fg, sh]] of Object.entries(r.s)) console.log(`   ${st.padEnd(6)} bg ${hex(bg)} | bd ${hex(bd)} | fg ${hex(fg)} | sh ${sh === 'none' ? 'none' : sh.replace(/rgba?\([^)]*\)/g, m => hex(m)).slice(0, 70)}`);
}
await b.close();
