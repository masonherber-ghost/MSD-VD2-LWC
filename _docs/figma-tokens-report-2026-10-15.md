# Figma tokens report: "LDS2 | MSD | Components for Web"

How well the Figma file's variables and styles line up with the SLDS 2 hooks this site uses, and what to fix in Figma so they line up fully.

| | |
|---|---|
| Figma file | `figma.com/design/3FTyjvu0JC5UtYqnoLqDFh` |
| Read | 2026-10-15, local variables, text styles and effect styles, through the Figma Plugin API |
| Compared against | `@salesforce-ux/design-system-2` 2.264.2, `slds2.cosmos.css` (the stylesheet the site loads) |
| Imported into | `src/assets/css/design-tokens.css` |
| Produced by | the `lwc-figma-ds-tokens-import` skill |

This is a snapshot taken at import time. If the Figma file has changed since, re-run the import to refresh it.

**How a variable was judged.** A variable "maps" only if its **Web code syntax** names a hook that the shipped stylesheet actually declares. Its value was then compared with the value Cosmos resolves for that hook. A plausible-looking name counts for nothing on its own.

---

## Summary

| | Variables | Share |
|---|---:|---:|
| Map cleanly: SLDS hook exists and Figma's value equals the shipped one | 127 | 37% |
| Map to an SLDS hook, but Figma's value differs (MSD theming) | 155 | 45% |
| No SLDS hook exists, so the value is held in a project `--sep-*` token | 29 | 8% |
| Component colours with no code syntax (button, backdrop, drag) | 14 | 4% |
| Not imported (no valid name, or unused) | 22 | 6% |
| **Total** | **347** | |

The file is in good shape overall. **The spacing, sizing, radius and type families are clean.** Every colour family carries a correct `--slds-g-*` code syntax, except the 35/85/5 ramp steps.

The problems fall into five groups:

1. **26 variables have a wrong or garbled code syntax.** 23 palette steps export the name of a *different* step, so importing them as written would overwrite good values (§4.1).
2. **The colour ramps use different steps from SLDS.** Figma has 5/35/85; SLDS has 45/55. So 10 SLDS steps have no MSD value, and 21 Figma steps have no SLDS name (§5).
3. **14 semantic colours point at a different step from SLDS's mapping**, and 12 of their names still record the original SLDS step (§6). Some may be deliberate, but each one moves MSD away from the stock Lightning role.
4. **Font weight 6 is Medium (500); in SLDS it is 600.** The text styles called "Semibold" all use it (§4.2).
5. **Components on the Accordion page bind variables from other libraries** (SF Pro text styles, `Icon/*`, `Alert/*`, `padding/*`) instead of this file's SLDS-named ones (§7.4).

---

## 1. Maps cleanly: no action

The Figma value equals what SLDS already ships. These need nothing in CSS; the shipped hook already gives the right value.

| Family | Variables | Notes |
|---|---:|---|
| `--slds-g-sizing-border-1…4` | 4 | 1, 2, 3, 4px |
| `--slds-g-sizing-1…16` | 16 | 2px to 480px; every step identical |
| `--slds-g-spacing-1…12` | 12 | 4px to 80px |
| `--slds-g-radius-border-1…4`, `-circle` | 5 | `circle` is 9999px in Figma and 100% in SLDS; same intent, see §4.6 |
| `--slds-g-font-weight-3`, `-4`, `-7` | 3 | Light, Regular, Bold |
| `--slds-g-color-neutral-base-0`, `-100` | 2 | Black and white |
| `--slds-g-color-palette-{cloud-blue, indigo, orange, purple, red, violet}-*` | 72 | Aliased to the Salesforce "Global Colors" library; every SLDS step equal |
| `--slds-g-color-info-base-*` | 13 | Salesforce Blue, identical to Cosmos |
| **Total** | **127** | |

---

## 2. Maps to an SLDS hook, but the value differs

