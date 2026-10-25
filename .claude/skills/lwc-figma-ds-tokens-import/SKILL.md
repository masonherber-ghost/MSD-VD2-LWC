---
name: lwc-figma-ds-tokens-import
description: Import a Figma file's design tokens (local variables, plus the effect styles bound to them) into src/assets/css/design-tokens.css so that EVERY public --slds-g-* global hook is declared there — Figma's value wherever Figma defines the hook, Cosmos's or SLDS's own value everywhere else — and write a report in _docs on what in the Figma file does not line up with SLDS and how to fix it. Use when asked for a "Figma tokens report" or given a Figma link and asked to "import the variables/tokens", "sync the tokens from Figma", "update/replace the values in design-tokens.css from Figma", or to re-run the import after the Figma library changes. Also the reference for any later edit to design-tokens.css.
---

# Figma design tokens → design-tokens.css

Reads **every** local variable in the Figma file, works out which public `--slds-g-*` hook each
one is meant for, and **generates** `src/assets/css/design-tokens.css` so that:

- **all 524 public `--slds-g-*` hooks are declared** in that one file, and
- **every hook Figma defines carries Figma's value** — whether or not it differs from SLDS — while
  every hook Figma does not define carries Cosmos's (or SLDS's own) value.

Nothing is declared on trust: a name the shipped stylesheet does not declare is not a hook, whatever
its code syntax says.

**Read first:** `.claude/rules/rules-lwc-layout.md` § *Styling hooks, not hex* and § *Defining a
project token*, and `.claude/rules/rules-skinning.md` § *Never*. Where they disagree with this skill,
they win.

**Keep this skill current.** Any change to how `design-tokens.css` is structured, named, switched or
checked updates this file in the same piece of work — *Current state* and the decision log.

---

## The pipeline — one generated block, three sources

```
Figma variables ──(step 1, use_figma)──▶ figma-variables.txt ──import-figma.mjs──┐
Figma effect styles + project decisions ──(by hand)──▶ hand-tokens.mjs ──────────┼─▶ write-tokens.mjs ─▶ token block
SLDS stylesheet (installed) ──────────────────────────▶ sync-slds-globals.mjs ───┘
```

| File in this folder | Role |
|---|---|
| `figma-variables.txt` | The snapshot: one Figma variable per line — `name ; code syntax ; Default-mode value or →alias`. Committed, so an import is reviewable as a diff |
| `import-figma.mjs` | Module: every variable that lands on a shipped `--slds-g-*` hook, with Figma's value and label. Run directly, it prints the **findings** — every set-up problem it worked around; that output is the core of the report |
| `hand-tokens.mjs` | Data, edited by hand: the 8 `--sep-color-shadow-*` tints, the 20 elevation and focus shadows (Figma effect styles), and deliberate deviations from Figma (`msd — figma X`). **An entry here wins** over a Figma variable for the same hook |
| `sync-slds-globals.mjs` | Module: every public global nothing above declares, at Cosmos's value, labelled `cosmos — default X` or `default` |
| `write-tokens.mjs` | Merges the three (hand > Figma > SLDS), **groups by token type** — spacing, sizing, type, colour ramps, palettes, semantic colours (surface, on surface, border, accent, error, warning, success, info, disabled), shadows, motion — and writes between `/* @generated tokens:start/end */`. Group notes (issues worth knowing) live in its `GROUPS` table |
| `check-tokens.mjs` | Verifies the file (step 4) |

**Never hand-edit the token block.** Change the snapshot, `hand-tokens.mjs` or the scripts and run
`write-tokens.mjs`. Outside the block, the file is hand-written and short: the header (label
legend, pointers to the docs), the layout tokens (`--sep-content-*`), and a "Not in this file" note.
**Comments stay brief** (user, 2026-10-26): a note only for an issue worth knowing, otherwise a
pointer to the report or a review doc.

## Decisions already made — do not re-litigate

