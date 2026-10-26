---
name: lwc-figma-icons-import
description: Import the SEP icon set from Figma into src/icons/ and rebuild the icon library that stands in for Salesforce's — so every lightning-icon, lightning-button-icon and base-component internal icon (combobox arrow, modal close, datepicker chevrons) draws a SEP icon, and nothing loads Salesforce's 1,500-icon libraries. Use when given a Figma link to an icon frame and asked to "import the icons", "sync the icons from Figma", "update the icon set", or to re-run after the Figma icons change; when asked to map a Salesforce icon name to a SEP icon, add or rename an icon, or fix an icon drawing the placeholder; and as the reference for anything under src/icons/.
---

# Figma icons → the SEP icon library

Splits one Figma icon frame into one SVG per icon, and **generates** the module that every
`lightning/iconSvgTemplates<Category>` import resolves to. Markup keeps writing Salesforce names —
`icon-name="utility:search"` — and a map decides which SEP icon each one draws.

**Read first:** `.claude/rules/rules-architecture.md` § *Icons* (how the swap is wired) and
`.claude/rules/rules-lwc-components.md` § *Known traps*. Where they disagree with this skill, they win.

**Keep this skill current.** Any change to how `src/icons/` is structured, built or checked updates
this file in the same piece of work — *Current state* and the decision log.

---

## The pipeline

```
Figma icon frame ──download_assets (svg)──▶ grid.svg ─┐
                 ──get_metadata──────────▶ meta.xml ──┴─split-figma-icons.mjs─▶ src/icons/svg/*.svg
                                                                                src/icons/icons.json
src/icons/svg/*.svg + placeholder.svg + icon-map.json ──npm run icons──▶ src/icons/sepIcons/  (GENERATED)
                                                                          lwr.config.json entries
```

| File | Role | Edited |
|---|---|---|
| `src/icons/svg/<slug>.svg` | One SEP icon: `viewBox 0 0 24 24`, `<path>`s only, no colour | By the splitter only |
| `src/icons/icons.json` | Manifest: slug, Figma name, Figma node id, notes on anything dropped | By the splitter only |
| `src/icons/placeholder.svg` | The dotted square drawn for any name with no SEP icon | By hand |
| `src/icons/icon-map.json` | Salesforce name → SEP slug. **The only place that decides which icon a name draws** | By hand — the design call |
| `src/icons/sepIcons/` | One LWC template per icon, `sepIcons.js` (the library, `sep/icons`), `category.js` | **Never** — `npm run icons` |
| `src/modules/data/icons/icons.js` | Every icon with the names that draw it, and every name drawing the placeholder — what `/design-system` → **Icons** (`ui/iconBrowser`) renders | **Never** — `npm run icons` |
| `scripts/build-icons.mjs` | Generates the above, keeps the `lwr.config.json` entries in place, prints coverage | — |
| `split-figma-icons.mjs` (here) | Figma export → `svg/` + `icons.json` | — |
| `contact-sheet.mjs` (here) | Every icon on one HTML page, for comparing with the Figma frame | — |

---

## Decisions already made — do not re-litigate

| Decision | Why |
|---|---|
| **Markup keeps Salesforce names.** The map translates them | A component lifted into a real org draws Salesforce's icon there unchanged |
| **`utility:sep_<slug>` reaches every SEP icon by its own name** (`utility:sep_match_partial`), generated, not in the map | For icons with no Salesforce counterpart (Realme, the match levels). SEP-only: a real org has no such name, so say so at handover |
| **Anything unmapped draws the placeholder**, never a blank | A missing icon reads as unfinished, not as broken layout. An unmapped `utility:*` also logs one console warning |
| **Every `standard:*`, `custom:*`, `action:*` name is the placeholder** (user, 2026-10-26) | The SEP set has no coloured object tiles. They keep their Salesforce tile colour around the placeholder |
| **`/design-system` examples draw SEP icons or the placeholder** (user, 2026-10-26) | The price of not loading Salesforce's libraries |
| **Icons are filled shapes, colour stripped** | `.slds-icon` colours through `fill`, so the SLDS icon hooks keep working. The Figma set is already outlined; a stroke found on export is dropped and noted |
| **One library, ten specifiers** — each `lightning/iconSvgTemplates<Category>[Rtl]` resolves to `category.js`, which re-exports `sep/icons` | LWR names a template module after its importer: ten direct entries loaded every template once per category (job detail: 3,528 requests vs 2,864) |
| **All 110 icons are in the library**, not just the mapped ones | So `utility:sep_*` always works. Importing only the referenced ~57 would save ~320 dev requests per page — not done, see *Current state* |

---

## 1. Read the frame

The SEP set lives in **SEP – Foundations UI Library**, page *Iconography*, frame *Small icons* →
child frame **Icons** (`11:390`): <https://www.figma.com/design/BIYTe4aj1tFOEPvEWoBjgb/SEP---Foundations-UI-Library?node-id=11-383>.

1. `create_session` on the file, then `get_metadata` on the frame that holds the icon components
   (`11:390`, not the outer `11:383` — the export's coordinates must be that frame's).