This is the MSD theme: the values a site has to override to look like MSD. They are imported into `design-tokens.css` as switched-off blocks. A difference here is **expected**, not a defect, unless §4 or §6 says otherwise.

### 2.1 Type: 14 variables

Figma's type ramp is a content-site ramp; SLDS's is a dense data-app ramp. Every step differs:

| Step | neg-2 | neg-1 | base | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Figma (px) | 12 | 14 | 16 | 18 | 20 | 24 | 32 | 36 | 40 | 48 | 60 |
| SLDS (px) | 10 | 12 | 13 | 14 | 16 | 20 | 24 | 28 | 32 | 40 | 48 |

The other three differences:
- `font/weight/6` is Medium (500); SLDS weight 6 is 600 (§4.2).
- `font/family/base` is Atkinson Hyperlegible Next; SLDS uses the system stack.
- `font/family/monospace` is SF Mono; SLDS uses Consolas/Menlo.

Overriding these resizes **all** of Lightning's own interface text (labels, table cells, buttons), not only the page copy. That is a theming decision, not something the import can settle.

### 2.2 Colour ramps: 84 variables

MSD's own ramps, all with the correct `--slds-g-*` code syntax:

| Ramp | Steps that differ | Example: step 50, Figma vs SLDS |
|---|---:|---|
| `neutral-base` | 12 | 50: `#666666` vs `#757575` |
| `brand-base` | 12 | 50: `#017ac9` (MSD blue) vs `#066afe` |
| `error-base` | 12 | 50: `#d03633` vs Cosmos red |
| `warning-base` | 12 | 50: `#fa7f14` |
| `success-base` | 12 | 50: `#388314` |
| `palette-green` | 12 | 50: `#35c0ba`. **MSD teal under Salesforce's "green" name** (§4.7) |
| `palette-hot-orange` | 12 | 50: `#f75c58`. MSD salmon |

### 2.3 Semantic colours: 57 variables

All 57 have a correct code syntax. Most differ from Cosmos only because their ramp differs. 12 also point at a **different step** from the one SLDS uses; those are in §6.

### 2.4 Shadows and focus: from effect styles, not variables

The `Shadow/Elevation/1–4` styles use **exactly SLDS's geometry**. Their colour is MSD dark navy (`#162c45`) at the same alpha steps, where SLDS uses black. `Focus/Outline` uses `accent-1` (MSD blue); SLDS uses `brand-base-15` (navy). These are imported as overrides of `--slds-g-shadow-*` and `--slds-g-shadow-*-focus-1`.

---

## 3. No SLDS hook: held in project tokens

The values are real and used, but SLDS has no name for them. They live in `design-tokens.css` as `--sep-*` tokens.

| Figma variables | Count | Why there is no hook |
|---|---:|---|
| `color/{neutral,brand,error,warning,success}-base/{85,35,5}` | 15 | SLDS has no 5/35/85 steps (§5) |
| `color/palette/{green,hot-orange}/{85,35,5}` | 6 | Same reason |
| `shadows/level 1–4/1+2` and `/3` | 8 | SLDS writes shadow colours inline in `--slds-g-shadow-*`; there is no colour hook |

---

## 4. Variables set up incorrectly in Figma

Each item says what is wrong, what it breaks, and the fix.

### 4.1 Wrong or garbled code syntax: 26 variables

| Variable(s) | Code syntax in Figma | Problem | Fix |
|---|---|---|---|
| `color/palette/*/35` (8 palettes) | `…-40` | Exports as step 40, **overwriting the real 40** | Clear it; no SLDS step 35 exists |
| `color/palette/*/85` (7 palettes, not cloud-blue) | `…-90` | Overwrites step 90 | Clear it |
| `color/palette/*/5` (8 palettes) | `…-10` | Overwrites step 10 | Clear it |
| `color/success-base/65 (Teal 65)` | `color/success-base/65 (Teal 65)--slds-g-color-success-base-65` | **Garbled**: the variable name was pasted in front of the token | Set to `--slds-g-color-success-base-65` |
| `font/scale/base` | `--slds-g-font-size-base` | In SLDS that name is an alias **of** `--slds-g-font-scale-base`. Setting the alias does not move the step it points at | Set to `--slds-g-font-scale-base` |
| `spacing/0 (0px)` | `--slds-g-spacing-0` | **SLDS has no such hook.** A custom property in the `--slds-` namespace is reserved for Salesforce | Clear it; zero needs no token |