| Decision | Why |
|---|---|
| **All 524 public globals are declared** in `design-tokens.css` | User's rule (2026-10-19): the file is the complete record of the site's tokens |
| **Figma's value wins** for every hook Figma defines — including ones equal to SLDS | User's rule (2026-10-19). Labels say which equal SLDS: `figma = default`, `figma = cosmos`. **One exception**, C1a: the weight palette (2026-10-23) |
| Each hook is declared **once**: hand > Figma > SLDS default | User's rule (2026-10-19); one merged block since 2026-10-26 |
| The import is **live** — no `[OFF]` blocks | Superseded the 2026-10-15 "off by default". The user switched every block on, then asked for Figma's values to replace the file's |
| Project tokens are **`--sep-*`**. Never `--slds-*` for a name SLDS does not ship | User's rule |
| **Light values only** — Figma's Default mode. No `light-dark()` | User's decision. Dark Mode BETA is not imported |
| A `--sep-*` token only when something reads it | Today: the 8 shadow tints. Figma-only steps nothing aliases are *not imported* |
| Semantic tokens **alias** ramp steps with `var()`, as Figma does | Change a ramp, every role follows |
| Component hooks (`--slds-c-*`) are **not declared** — the file's closing note points to them | They live on the component's tag in `src/assets/css/site/components/<tag>.css` (`rules-skinning.md`) |
| `--slds-r-*` and `--slds-s-*` are **never set or read** | Undocumented / private. `sync-slds-globals.mjs` writes `--slds-r-*` references as literals |
| Content width and gutter (`--sep-content-*`) are **not** Figma tokens | Layout. Never delete them in an import |

---

## 1. Snapshot the Figma file → `figma-variables.txt`

`get_variable_defs` only returns what **one node** uses — useless here. Use `use_figma` (load the
`figma:figma-use` skill first). Returns are capped at **20 KB**, so split the colour collection.
Run in parallel; they are read-only.

```js
// Collections and counts — first, to see whether the file changed since the last snapshot.
const cols = await figma.variables.getLocalVariableCollectionsAsync();
return cols.map(c => ({ name: c.name, count: c.variableIds.length, modes: c.modes.map(m => m.name) }));
```

```js
// One collection (or a slice): name ; code syntax ; DEFAULT-mode value or →alias target.
// Aliases into a linked library are resolved to their value.
const c = (await figma.variables.getLocalVariableCollectionsAsync()).find(c => c.name === 'Color Mode');
const vars = await figma.variables.getLocalVariablesAsync();
const byId = new Map(vars.map(v => [v.id, v]));
const hex = c => { const h = x => Math.round(x*255).toString(16).padStart(2,'0');
  return '#'+h(c.r)+h(c.g)+h(c.b)+(c.a!==undefined && c.a<1 ? h(c.a):''); };
const m = c.modes[0].modeId; const out = [];
for (const id of c.variableIds.slice(0, 150)) {          // then .slice(150)
  const v = byId.get(id); let val = v.valuesByMode[m];
  if (val && val.type === 'VARIABLE_ALIAS') {
    const t = byId.get(val.id);
    if (t) val = '→' + (t.codeSyntax.WEB || t.name);
    else { const r = await figma.variables.getVariableByIdAsync(val.id); const f = r && Object.values(r.valuesByMode)[0];
           val = (f && 'r' in f) ? hex(f) : '?lib'; }
  } else if (val && typeof val === 'object' && 'r' in val) val = hex(val);
  out.push([v.name.replace(/^color\//,''), v.codeSyntax.WEB || '-', val].join(';'));
}
return out.join('\n');
```

Write the result to `figma-variables.txt` in the format its header documents: one
`@collection <name> <count>` line before each collection, values in px for spacing, sizing, radius
and type. Update the header's read date.

**Detect change first.** Hash each collection in the snapshot's exact line format (djb2 over the
lines joined with `\n`) in `use_figma`, and the same over `figma-variables.txt` locally. Equal → that
collection is unchanged; skip it. Different → send the snapshot's per-line hashes into `use_figma`
and return only the lines whose hash is not among them (plus the indexes of snapshot lines that
vanished), then **patch** `figma-variables.txt`. Re-hash to confirm; a match up to line order is
enough. Hash the effect styles the same way.

Also read the **effect styles** (`getLocalEffectStylesAsync()`, with each effect's bound variable).
They feed `hand-tokens.mjs` by hand — check whether geometry or tints changed.

## 2. Generate

```bash
node .claude/skills/lwc-figma-ds-tokens-import/import-figma.mjs              # findings — read them
node .claude/skills/lwc-figma-ds-tokens-import/write-tokens.mjs --dry-run    # counts: 524/524, by source
node .claude/skills/lwc-figma-ds-tokens-import/write-tokens.mjs              # write the token block
```

What `import-figma.mjs` decides — **the hook Figma means**, not always the syntax it exports:

| Figma variable | Written to |
|---|---|
| Code syntax is a shipped `--slds-g-*` hook | That hook |
| Code syntax is an SLDS **alias** of another hook (Cosmos defines it as `var(--x)`), and it is not a ramp step | The hook it aliases — `--slds-g-font-size-base` → `--slds-g-font-scale-base` |
| Ramp/palette variable whose syntax names a **different step** than its name, or has none | The step in its **name**, if SLDS ships it; otherwise *not imported* |
| Two variables landing on one hook | The first wins; the second is reported |
| Code syntax SLDS does not ship | Not imported, reported |

Units: spacing, sizing, radius, font scale → rem (÷16); border widths → px; `radius-border-circle`
→ px as Figma gives it. Weights: style names → numbers (Medium 500, SemiBold 600…). Family: `'<name>
Variable', '<name>', <SLDS stack>` (fonts.css registers the `Variable` face).

Labels on every Figma line: `figma — cosmos X` (differs; X is what Cosmos ships), `figma = cosmos`,
`figma = default`. Comparison is on **resolved light values** in both themes, never names.

If a generated value looks wrong, the bug is in the snapshot or the script — fix there, regenerate.
Two real bugs this caught: SLDS's `*-base-100` steps are aliases of `neutral-base-100` (so the alias
rule must not fold ramp steps), and a resolver that lowercases values must never produce output.

