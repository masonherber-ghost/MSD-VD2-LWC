# Component review: Button (`lightning-button`)

A review of the MSD-themed button design against the shipped `lightning-button`, out of the box first. Nothing has been built. This document records what the component already does, which supported lever reaches each difference, and what needs a decision.

| | |
|---|---|
| Design | `figma.com/design/3FTyjvu0JC5UtYqnoLqDFh`, node `18216:94008` ("Button Examples"), page "⚡ Button" |
| Component sets reviewed | 7 sets × 5 states (Default, Hover, Focus, Active, Disabled) |
| Shipped component | `lightning-button` (`lightning-base-components` 1.28.19-alpha), shadow stylesheet `button/button.slds.css` |
| Tokens in force | `src/assets/css/design-tokens.css`, Figma import C1–C4 live |
| Produced by | the `lwc-component-review` skill, 2026-10-19 |

---

## Summary

**The button is buildable on the shipped component.** Every Figma variant has a matching `variant`, and much of the design is already what the component renders with MSD's tokens. That includes the brand fills, the neutral and destructive-text disabled states, the pill radius, the active-press shadow and the gap.

Across the 7 variants × 5 states, plus the shared properties, 87 rows were reviewed:

| Verdict | Rows | Meaning |
|---|---:|---|
| **OOTB** | 30 | Already renders the design value; no work |
| **≈ OOTB** | 3 | A near match (within a few RGB points, or one shade); recommend accepting the component's value |
| **Hook** | 26 | A public `--slds-c-button-*` hook reaches it |
| **Scoped global** | 14 | Reachable only by re-pointing a `--slds-g-*` token on that variant's host |
| **Host property** | 2 | A plain CSS property on `lightning-button`, inherited in (font size, weight) |
| **Unreachable** | 9 | Only a private `--slds-s-*` hook, or a closed internal value, would reach it |
| Follows another state | 3 | Active rows that resolve exactly as Hover |

**Six questions block building** (§7). The two that matter most:

1. **Destructive and Success are solid in Figma, but tinted in Cosmos out of the box.** `lightning-button` fills them from `--slds-g-color-error-container-1` / `success-container-1`, which in Cosmos (and MSD's ramps) are **pale tints with dark text**. The design's solid red and green buttons with white text are reachable, but only by re-pointing five global tokens on each variant's host.
2. **Five design values have no public hook at all:**
   - the hover elevation (brand, neutral)
   - the 2px border (neutral, destructive-text, inverse)
   - base's 4px side padding
   - base's border on press
   - inverse's transparent focus
   
   Each needs either acceptance of the component's value or a `::part` rule, which is on the edge of what's allowed.

---

## 1. Variant map

| Figma component set | `variant` | Notes |
|---|---|---|
| ⚡ Button - Brand | `brand` | |
| ⚡ Button - Neutral | `neutral` (the default) | The component reflects `variant="neutral"` even when the attribute is omitted, so `[variant='neutral']` is a safe selector |
| ⚡ Button - Base | `base` | |
| ⚡ Button - Destructive | `destructive` | |
| ⚡ Button - Destructive Text | `destructive-text` | |
| ⚡ Button - Success | `success` | |
| ⚡ Button - Inverse | `inverse` | Drawn on a navy background frame |
| — | `brand-outline` | Ships, but not in the design |

No Figma variant lacks a shipped equivalent, so the custom-component gate doesn't apply.

**Not covered by the design:** icons (every icon slot is hidden in all 35 variants), sizes, `stretch`, and the stateful/pressed button.

---

## 2. How `lightning-button` takes styling: the constraint behind every verdict

`lightning-button` styles itself from its **own shadow stylesheet**, not the global SLDS sheet. `hook-map.mjs button` gives the facts:

- **19 open component hooks** can be set on the host and inherit in:
  - every `--slds-c-button-brand-*` hook
  - `--slds-c-button-radius-border`
  - `--slds-c-button-neutral-shadow` and `-shadow-focus`
  - `--slds-c-button-neutral-spacing-block` and `-spacing-inline`
  - `--slds-c-button-neutral-font-lineheight`
- **12 `--slds-c-button-neutral-*` colour hooks are closed** for every variant except neutral. The base, inverse, destructive, destructive-text and success rules each **declare** them inside the shadow root from global tokens. A value set on the host loses to that declaration. For those variants the only supported lever is the global token they read, re-pointed on that variant's host.
- **`--slds-c-button-destructive-*` and `--slds-c-button-success-*` are never read.** They exist in the global stylesheet for SLDS's light-DOM `.slds-button_destructive` markup. `lightning-button` doesn't use them. (`design-tokens.css` §D listed them as the targets; corrected alongside this review.)
- **Font size, font weight, border width, and the hover and active shadows** read only private `--slds-s-button-*` / internal `--sds-c-button-*` hooks. Size and weight fall back to inheritance, so a plain property on the host reaches them. Border width falls back to a literal `1px`, and the shadows to Cosmos's own values, so nothing public reaches those.

A hook set on bare `lightning-button` reaches every variant that doesn't close it. Every recommendation below is therefore scoped by `[variant='…']`.

---

## 3. Shared properties

| Property | Design | OOTB today | Verdict | Lever |
|---|---|---|---|---|
| Radius | `radius-border/circle` (9999px), a pill | Pill: `--slds-s-button-radius-border` → `--slds-g-radius-border-pill` (15rem) | **OOTB** | None. **Don't** map the Figma binding: in CSS `--slds-g-radius-border-circle` is `100%`, an ellipse (§5) |
| Gap, label to icon | `spacing/2` (8px) | `--slds-g-spacing-2` | **OOTB** | — |
| Font family | `font/family/base` | Atkinson, via the live `::part(button) { font-family: inherit }` in `site.css` | **OOTB** | — |
| Font size | `font/scale/1` (18px) | Inherits the page size (16px) | **Host property** | `lightning-button { font-size: var(--slds-g-font-scale-1) }`. No public hook exists; the component's own fallback is `inherit` |
| Font weight | `font/weight/6`, "Medium" (500) | Inherits 400 | **Host property** | `lightning-button { font-weight: var(--slds-g-font-weight-6) }`. Same reasoning |
| Line height | 19px, hard-coded in the text style | `1.875rem` (30px) | **Hook** | `--slds-c-button-neutral-font-lineheight`. No token is 19px: `--slds-g-font-line-height-1` (1 → 18px) is the nearest. **Question 6** |
| Padding, block | `spacing/4` (16px) | 0; height comes from line-height | **Hook** | `--slds-c-button-neutral-spacing-block: var(--slds-g-spacing-4)` (all variants) |
| Padding, inline | `spacing/5` (24px) | `--slds-g-spacing-4` (16px) | **Hook** | `--slds-c-button-neutral-spacing-inline: var(--slds-g-spacing-5)` (all variants except base) |
| Height | 51px (16 + 19 + 16) | 32px | Follows the three rows above | Code adds the border to the box (Figma strokes sit inside), so a 1px border gives 52px and a 2px border 54px. **Question 6** |
| Border width | `sizing-border/2` (2px) on neutral, destructive-text, inverse | 1px on every variant | **Unreachable** | Only `--slds-s-button-sizing-border` (private) or `::part(button) { border-width }` (rung 7). **Question 3** |
| Shadow, rest | `Shadow/Buttons/Default`: 0 4px 8px navy at 20%, on brand and neutral only | None | **Hook** | `--slds-c-button-neutral-shadow`, scoped to `[variant='brand']`, `[variant='neutral']`. No SLDS elevation is 0 4 8, so the value is written from Figma: `0 4px 8px 0 var(--sep-color-shadow-1)` |
| Shadow, hover | `Shadow/Buttons/Hover/Brand`: 0 8px 16px, on brand and neutral | None | **Unreachable** | Only `--slds-s-button-shadow-hover` (private) or `::part(button):hover`. **Question 3** |
| Shadow, active (press) | `Shadow/Buttons/Active`, three inset layers | Cosmos's `--slds-s-button-shadow-active`, **identical layer for layer** | **OOTB** | — (on base too; see §4.3) |

## 4. Per variant

Colours are resolved through `design-tokens.css` as it stands, with C1–C4 live. "Design" is the Figma binding and its value.

### 4.1 Brand: `variant="brand"`

| State | Property | Design | OOTB today | Verdict | Lever |
|---|---|---|---|---|---|
| Default | Fill | `accent-container-1` #017ac9 | `accent-container-1` #017ac9 | **OOTB** | — |
| Default | Border | none | `border-accent-1` #017ac9 (same as the fill, so invisible) | **OOTB** | — |
| Default | Text | `on-accent-1` #fff | `on-accent-1` #fff | **OOTB** | — |
| Hover | Fill | `accent-container-2` #006aaf | `accent-container-2` #006aaf | **OOTB** | — |
| Hover | Border | none | `border-accent-2` #005b96 (a visible darker ring) | **Hook** | `--slds-c-button-brand-color-border-hover: var(--slds-g-color-accent-container-2)` |
| Hover | Text | `on-accent-2` #fff | `on-accent-1` #fff | **OOTB** | One text hook for all states; the values are equal |
| Focus | Fill | `accent-container-1` #017ac9 (stays at rest) | `accent-container-2` #006aaf | **Hook** | `--slds-c-button-brand-color-background-focus: var(--slds-g-color-accent-container-1)` |
| Focus | Border | none | #005b96 | **Hook** | `--slds-c-button-brand-color-border-focus: var(--slds-g-color-accent-container-1)` |
| Focus | Ring | `Focus/Inset-inverse` | Cosmos outset ring | **Hook** | `--slds-c-button-neutral-shadow-focus: var(--slds-g-shadow-inset-inverse-focus-1)` |
| Active | Fill | `accent-container-2` #006aaf | #006aaf | **OOTB** | — |
| Active | Border | none | #005b96 | **Hook** | `--slds-c-button-brand-color-border-active: var(--slds-g-color-accent-container-2)` |
| Disabled | Fill | `disabled-container-1` #e7e7e7 | `disabled-container-2` #c5c5c5 | **Scoped global** | `--slds-g-color-disabled-container-2: var(--slds-g-color-disabled-container-1)` on the host. **Question 2** |
| Disabled | Text | `on-disabled-1` #666666 | `on-disabled-2` #434343 | **Scoped global** | `--slds-g-color-on-disabled-2: var(--slds-g-color-on-disabled-1)`. **Question 2** |

### 4.2 Neutral: `variant="neutral"`

Neutral is the one variant whose `--slds-c-button-neutral-*` colour hooks are all **open**.

| State | Property | Design | OOTB today | Verdict | Lever |
|---|---|---|---|---|---|
| Default | Fill | `surface-container-1` #fff | #fff | **OOTB** | — |
| Default | Border | `border-accent-1` #017ac9 | `border-2` #848484 (grey) | **Hook** | `--slds-c-button-neutral-color-border` |
| Default | Text | `on-surface-2` #323232 | `accent-2` #006aaf (blue) | **Hook** | `--slds-c-button-neutral-text-color` |
| Hover | Fill | `surface-container-2` #f8f8f8 | #f8f8f8 | **OOTB** | — |
| Hover | Border | `border-accent-3` #0e345e | #848484 | **Hook** | `--slds-c-button-neutral-color-border-hover` |
| Hover | Text | `on-surface-3` #092647 | `accent-3` #134276 | **Hook** | `--slds-c-button-neutral-text-color-hover`. **Question 5** |
| Focus | Fill | `surface-container-1` #fff | #f8f8f8 | **Hook** | `--slds-c-button-neutral-color-background-focus` |
| Focus | Border | `border-2` #848484 | #848484 | **OOTB** | But it is grey on focus after blue at rest. **Question 5** |
| Focus | Text | `accent-2` #006aaf | `accent-3` #134276 | **Hook** | `--slds-c-button-neutral-text-color-focus` |
| Focus | Ring | `Focus/Inset` | Cosmos outset ring | **Hook** | `--slds-c-button-neutral-shadow-focus: var(--slds-g-shadow-inset-focus-1)` |
| Active | Fill | #f8f8f8 | #f8f8f8 | **OOTB** | — |
| Active | Border | `border-accent-3` #0e345e | #848484 | **Hook** | `--slds-c-button-neutral-color-border-active` |
| Active | Text | `accent-3` #134276 | `accent-3` | **OOTB** | — |
| Disabled | Fill | `disabled-container-1` | same | **OOTB** | — |
| Disabled | Border | `border-disabled-1` | same | **OOTB** | — |
| Disabled | Text | `on-disabled-1` | same | **OOTB** | — |

### 4.3 Base: `variant="base"`

| State | Property | Design | OOTB today | Verdict | Lever |
|---|---|---|---|---|---|
| All | Fill and border | none | transparent | **OOTB** | — |
| Default | Text | `accent-2` #006aaf | `accent-2` | **OOTB** | — |
| Hover | Text | `accent-3` #134276 | `accent-3` | **OOTB** | — |
| Focus | Text | `accent-2` #006aaf | `accent-3` | **Hook** | `--slds-c-button-neutral-text-color-focus` on `[variant='base']` (base leaves it open) |
| Focus | Ring | `Focus/Outline` | Cosmos outset ring | **Hook** | `--slds-c-button-neutral-shadow-focus: var(--slds-g-shadow-outline-focus-1)` |
| Active | Text | `accent-3` | `accent-3` | **OOTB** | — |
| Active | Border | none | `border-accent-2` #005b96, a visible outline on press | **Unreachable** | Base closes `-color-border-active`. A scoped `--slds-g-color-border-accent-2: transparent` would reach it, but that redefines a semantic token as "nothing". **Question 4** |
| Active | Shadow | none | Cosmos's inset press shadow | **Unreachable** | Private hook only |
| Disabled | Text | `on-disabled-1` | same | **OOTB** | — |
| All | Inline padding | `spacing/1` (4px) | 0, closed by base | **Unreachable** | **Question 4** |

### 4.4 Destructive: `variant="destructive"`

Every colour row here is closed: the variant computes its colours from the error tokens. The lever is to re-point those tokens on this host only. **Question 1** decides whether to do it at all.

| State | Property | Design | OOTB today | Verdict | Lever (if Q1 = solid) |
|---|---|---|---|---|---|
| Default | Fill | `destructive-button-container-1` → Pink 50 #d03633 | `error-container-1` #f6d7d6 (pale) | **Scoped global** | `--slds-g-color-error-container-1: var(--slds-g-color-error-base-50)` |
| Default | Border | none (matches the fill) | `border-error-1` #a62b29 | **Scoped global** | `--slds-g-color-border-error-1: var(--slds-g-color-error-base-50)` |
| Default | Text | `on-destructive-button-1` #fff | `on-error-1` #922624 (dark red) | **Scoped global** | `--slds-g-color-on-error-1: var(--slds-g-color-neutral-base-100)` |
| Hover | Fill | `…container-2` → Pink 40 #a62b29 | `error-container-2` #ecafad | **Scoped global** | `--slds-g-color-error-container-2: var(--slds-g-color-error-base-40)` |
| Hover | Border | none | `border-error-2` #7d201f | **Scoped global** | `--slds-g-color-border-error-2: var(--slds-g-color-error-base-40)` |
| Focus | Fill | Pink 50 (stays at rest) | `error-container-2`, the hover colour | **Unreachable** | Focus and hover read the same token. Accept the hover colour on focus |
| Focus | Ring | `Focus/Inset-inverse` | Cosmos outset | **Hook** | `--slds-c-button-neutral-shadow-focus` |
| Active | Fill | Pink 40 | as hover | follows Hover | — |
| Disabled | Fill and text | `disabled-container-1` / `on-disabled-1` | `disabled-container-2` / `on-disabled-2` | **Scoped global** | As brand. **Question 2** |

### 4.5 Destructive text: `variant="destructive-text"`

| State | Property | Design | OOTB today | Verdict | Lever |
|---|---|---|---|---|---|
| Default | Fill | `surface-container-1` #fff | #fff | **OOTB** | — |
| Default | Border | `border-error-1` #a62b29 | `border-2` #848484 | **Hook** | `--slds-c-button-neutral-color-border` on `[variant='destructive-text']` (left open) |
| All | Text | `error-1` #a62b29 | `error-1` | **OOTB** | — |
| Hover | Fill | `surface-container-2` | same | **OOTB** | — |
| Hover / Active | Border | `border-error-2` #7d201f | follows the default border (#a62b29) | **≈ OOTB** | The variant points hover, focus and active at the default border. One shade darker isn't reachable |
| Focus | Fill | `surface-container-1` #fff | `surface-container-2` | **Hook** | `--slds-c-button-neutral-color-background-focus` |
| Focus | Ring | `Focus/Inset-inverse` | Cosmos outset | **Hook** | `--slds-c-button-neutral-shadow-focus` |
| Disabled | Fill, border, text | `disabled-container-1`, `border-disabled-1`, `on-disabled-1` | same | **OOTB** | — |

### 4.6 Success: `variant="success"`

As destructive, with the success tokens. **Question 1.**

| State | Property | Design | OOTB today | Verdict | Lever (if Q1 = solid) |
|---|---|---|---|---|---|
| Default | Fill | `success-button-container-1` → Teal 50 #388314 | `success-container-1` #d7f2d2 (pale) | **Scoped global** | `--slds-g-color-success-container-1: var(--slds-g-color-success-base-50)` |
| Default | Border | none | `border-success-1` #256d00 | **Scoped global** | `--slds-g-color-border-success-1: var(--slds-g-color-success-base-50)` |
| Default | Text | #fff | `on-success-1` #175600 | **Scoped global** | `--slds-g-color-on-success-1: var(--slds-g-color-neutral-base-100)` |
| Hover | Fill | Teal 40 #256d00 | `success-container-2` #abd7a2 | **Scoped global** | `--slds-g-color-success-container-2: var(--slds-g-color-success-base-40)` |
| Focus | Fill | Teal 50 (stays at rest) | hover colour | **Unreachable** | As destructive |
| Focus | Ring | `Focus/Inset-inverse` | Cosmos outset | **Hook** | `--slds-c-button-neutral-shadow-focus` |
| Disabled | Fill and text | as brand | as brand | **Scoped global** | **Question 2** |

### 4.7 Inverse: `variant="inverse"`

| State | Property | Design | OOTB today | Verdict | Lever |
|---|---|---|---|---|---|
| Default | Fill | none | transparent | **OOTB** | — |
| Default | Border | `border-inverse-1` #f8f8f8 | `neutral-base-100` #fff | **≈ OOTB** | 3% apart; closed. Accept white |
| Default | Text | `on-surface-inverse-1` #fff | `on-accent-1` #fff | **OOTB** | — |
| Hover | Fill | `surface-container-2` #f8f8f8 | same | **OOTB** | — |
| Hover | Text | `accent-3` #134276 | `accent-2` #006aaf | **Scoped global** | Only by re-pointing `--slds-g-color-accent-2` to `accent-3` on the host, which makes one semantic token mean another. Recommend design adopts `accent-2`. **Question 4** |
| Hover | Shadow | `Shadow/Buttons/Hover/Neutral` (bevel) | none | **Unreachable** | Private only |
| Active | Fill and text | as hover | as hover | follows Hover | — |
| Focus | Fill | transparent (on navy) | `surface-container-2` #f8f8f8 | **Unreachable** | Closed; the only global is the hover fill too. **Question 4** |
| Focus | Text | `on-surface-inverse-1` #fff | `accent-3` | **Hook** | `--slds-c-button-neutral-text-color-focus` on `[variant='inverse']` (left open). But it is white on the light focus fill above |
| Focus | Ring | `Focus/Inset-inverse` | Cosmos outset | **Hook** | `--slds-c-button-neutral-shadow-focus` |
| Disabled | Border and text | `border-inverse-1` / `on-surface-inverse-1`, **the same as Default** | `border-disabled-2` / `disabled-2` → `neutral-base-40` #545454 | **≈ OOTB** | Recommend the component's value. A disabled state identical to rest gives the user no signal. **Question 4** |

---

## 5. Assumptions the Figma bindings invite

These are the readings a developer would naturally take from the variable names, and why each is wrong or incomplete in code.

| Binding in Figma | The natural assumption | What is actually true |
|---|---|---|
| Brand fill → `accent-container-1` / `-2` | — | **Correct.** Brand references the **semantic** accent tokens, not a blue hue (`brand-base-50`), which is exactly what the component reads. No hue-for-role problem on brand |
| Destructive and Success fills → `color/component hooks/destructive-button-container-1`, `success-button-container-1` | "These are component hooks; set `--slds-c-button-destructive-color-background`" | **Two wrong turns.** (1) `lightning-button` never reads the `destructive` or `success` hooks. (2) The variables alias **ramp hues** (Pink 50, Teal 50), where SLDS reads **semantic** tokens (`error-container-1`, `success-container-1`). Those mean a pale tint in Cosmos. The design's solid fill is a deliberate departure from Cosmos, not a re-skin |
| Text on destructive and success → `on-destructive-button-1` (#fff) | "SLDS's `on-error-1` is the white text on a red button" | In Cosmos, `on-error-1` is the **dark** text on the pale container (#922624 with MSD's ramps). White comes only from re-pointing it |
| Radius → `radius-border/circle` | "Set `--slds-c-button-radius-border: var(--slds-g-radius-border-circle)`" | In CSS that token is `100%`, so the button becomes an **ellipse**. The button is already a pill out of the box (`--slds-g-radius-border-pill`, 15rem). Figma has no pill variable; add one with code syntax `--slds-g-radius-border-pill` |
| Neutral border → `border-accent-1` | "A border token, so the component's default" | Neutral's default border is `border-2` (grey). Blue is an MSD choice and needs a hook |
| Hover and active text → `on-accent-2` | "There is a per-state brand text colour" | The component has **one** brand text hook for every state. Harmless because the values are equal; they would split if `on-accent-2` ever changes |
| Brand disabled → `disabled-container-1` / `on-disabled-1` | "The SLDS disabled tokens" | They are, but SLDS uses the **`-2`** pair for filled buttons (brand, destructive, success) and the `-1` pair for outlined ones. The design uses `-1` everywhere |
| Text style "Body/font-scale-1/**Semibold**" | Weight 600 | The style uses Atkinson **Medium** (500) via `font/weight/6`. See the Figma tokens report §4.2 |
| Focus → effect on the outer frame, which has a transparent `RAW` fill | "There is a wrapper element" | In code the ring is the button's own `box-shadow` (`--slds-c-button-neutral-shadow-focus`). There is no wrapper |
| Inverse focus → outer frame filled `surface-container-inverse-2` | "The button paints navy on focus" | That is the page behind the button. The component paints `surface-container-2` (light grey) on focus |
| Stroke weight → `sizing-border/2` | "Bound to a token, so settable" | Border width is reachable only through a private hook |
| Height 51px | "Same size in code" | Figma strokes sit inside the frame; CSS borders add to it. At the same padding a coded button is 52px (1px border) or 54px (2px) |

## 6. Figma hygiene

- **Inverse Disabled is identical to Inverse Default:** same border, same text.
- **Stroke weights vary:** 2px on most bordered states, but 1px on Destructive Focus and Inverse Focus.
- **`itemSpacing` is unbound** on the Active state of Neutral, Destructive, Destructive Text and Success (8px, but no variable).
- **Line height is hard-coded:** 19px, from the text style. There is no line-height variable (Figma tokens report §7.1).
- **The focus states' outer frames have a `RAW` transparent fill.** It's harmless, but it's the only unbound colour in the set.
- **Three effect styles are bound to nothing here:**
  - `Shadow/Buttons/Hover/Destructive` and `/Success` (Destructive and Success hover show no shadow)
  - `brand-button-bevel` (no style uses it)

---

## 7. Questions: please answer before building

**1. Destructive and Success: solid (Figma) or tinted (Cosmos)?**
- **Solid:** re-point five error or success tokens on each variant's host (§4.4, §4.6). It's supported (rung 5), but these two variants then use the error and success tokens differently from every other Lightning component.
- **Tinted:** no code needed. The buttons render pale with dark text, like every other Cosmos status surface.
- *Recommendation:* **solid**, if MSD wants destructive actions to read as primary. Confirm it with the design owner, because it is the larger departure from Lightning.

**2. Disabled filled buttons (brand, destructive, success): Figma's `-1` pair or SLDS's `-2` pair?**
The design uses `disabled-container-1` / `on-disabled-1` (#e7e7e7 / #666666); SLDS uses `-2` (#c5c5c5 / #434343).
- *Recommendation:* **adopt SLDS's `-2` pair in Figma.** It needs no code, and it keeps filled and outlined disabled buttons distinct. Otherwise it's two scoped globals per variant.

**3. Hover elevation and 2px borders: accept the component, or use `::part`?**
No public hook reaches them:
- the brand and neutral hover shadow (0 8 16)
- the 2px border on neutral, destructive-text and inverse

`lightning-button::part(button)` would reach both (rung 7, on the line). This site already uses `::part` once, for the font family.
- *Recommendation:* **accept the component**: no hover lift, 1px borders. If the 2px border matters, ask for `::part` explicitly. Don't use the private `--slds-s-button-*` hooks.

**4. Base and Inverse details: change the design to the component's behaviour?**
- Base: 0 side padding (design 4px); a border appears on press (design none).
- Inverse: hover text `accent-2` (design `accent-3`); a light focus fill (design transparent); a grey disabled state (design identical to default).
- *Recommendation:* **take the component's behaviour for all five.** The only alternatives are redefining semantic tokens on the host, and the inverse disabled state in Figma looks like an oversight.

**5. Neutral: are the text and border shifts intended?**
- Text goes `on-surface-2` → `on-surface-3` on hover, then `accent-3` on active.
- The border goes blue at rest → navy on hover → **grey on focus**.

All of these are reachable with hooks. The question is whether they're deliberate: the grey focus border in particular looks unintended.

**6. Height and line height: what should the coded button measure?**
The design's 19px line height has no token.
- With `--slds-g-font-line-height-1` (18px) and 16px block padding, the button is 52px with a 1px border.
- Matching 51px exactly needs a raw line height.
- *Recommendation:* **use `--slds-g-font-line-height-1` and accept 52px.** Ask design to add line-height variables.

---

## 8. Build plan, if the recommendations are accepted

Not applied. Per `rules-skinning.md` this goes in `site.css` § *Component skins*, set on the tag and scoped by variant. Every hook below comes from `hook-map.mjs button`.

```css
/* All variants — type and size. */
lightning-button {
    font-size: var(--slds-g-font-scale-1);                   /* host property, inherited */
    font-weight: var(--slds-g-font-weight-6);                /* host property, inherited */
    --slds-c-button-neutral-font-lineheight: var(--slds-g-font-line-height-1);
    --slds-c-button-neutral-spacing-block: var(--slds-g-spacing-4);
    --slds-c-button-neutral-spacing-inline: var(--slds-g-spacing-5);
}

/* Resting elevation — brand and neutral only. */
lightning-button[variant='brand'],
lightning-button[variant='neutral'] {
    --slds-c-button-neutral-shadow: 0 4px 8px 0 var(--sep-color-shadow-1);
}

/* Focus rings, per the design. */
lightning-button[variant='brand'],
lightning-button[variant='destructive'],
lightning-button[variant='destructive-text'],
lightning-button[variant='success'],
lightning-button[variant='inverse'] {
    --slds-c-button-neutral-shadow-focus: var(--slds-g-shadow-inset-inverse-focus-1);
}
lightning-button[variant='neutral'] { --slds-c-button-neutral-shadow-focus: var(--slds-g-shadow-inset-focus-1); }
lightning-button[variant='base'] {
    --slds-c-button-neutral-shadow-focus: var(--slds-g-shadow-outline-focus-1);
    --slds-c-button-neutral-text-color-focus: var(--slds-g-color-accent-2);
}

/* Brand — no visible border; focus keeps the rest fill. */
lightning-button[variant='brand'] {
    --slds-c-button-brand-color-border-hover: var(--slds-g-color-accent-container-2);
    --slds-c-button-brand-color-border-active: var(--slds-g-color-accent-container-2);
    --slds-c-button-brand-color-background-focus: var(--slds-g-color-accent-container-1);
    --slds-c-button-brand-color-border-focus: var(--slds-g-color-accent-container-1);
}

/* Neutral — MSD's blue outline and dark text. Question 5 may change hover and focus. */
lightning-button[variant='neutral'] {
    --slds-c-button-neutral-color-border: var(--slds-g-color-border-accent-1);
    --slds-c-button-neutral-color-border-hover: var(--slds-g-color-border-accent-3);
    --slds-c-button-neutral-color-border-active: var(--slds-g-color-border-accent-3);
    --slds-c-button-neutral-text-color: var(--slds-g-color-on-surface-2);
    --slds-c-button-neutral-text-color-hover: var(--slds-g-color-on-surface-3);
    --slds-c-button-neutral-text-color-focus: var(--slds-g-color-accent-2);
    --slds-c-button-neutral-color-background-focus: var(--slds-g-color-surface-container-1);
}

/* Destructive text — red outline. */
lightning-button[variant='destructive-text'] {
    --slds-c-button-neutral-color-border: var(--slds-g-color-border-error-1);
    --slds-c-button-neutral-color-background-focus: var(--slds-g-color-surface-container-1);
}

/* Destructive and success — ONLY if Question 1 = solid. Rung 5: globals scoped to the host. */
lightning-button[variant='destructive'] {
    --slds-g-color-error-container-1: var(--slds-g-color-error-base-50);
    --slds-g-color-error-container-2: var(--slds-g-color-error-base-40);
    --slds-g-color-border-error-1: var(--slds-g-color-error-base-50);
    --slds-g-color-border-error-2: var(--slds-g-color-error-base-40);
    --slds-g-color-on-error-1: var(--slds-g-color-neutral-base-100);
}
lightning-button[variant='success'] {
    --slds-g-color-success-container-1: var(--slds-g-color-success-base-50);
    --slds-g-color-success-container-2: var(--slds-g-color-success-base-40);
    --slds-g-color-border-success-1: var(--slds-g-color-success-base-50);
    --slds-g-color-border-success-2: var(--slds-g-color-success-base-40);
    --slds-g-color-on-success-1: var(--slds-g-color-neutral-base-100);
}
```

After building:
- Read the computed values off a rendered button, per variant and state (`rules-skinning.md` § *Verifying*). Three hooks on this project have already turned out to be no-ops, so a compiled hook proves nothing on its own.
- Check what the existing `site.css` button rules (some still in `[OFF]` blocks) would duplicate.

---

## Method

- **Design:** `get_metadata` on `18216:94008`, then `use_figma`. Each example instance was followed to its main component set (`18216:105081`–`105086`, `591:148378`). Each of the 35 variants was walked for fills, strokes, stroke weight, effect style, text style, font, padding, gap, radius, size, and the variable bound to each, printing the Web code syntax where present.
- **Component:** `node .claude/skills/lwc-component-review/hook-map.mjs button` (rules, OPEN and CLOSED hooks, globals, private), plus a read of `button/button.slds.css` lines 181–470 for each variant's chain. Shared defaults (`--slds-s-button-*`) come from the shipped Cosmos sheet.
- **OOTB values:** resolved through `design-tokens.css` with C1–C4 live.
- **Verdict counts:** re-counted from the tables before saving.
