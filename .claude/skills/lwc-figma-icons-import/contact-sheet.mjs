#!/usr/bin/env node
/**
 * Every icon in src/icons/svg/, in manifest (Figma) order, on one HTML page — to compare
 * against a screenshot of the Figma frame. 24px, #333, the Figma grid's 104px pitch.
 *
 *   node .claude/skills/lwc-figma-icons-import/contact-sheet.mjs <out.html>
 *
 * Open it, or screenshot it headless (measure-states.mjs in component-from-design shows
 * the playwright-core setup). Writes nothing into the repo.
 */
import fs from 'node:fs';

const out = process.argv[2];
if (!out) {
    console.error('usage: contact-sheet.mjs <out.html>');
    process.exit(2);
}
const manifest = JSON.parse(fs.readFileSync('src/icons/icons.json', 'utf8'));
const cells = manifest.map(({ slug, name }) => {
    const svg = fs.readFileSync(`src/icons/svg/${slug}.svg`, 'utf8').replace('<svg ', '<svg width="24" height="24" fill="#333" ');
    return `<figure>${svg}<figcaption>${name}<br><code>utility:sep_${slug.replace(/-/g, '_')}</code></figcaption></figure>`;
});
fs.writeFileSync(out, `<!doctype html><meta charset="utf-8"><title>SEP icons</title>
<style>body{margin:0;padding:24px;background:#f5fafd;font:10px system-ui;display:grid;grid-template-columns:repeat(11,104px);row-gap:12px}
figure{margin:0;text-align:center}figcaption{color:#555;margin-top:4px}code{font-size:8px;color:#888}</style>
${cells.join('\n')}
`);
console.log(`icons: ${manifest.length} icons → ${out}`);