That is 23 palette duplicates (8 + 7 + 8) plus the three single variables.

### 4.2 Font weight 6 is Medium, not Semibold

| | Figma | SLDS |
|---|---|---|
| `font/weight/6` | style "Medium" (500) | `--slds-g-font-weight-6: 600` |

The 11 text styles named "…/Semibold" or "…Semi" all bind weight 6, so they render at **500**. Either:
- the hook should be 500 and the styles renamed "Medium", or
- the variable should be "SemiBold" (600).

Font-weight variables in Figma are also **style names** ("Regular", "Bold"), not numbers, so each one has to be translated to a number by hand on export. Figma has no numeric weight binding, so this can't be fixed in the file. It is noted so nobody expects the values to export as-is.

### 4.3 Missing code syntax where SLDS does have the hook

| Variable | Hook that exists | Fix |
|---|---|---|
| `color/neutral-base/0 (Neutral 0)` | `--slds-g-color-neutral-base-0` | Add it |
| `color/information/35 (Blue 35)` | `--slds-g-color-info-base-35` | Add it |

### 4.4 Name labels that disagree with the alias: 12 semantic colours

Every semantic colour carries a step in brackets, e.g. `color/border/2 (Neutral 40)`. On 12 of them the alias points somewhere else. The bracket always records **SLDS's default step**, so these are SLDS roles that were re-pointed in Figma without updating the name. They are listed in §6, which decides what to fix.

### 4.5 Semantic aliasing a semantic

`color/success/border-success-2` aliases `color/success/on-success-2` (another semantic), not a ramp step. It resolves to the same colour today, but it **follows** any future change to text-on-success. Re-point it at `color/success-base/30`.

### 4.6 Smaller set-up issues

| Item | Problem | Fix |
|---|---|---|
| `radius-border/circle` = 9999 | SLDS ships `100%`. On a non-square element 100% gives an ellipse, so the two are not interchangeable for pills | Keep 9999 in Figma for drawing. Note that code uses `100%`, and a pill in code needs `radius-border-4` or a project token |
| `Shadow/Elevation/1 - right ⮕` | **Identical to `- left ⬅`**: both cast the shadow left. Levels 2–4 are correct | Flip the x offsets: `+2` key, `-1` edge |
| Typography collection modes `Mac/iOS` and `Windows/Android` | Every value identical in both | Drop a mode, or give the second one its real values |
| `font/family/mobile` | Same value as `font/family/base`, no code syntax | Remove, or alias it to base |
| Names that carry their value, e.g. `spacing/2 (8px)` | The label goes stale the moment the value changes, which has already happened on the colour roles (§4.4) | Drop values from names |
| Text-style naming | `Underline Regular` / `Underlined Regular`; `Underlined Semi` / `Underlined Semibold` | Use one spelling |

### 4.7 Salesforce palette names holding MSD colours

`color/palette/green/*` holds **MSD teal** (`#35c0ba` at 50) and `palette/hot-orange/*` holds **MSD salmon** (`#f75c58`). The names are valid SLDS hooks, so importing them is correct. But every Lightning component that uses Salesforce's "green" palette (charts, avatars, some icons) would turn teal. If that isn't intended, give MSD's teal and salmon their own names.

---

## 5. The colour ramps: why they don't line up with SLDS, and the fix

The base ramps don't use the same steps as SLDS:

| Steps | 0 | 5 | 10 | 15 | 20 | 30 | 35 | 40 | 45 | 50 | 55 | 60 | 65 | 70 | 80 | 85 | 90 | 95 | 100 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| SLDS (`*-base-`) | n | · | ● | ● | ● | ● | · | ● | ● | ● | ● | ● | ● | ● | ● | · | ● | ● | ● |
| Figma (MSD ramps) | n | ● | ● | ● | ● | ● | ● | ● | · | ● | · | ● | ● | ● | ● | ● | ● | ● | n |

`●` the step exists · `n` neutral ramp only

**What this causes:**

1. **SLDS steps 45 and 55 have no MSD value.** They keep Salesforce's colours when the MSD ramps are switched on. Only `brand-base-45` is read today, by the active carousel indicator, which would stay Cosmos blue (`#045dec`). Nothing reads the other nine 45/55 steps yet, but an SLDS upgrade could start.
2. **Figma's 5, 35 and 85 have no SLDS name.** That's 21 variables across the five base ramps and the two MSD palettes. They're held in `--sep-*` tokens. That works, but a Lightning component can never reach them: only this site's own CSS can.
3. **Five semantic roles point at those Figma-only steps**, so their values can only exist in project tokens:

   | Semantic | Points at | SLDS points at |
   |---|---|---|
   | `container/3` | Neutral **85** | Neutral 90 |
   | `border-accent-2` | Electric Blue **35** | Brand 40 |
   | `on-error-1` | Pink **35** | Error 40 |
   | `on-error-2` (dark) | Pink **5** | Error 95 |
   | `on-success-2` (dark) | Teal **5** | Success 95 |

**The fix**, in order of preference:

1. **Add steps 45 and 55** to each MSD ramp in Figma, with code syntax `--slds-g-color-<ramp>-base-45/-55`. That closes gap 1.
2. **Decide whether 5/35/85 are needed.**
   - If they are only there to give a semantic an in-between shade, re-point the semantic at an SLDS step and delete the extra step. That closes gaps 2 and 3, and every colour becomes reachable from a hook.
   - If they're genuinely part of the MSD palette, keep them with **no** code syntax, as `neutral-base/85` already does. Then `--sep-*` remains their home.
3. Whichever route, **never give a Figma-only step an SLDS-looking code syntax.** That is the mistake in §4.1.

---

## 6. Semantic colours re-pointed away from SLDS's mapping

These are roles where Figma uses a **different ramp step from SLDS**, and the variable name still records the SLDS step. They are the "changed in Figma where they should use the hook's mapping" cases.

| Semantic (code syntax) | Name says | Figma aliases | SLDS uses | Effect |
|---|---|---|---|---|
| `--slds-g-color-border-2` | Neutral 40 | **Neutral 60** | Neutral 40 | Strong borders lighter |
| `--slds-g-color-surface-container-3` | Neutral 90 | **Neutral 85** | Neutral 90 | Not reachable from an SLDS step (§5) |
| `--slds-g-color-border-accent-2` | Electric Blue 40 | **EB 35** | Brand 40 | Not reachable from an SLDS step |
| `--slds-g-color-border-accent-3` | Electric Blue 30 | **EB 20** | Brand 30 | Darker |
| `--slds-g-color-on-error-1` | Pink 40 | **Pink 35** | Error 40 | Not reachable from an SLDS step |
| `--slds-g-color-on-error-2` | Pink 30 | **Pink 40** | Error 30 | Lighter |
| `--slds-g-color-on-warning-1` | Yellow 40 | **Yellow 30** | Warning 40 | Darker; likely a contrast fix |
| `--slds-g-color-on-success-1` | Teal 40 | **Teal 30** | Success 40 | Darker; likely a contrast fix |
| `--slds-g-color-border-warning-1` | (none) | Yellow 40 | **Warning 60** | Darker border |
| `--slds-g-color-on-disabled-2` | Neutral 50 | **Neutral 30** | Neutral 50 | Disabled text much darker |
| `--slds-g-color-border-disabled-1` | Neutral 50 | **Neutral 80** | Neutral 50 | Disabled border much lighter |
| `--slds-g-color-info-1`, `-info-container-1`, `-on-info-1` | Blue 40 / 90 / 40 | **Electric Blue** 30 / 90 / 30 (brand ramp) | **Info** ramp 40 / 90 / 40 | Info uses MSD brand blue, not Salesforce info blue |