2. **Save the output verbatim** to `<scratch>/meta.xml`. It is the only source of each icon's x/y;
   the splitter checks every path against it, so a slip fails loudly rather than shifting an icon.

## 2. Export the frame as ONE svg

`download_assets` on the same node, `defaultFormat: "svg"`, then `curl` the `export.url` to
`<scratch>/grid.svg`. **Not one call per icon**: `svgAssets` caps at 20, and 110 SVG strings
through the conversation invite transcription errors. The file never passes through it this way.

## 3. Split

```bash
node .claude/skills/lwc-figma-icons-import/split-figma-icons.mjs <scratch>/grid.svg <scratch>/meta.xml
```

It fails — and writes nothing to trust — on a non-path shape, a relative path command, or a path
outside its 24×24 box. It **notes** (and drops) strokes, unexpected fills and opacity; those notes
go in the report as Figma clean-up. Icons removed from Figma are deleted from `svg/` and listed.

Slugs are the Figma name kebab-cased (`File + Person` → `file-person`). **Figma typos carry through**
(`hapy-face`, `verical-arrows`) — renaming one renames its `utility:sep_*` name, so fix it in Figma
and say so, never only here.

## 4. Map

Edit `src/icons/icon-map.json`. A key must be a real shipped Salesforce name (the build warns
otherwise); a value must be a slug in `svg/` (the build fails otherwise). When a pairing is a
judgement, record it in the review doc (`_docs/icon-map-review-<date>.md`) for the designer.

## 5. Build

```bash
npm run icons             # only here — NOT a dev/build pre-step, by decision
npm run icons -- --check  # exit 1 if src/icons/sepIcons/ or lwr.config.json is stale
```

Read the coverage it prints: names **our code** uses that draw the placeholder, and base-component
internals that do. A `utility:*` there is a mapping still to make.

## 6. Verify

- **Restart dev with `rm -rf __lwr_cache__`** — the library is a new module set and the cache holds
  compile failures (`rules-architecture.md` § *The module cache*).
- **Read the icons off a page** rather than looking: for each `lightning-primitive-icon` in the
  shadow tree, its svg's `viewBox` must be `0 0 24 24`, its size non-zero where visible, its `fill`
  an SLDS colour; the console must carry no `failed to dynamically import icon templates`.
- **`/design-system` → Icons** draws every icon through `lightning-icon` by its `utility:sep_…`
  name. Read the tiles rather than looking: none may draw the placeholder (its path starts
  `M3 3h4v2.5H3z`) or nothing.
- **Contact sheet** against a Figma screenshot of the frame:
  `node .claude/skills/lwc-figma-icons-import/contact-sheet.mjs <scratch>/icons.html`.
- `npm run build` exits 0.

## 7. Report back

Count imported, added and removed; the splitter's notes (Figma clean-up); placeholders still in our
code; any pairing you guessed. Update *Current state* below.

---

## Traps, all met building this

| Symptom | Cause | Fix (already in the generator) |
|---|---|---|
| `failed to dynamically import icon templates … api_normalize_class_name is not a function` | The library is returned from an `async` function, so the runtime reads its `then`; a placeholder there made it a "thenable" and the template was called as one | The Proxy only answers `<category>_…` keys |
| `LWC1007 … Unexpected keyword 'delete'` | An icon slug became an import name | Identifiers are prefixed: `iconDelete` |
| `ENOENT … src/icons/libraries/templates/x.html` | A relative import in a `{name, path}` module resolves as if the file sat one folder deeper unless it is laid out like an LWC module folder | The library lives at `sepIcons/sepIcons.js` with `./templates/` beside it |
| ~6 requests per icon in dev | Each template is fetched twice (`latest` → hashed) and the compiler adds empty `.css` / `.scoped.css` imports | Inherent to `lwr dev`; the build bundles them |
| A path `d` with `{` | LWC reads braces in a template as an expression | The build refuses it |

---

## Current state

*2026-10-26.* **110** icons from `11:390` (Streamline Sharp Line, 24px). **85** Salesforce names
mapped — draft, under review in `_docs/icon-map-review-2026-10-26.md`. Our code still draws the
placeholder for `utility:apps`, `database`, `offline`, `palette` (no SEP equivalent) and for every
`standard:*` / `custom:*` by decision; base internals for `utility:steps`, `threedots`.

Measured under `npm run dev`, five pages, warm: **10–31s → 2.3–4.1s**; requests **5,300–10,700 →
1,311–2,864**. Further cut not taken: import only referenced templates (~−320 requests/page).

Figma clean-up found: *Circle arrow right* carries a 1px stroke its siblings do not.

## Decision log

| Date | Decision | By |
|---|---|---|
| 2026-10-26 | Replace Salesforce's icon libraries with the SEP set through module resolution; markup keeps Salesforce names | user |
| 2026-10-26 | Unmapped names and every `standard:*` draw one neutral placeholder; `/design-system` examples accept it | user |
| 2026-10-26 | Draft the Salesforce → SEP map for designer review | user |
| 2026-10-26 | `npm run icons` runs only when this skill runs — not before `dev` or `build`. Its output is committed, so dev and the build use what is there; an edit to `src/icons/` shows only after running it | user |
