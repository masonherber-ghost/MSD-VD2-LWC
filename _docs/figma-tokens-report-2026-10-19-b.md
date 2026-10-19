# Figma tokens report: "LDS2 | MSD | Components for Web" (2026-10-19, second read)

A same-day re-read of the Figma file after it was edited again. This is a **delta** on [the morning's report](figma-tokens-report-2026-10-19.md): only what changed is described here, and anything not mentioned stands as written there.

| | |
|---|---|
| Figma file | `figma.com/design/3FTyjvu0JC5UtYqnoLqDFh` (link given: node `18216:12068`; the import reads the whole file) |
| Read | 2026-10-19 (second read), Default mode only, through the Figma Plugin API |
| How the change was found | Each collection was hashed in the snapshot's own line format and compared with the committed snapshot. Spacing/Sizing and the effect styles were identical. Typography and Color Mode differed, and a line-level diff isolated 10 changed lines |
| Snapshot | `.claude/skills/lwc-figma-ds-tokens-import/figma-variables.txt`, patched, not re-dumped. The patched Typography hashes identically to Figma; Color Mode has the same 290 lines in a different order |

---

## Summary

| | Variables |
|---|---:|
| On a public `--slds-g-*` hook, value written from Figma | **299** (unchanged) |
| · differs from Cosmos / = Cosmos / = SLDS default | 176 / 4 / 119 |
| Shadow tints held in `--sep-color-shadow-*` | 8 |
| Component colours (listed in section D) | 14 |
| Not imported | 25 |
| · palette steps 35/85/5 on the six Salesforce palettes | 18 |
| · new green / hot-orange steps 100, 55, 45, which SLDS doesn't ship | 6 |
| · `font/family/mobile` | 1 |
| **Total** | **346** |

All 524 public globals are still declared: 299 in C1, 20 in C2, 205 in C3.

**On screen, two values changed:**

| Hook | Before | Now |
|---|---|---|
| `--slds-g-color-on-error-1` | error 20, `#531614` | **error 30, `#7d201f`** |
| `--slds-g-color-on-error-2` | error 30, `#7d201f` | **error 20, `#531614`** |

Error text on pale error surfaces is one step lighter than this morning, and the emphasis text (`-2`) one step darker.

**Still the most urgent:** the border widths (`sizing-border/2 (2px)` = 1.5) were **not** changed. Every 2px border on the site still renders at 1.5px. See the earlier report, §3.1.

> **Correction (later the same day):** the button design binds its outlined border to `sizing-border/2` and draws it at 1.5px, so the value is **deliberate**. Only the variable's "(2px)" label is wrong, and `/3 (2px)` = 2, `/4 (4px)` = 3 should be confirmed with the designer. See `_docs/component-review-button-2026-10-19.md` § Built.

---

## 1. Fixed since this morning's report

| Morning finding | Now |
|---|---|
| §3.2 `error-base/100` exported `--slds-g-color-error-base-95` | **Fixed:** exports `--slds-g-color-error-base-100` |
| §3.4 `font/scale/base` exported the alias `--slds-g-font-size-base` | **Fixed:** exports `--slds-g-font-scale-base` |
| §3.5 `error/on-error-1 (Pink 35)` label disagreed with its alias | **Fixed:** now `(Pink 30)` → `error-base/30`, and the label matches |
| §3.3 green and hot-orange 35/85/5 exported the 40/90/10 code syntax | **Resolved** by removing the six variables (see §2) |
| §3.1 border widths 1.5 / 2 / 3px | **Not fixed** |
| §3.3 the other six palettes' 35/85/5 export the 40/90/10 code syntax | **Not fixed** (18 variables) |
| §3.5 `border-accent-2 (Electric Blue 35)`, `border-accent-3 (Electric Blue 20)` labels | **Not fixed.** The aliases (40, 30) are right; only the brackets are stale |

## 2. New: green and hot-orange now use base-ramp steps

The two MSD palettes dropped 35, 85 and 5 and gained **100, 55 and 45**:

| Variable | Code syntax | Value |
|---|---|---|
| `palette/green/100 (Green 100)` | `--slds-g-color-palette-green-100` | `#ffffff` |
| `palette/green/55 (Green 55)` | `--slds-g-color-palette-green-55` | `#49c6c1` |
| `palette/green/45 (Green 45)` | `--slds-g-color-palette-green-45` | `#30ada7` |
| `palette/hot-orange/100 (Hot Orange 100)` | `--slds-g-color-palette-hot-orange-100` | `#ffffff` |
| `palette/hot-orange/55 (Hot Orange 55)` | `--slds-g-color-palette-hot-orange-55` | `#f86c69` |
| `palette/hot-orange/45 (Hot Orange 45)` | `--slds-g-color-palette-hot-orange-45` | `#de534f` |

**None of these six hooks exists.** SLDS's palettes, unlike its base ramps, run 10, 15, 20, 30, 40, 50, 60, 65, 70, 80, 90, 95 with no 45, 55 or 100. Only the neutral palette has 0 and 100.

**What it breaks:** nothing renders differently, but the code syntax promises hooks that don't exist. Exported as written, they're custom properties in the `--slds-` namespace, which is reserved for Salesforce.

**Fix, either:**
- remove the six variables, so green and hot-orange run on SLDS's palette steps like the other six palettes; **or**
- if MSD needs teal and salmon at 45, 55 and 100, keep them **without** code syntax, or give them `--sep-` code syntax. They'd then be project tokens, not SLDS hooks.

The importer skipped them (not imported).

## 3. Semantics re-pointed away from SLDS's mapping (now 10)

`on-error-2` joins the list: it moved from error 30, SLDS's step, to error 20. `on-error-1` moved from 20 to 30, nearer SLDS's 40 but not on it. The full list, re-measured:

| Semantic | Figma | SLDS | |
|---|---|---|---|
| `on-error-1` | error 30 | error 40 | changed today (was 20) |
| `on-error-2` | error 20 | error 30 | **new** (was on SLDS's step) |
| `on-warning-1` | warning 30 | warning 40 | |
| `on-success-1` | success 30 | success 40 | |
| `on-success-2` | success 20 | success 30 | |
| `border-success-2` | success 20 | success 30 | |
| `border-warning-1` | warning 40 | warning 60 | |
| `border-2` | neutral 60 | neutral 40 | |
| `on-disabled-2` | neutral 40 | neutral 50 | |
| `border-disabled-1` | neutral 80 | neutral 50 | |

The status rows are consistent: text on status colours sits one step darker than SLDS. Confirm that's intended. If so, nothing needs to change, and the import already follows it.

## 4. Fix list (updated)

1. **Border widths:** `sizing-border/2–4` to 2 / 3 / 4, and fix `/3`'s label. Still live on the site as 1.5px.
2. **Green and hot-orange 100/55/45:** remove them, or take them off the `--slds-` namespace (§2).
3. **The other 18 palette 35/85/5 variables:** clear their code syntax.
4. **Confirm the 10 re-pointed semantics** (§3).
5. **Update the stale labels** on `border-accent-2` and `border-accent-3`.
6. Tidy-ups unchanged from the morning: `Elevation/1 - right`, the duplicate Typography mode, `font/family/mobile`.

Counts re-added: 299 + 8 + 14 + 25 = 346, with 18 + 6 + 1 = 25.