**What to do:** for each row, the design owner should decide whether the change is intentional.

- **If it is** (for example, the darker on-warning and on-success look like contrast fixes), rename the variable so the bracket matches the alias. The name is the only thing out of step.
- **If it isn't**, re-point the alias at the SLDS step in the "SLDS uses" column.

The import follows the alias either way.

The info row is a special case. The info semantics use the **brand** ramp, while `color/information/*` (the info ramp) is Salesforce's own blue and goes unused. Either point info at the info ramp, or make the info ramp MSD's.

---

## 7. Styles and variables that don't use SLDS hooks

### 7.1 Text styles: 34

- **31 are bound correctly**: family, weight and size all come from the Typography variables.
- **None bind a line height.** Every style hard-codes one in px: 14, 17, 18, 19, 22, 28, 32, 35, 40, 50, 60. SLDS has line-height hooks (`--slds-g-font-line-height-1…6` = 1, 1.25, 1.375, 1.5, 1.75, 2), and Figma's ratios don't land on them. Body 16/18 is 1.125, and Titles 24/28 is 1.17. **Fix:** add line-height variables mapped to the SLDS steps, then bind them.
- **3 `_Style Guide/*` styles** (SF Pro and Courier) are documentation-only and bind nothing. That's fine if they never reach a component.

### 7.2 Effect styles: 30

| Styles | Binding | Hook |
|---|---|---|
| `Shadow/Elevation/1–4` (16) | Bound to `shadows/level N/*` | `--slds-g-shadow-*`. Clean, apart from §4.6 |
| `Focus/Outline`, `/Outset`, `/Inset`, `/Inset-inverse` (4) | Bound to semantic colours | `--slds-g-shadow-*-focus-1`. Clean |
| `Shadow/Buttons/Default`, `/Hover/Brand` | Bound to `shadows/level 1/1+2`, but 0 4px 8px is **not** an SLDS elevation | Only private `--slds-s-button-*` hooks reach a button shadow |
| `Shadow/Buttons/Hover/Neutral`, `/Inverse` | Bound to `neutral-button-bevel` | Private only |
| `Shadow/Buttons/Hover/Destructive`, `/Destructive-text`, `/Success` | Bound to the bevel variables | `--slds-c-button-destructive-shadow-hover`, `-success-shadow-hover` |
| `Shadow/Buttons/Active` | **Raw black, not bound** | Private only |
| `Shadow/Inputs/Checked`, `/Active` | **Raw black, not bound** | No hook, public or private |

**Fix:** bind the raw-black layers in the last two rows to shadow variables. Treat the button and input shadows as designs code can reach only partly: three of them have a public hook.

### 7.3 Component colour variables: 14, no code syntax

> **Correction, 2026-10-19:** `lightning-button` does not read the `--slds-c-button-destructive-*` or `-success-*` hooks below. They exist only for SLDS's light-DOM button markup. In `lightning-button` these colours come from `--slds-g-color-error-*` / `success-*`, re-pointed on the variant's host. See `_docs/component-review-button-2026-10-19.md` §2.

`color/component hooks/*`. Most have a public component hook. Add the hook as their code syntax so the export says where each one goes:

| Variable | Public hook |
|---|---|
| `destructive-button-container-1` / `-2` | `--slds-c-button-destructive-color-background` / `-background-hover` |
| `on-destructive-button-1` / `-2` | `--slds-c-button-destructive-color` / `-color-hover` |
| `success-button-container-1` / `-2`, `on-success-button-1` / `-2` | `--slds-c-button-success-*` (the same four) |
| `destructive-button-bevel`, `success-button-bevel` | Used by shadow styles, reaching `--slds-c-button-*-shadow-hover` |
| `modal backdrop` | `--slds-c-modalbase-backdrop-color-background`. Its light value comes from the Salesforce library (`Neutral/20`, solid `#2e2e2e`); a backdrop is usually translucent |
| `neutral-button-bevel`, `brand-button-bevel` | No public hook. `brand-button-bevel` is bound by no style at all |
| `list item drag` | No hook. Hard-coded `#134276cc`, not an alias of `brand-base/30` with opacity |

### 7.4 Variables from other libraries, found on the Accordion page

The first read of the Accordion page (node `15420:3695`) found the components there binding variables that are **not** among this file's local variables:

| Bound in the Accordion components | Value | Should be |
|---|---|---|
| `K1 - Text/XLarge, Reg`, `/Large, Bold`, `/Medium, Semi`; `text/font-scale-2 semi`; `text/font-scale-3` | **SF Pro / SF Pro Display**, negative letter-spacing | `Body/*` / `Titles/*` text styles (Atkinson, SLDS-bound) |
| `padding/spacing-2`, `padding/spacing-10` | 8, **48** | `spacing/2`, `spacing/8`. `padding/spacing-10` is 48 where `spacing/10` is 64, so the names collide |
| `sizing/sizing-6` | 20 | `sizing/6` |
| `Lines/Tier 3 (Neutral 80)` | `#C9C9C9` (Salesforce neutral 80) | `color/border/1` (`#c5c5c5`) |
| `Alert/Warning/50 Warning` | `#A86403` | `color/warning/*`. That value isn't on MSD's warning ramp |
| `Icon/Success Icon (Teal 40)` | `#056764` | `color/success/1`. Not on the success ramp |
| `Icon/Danger Icon (Pink 40)` | `#B60554` | `color/error/1`. Not on the error ramp |

These come from the linked libraries (MSD-Components, MSD-Layout-Spacing and others). They show components that **bypass the SLDS-named variables**, so the import can't see them.

This was one page only. **Fix:** re-bind these on the Accordion components, and scan the other component pages for the same bindings. The library list also shows several other typography sets attached (Noto Sans, Open Sans, Segoe UI, Source Sans/Montserrat); any of them could be bound the same way.

---

## 8. Fix list for the Figma file

Highest impact first.

1. **Clear the code syntax on the 23 palette 35/85/5 steps** (§4.1). Today they overwrite real steps on export.
2. **Fix `success-base/65`'s garbled code syntax, and `font/scale/base` → `--slds-g-font-scale-base`** (§4.1).
3. **Decide font weight 6**: Medium 500 or SemiBold 600, and rename the "Semibold" text styles to match (§4.2).
4. **Add ramp steps 45 and 55** to the MSD ramps, and settle 5/35/85 as described in §5.
5. **Review the 12 re-pointed semantic colours** (§6). Keep each one and fix its name, or restore SLDS's step. Decide the info ramp.
6. **Re-bind the Accordion components** off the SF Pro and other-library variables (§7.4), and scan the other pages.
7. **Add line-height variables** mapped to `--slds-g-font-line-height-*`, and bind them in the text styles (§7.1).
8. **Add code syntax** to `neutral-base/0`, `information/35` and the component colour variables (§4.3, §7.3). Remove `spacing/0`'s.
9. Fix `Elevation/1 - right`; bind the raw-black button and input shadows (§4.6, §7.2).
10. Tidy-ups: the duplicate Typography mode, `font/family/mobile`, values in names, text-style spelling (§4.6). Decide whether MSD teal and salmon should keep Salesforce's palette names (§4.7).