## 3. The hand-written parts

| Where | Holds | Update when |
|---|---|---|
| File header | The label legend; pointers to the rules, this skill and the latest report | The report changes |
| Layout | `--sep-content-*` and its breakpoints | Layout changes — never in an import |
| `hand-tokens.mjs` | Shadow tints, elevation and focus shadows, deviations from Figma | Effect styles change; a deviation is decided or dropped |
| `write-tokens.mjs` → `GROUPS` | The grouping and its notes | A new token family; an issue is found or fixed |
| "Not in this file" | Pointers: component hooks, `--dxp`, private hooks, what was not imported | Rarely |

The import's tally, collection counts and every finding go in the **report**, not the file.

## 4. Verify

```bash
node .claude/skills/lwc-figma-ds-tokens-import/check-tokens.mjs   # names ship, refs resolve, no light-dark, no --site-
node -e '…count distinct --slds-g-* declarations…'                # must be 524
npm run tokens && npm run compositions                            # regenerate /design-system data
npm run build                                                     # must exit 0
```

**Diff what renders.** Before writing, copy the file; after, resolve every global's light value in
both versions and list the changes (the script used is in the 2026-10-19 decision-log entry's
session; it overlays the tokens file on `slds2.cosmos.css` and follows `var()`). Report the changes
that matter on screen — a border width, a weight, a base colour — not the `#fff`→`#ffffff` noise.

Values are only *verified* by reading a computed style in a browser. Without one, say "compiles and
builds".

## 5. Write the Figma tokens report — `_docs/figma-tokens-report-<YYYY-MM-DD>.md`

Every import produces one; never overwrite an earlier one. **Readers: the designer and the
developers.** The reference is `_docs/figma-tokens-report-2026-10-19.md`:

| § | Holds |
|---|---|
| Summary | Tally summing to the Figma total; 524 accounted for; the top 3–4 problems |
| 1 | **Fixed since the last report** — the previous report's findings, one row each, with their status |
| 2 | **Maps cleanly** — Figma = shipped value, by family, counts re-added |
| 3 | **Set up incorrectly** — straight from the importer's findings: values that contradict their own label, code syntax naming another step or an unshipped hook, aliases, labels vs aliases. Each: what it breaks → fix → how the import handled it |
| 4 | **The colour ramps** — step grid vs SLDS, what is unreachable |
| 5 | **Semantics re-pointed** — every semantic whose alias step differs from the step Cosmos uses (resolve Cosmos's `light-dark(var(--slds-r-…))` to a step; a bare hex is the step with that value) |
| 6 | **Styles and other variables** — effect styles, component colours, text styles (say if not re-read) |
| 7 | **Fix list** — numbered, highest impact first |

Every count is measured, then re-added before saving. Quote Figma names verbatim. Say what each
finding **breaks**. Distinguish theming (an MSD value) from defects (a wrong name or a value that
contradicts its label).

**A Figma value that looks like a mistake is still imported** — Figma is the source of truth — but
it leads the report and the reply (2026-10-19: `sizing-border/2 (2px)` = 1.5).

## 6. Report back

The tally and the report link; what changed on screen (from the diff); the three or four Figma
defects that matter, and which of them are now live on the site.

---

## Current state of design-tokens.css

| Part | State |
|---|---|
| Layout (`--sep-content-max-width`, `--sep-content-gutter`) | Hand-written — layout, not from Figma |
| Token block | **Generated** by `write-tokens.mjs`, grouped by type. 524 of 524 globals + 8 `--sep-color-shadow-*` |
| — Figma variables | 298 on public hooks (299 imported; weight 6 is overridden). From the 2026-10-19 snapshot: 176 differ from Cosmos, 4 = Cosmos, 119 = SLDS default |
| — Figma effect styles | 20 elevation and focus shadows + 8 tints, in `hand-tokens.mjs` |
| — Deviations | 1: `--slds-g-font-weight-6` → `var(--slds-g-font-weight-5)` (500 over Figma's 600). The site's weights are 300 / 400 / 500 / 700. Delete it from `hand-tokens.mjs` if Figma's SemiBold becomes 500 |
| — SLDS | 205: 41 `cosmos — default X`, 164 `default` |

Border widths 1.5 / 2 / 3px (SLDS 2 / 3 / 4): 1.5px is deliberate — the button design draws its outline at sizing-border-2; the labels are wrong, /3 and /4 to confirm. Snapshot re-read 2026-10-19 (second read): 10 lines changed.

## Decision log

| Date | Change |
|---|---|
| 2026-10-15 | First import. 347 variables categorised A/B/C/D/E/F; overrides in four `[OFF]` blocks |
| 2026-10-15 | Pre-import tokens removed; their consumers repointed to Figma/SLDS hooks. Content width kept |
| 2026-10-15 | `light-dark()` removed — light (Default mode) values only |
| 2026-10-15 | Project prefix `--site-` → `--sep-`, across CSS, rules, scripts and the token browser |
| 2026-10-15 | `check-tokens.mjs` added. First report written |
| 2026-10-15/16 | All Figma blocks switched on by the user; headers tidied; Cosmos-only ramp steps listed |
| 2026-10-19 | Section D corrected: `lightning-button` reads no `--slds-c-button-destructive-*` / `-success-*` hooks (found by `lwc-component-review`) |
| 2026-10-19 | All 524 globals declared; `sync-slds-globals.mjs` added (C5, later C3) |
| 2026-10-19 | **Re-import.** Figma file revised (346 variables; ramps on SLDS steps; weights 5/6 fixed). User's rule: all globals defined, Figma values for every hook Figma defines. Hand-written A and C1–C3 replaced by **generated C1** (`import-figma.mjs`, `figma-variables.txt`). Old C4 → C2, old C5 → C3. The 21 `--sep-*` ramp steps dropped (Figma removed 5/35/85 from its ramps; nothing read them). `sync-slds-globals.mjs` no longer special-cases section A. `[OFF]` convention retired. Report `_docs/figma-tokens-report-2026-10-19.md`. 114 resolved values changed, incl. border widths 2→1.5px (Figma defect, live) |
| 2026-10-19 | Palettes titled one per palette in both generated blocks (`Palette: <name>`; C3 adds "— not in Figma"). Fixed `sync-slds-globals.mjs` splitting hyphenated palette names (`electric-blue` read as "electric"). Only the neutral palette has steps 0 and 100 — hue palettes run 10–95 in SLDS |
| 2026-10-19 | **Second read, same day.** Change detection added to step 1 practice: hash each collection in the snapshot's own line format and compare before dumping; if they differ, diff line-by-line (send the snapshot's line hashes into `use_figma`, return only lines not in it) and **patch** the snapshot rather than re-transcribe it. 10 lines changed: `font/scale/base` and `error-base/100` code syntax fixed; `on-error-1/-2` re-pointed (30 / 20); green and hot-orange swapped 35/85/5 for 100/55/45 — not SLDS palette steps, so not imported. 2 rendered values changed. Report `_docs/figma-tokens-report-2026-10-19-b.md` (a delta report — same-day reports take a `-b` suffix rather than overwrite) |
| 2026-10-23 | **Weight palette 300 / 400 / 500 / 700** (user). Hand-written **C1a** after C1 re-points `--slds-g-font-weight-6` to weight 5 (500) — the first deliberate deviation from Figma's value; labels, alerts and table headers follow. SLDS's hard-coded navigation 600 is unreachable. Weight 3 (300 Light) is in the palette and unchanged. `fonts.css` keeps `font-weight: 200 800` — the descriptor describes the file's axis, not the palette (a three-value list had been tried; it is invalid and drops the descriptor) |
| 2026-10-26 | **Restructured, no value changed** (user, `_docs/to-do.md`). The file is grouped by token **type**, not by source: one generated block replaces C1 and C3, written by the new `write-tokens.mjs` from `import-figma.mjs` and `sync-slds-globals.mjs` (both now modules) and the new `hand-tokens.mjs` (the old B, C1a and C2). Semantic colours split into titled groups; shadow tints sit with the shadows. Every token keeps its source label. Comments cut to issues worth knowing plus doc pointers — the import tally, sections D/E/F and "Not imported" now live in the reports. Verified: all 537 effective declarations identical before and after; `check-tokens.mjs` ok |
