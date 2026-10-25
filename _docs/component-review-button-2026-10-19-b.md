# Component review: Button (`lightning-button`), after the build

A second review of the MSD button design. It's written **after** the skin was built, so it compares the design with what the site **renders now**, as measured in Chrome, not with what the component would do untouched. The first review ([component-review-button-2026-10-19.md](component-review-button-2026-10-19.md)) is the out-of-the-box analysis. This one is the acceptance check.

| | |
|---|---|
| Design | `figma.com/design/3FTyjvu0JC5UtYqnoLqDFh`: examples `18216:94008`, guidelines `18216:93964`, components `18216:93959`. Component sets `18216:105081`–`105086`, `591:148378` |
| Design read | 2026-10-19, after the build. Unchanged since the build (same bindings, padding 12/24, line height 137.5%, Medium 18, 1.5px outline) |
| Rendered | `lightning-button` with the "MSD Button" skin in `site.css`, tokens from `design-tokens.css` |
| Measured | Headless Chrome. The shipped examples were moved into the light DOM and each state forced with CDP `CSS.forcePseudoState` (`.claude/skills/component-from-design/measure-states.mjs`) |

---

## Summary

**The coded button matches the design on 122 of the 142 values compared** (86%). 4 more are near-matches. 16 differ, and every one of those has a known cause. *Updated 2026-10-20: side padding and the hover lift now match, through legacy, unsupported `--sds-c-*` variables (§8).*

| | Values | Cause |
|---|---:|---|
| **Match** | 122 | — |
| **≈ Near** | 4 | Inverse border: white vs `#f0f0f0`; height: 50.75 vs 49px. Accepted |
| **Differs — decided** | 16 | Gaps you chose to accept (2026-10-19): 1px outline, and the base, destructive, destructive-text and inverse details |
| **Differs — new** | 0 | Side padding was the one new gap; it now matches (§8) |
| **Total** | **142** | |

**Questions that remain** (§6):
1. ~~**Side padding:** accept 16px, or reach 24px with `::part`?~~ Answered 2026-10-20: legacy `--sds-c-*` variables, unsupported (§8).
2. **Update the Figma file to what ships**, for the 16 accepted gaps, so design and site stop disagreeing?
3. **Inverse disabled** is drawn identical to inverse default. Is that a mistake?

---

## 1. Variant map

| Figma | `variant` | Rendered |
|---|---|---|
| ⚡ Button - Brand | `brand` | skinned |
| ⚡ Button - Neutral | `neutral` (default) | skinned |
| ⚡ Button - Base | `base` | skinned (focus) |
| ⚡ Button - Destructive | `destructive` | skinned, solid |
| ⚡ Button - Destructive Text | `destructive-text` | skinned |
| ⚡ Button - Success | `success` | skinned, solid |
| ⚡ Button - Inverse | `inverse` | type and size only; colours are Lightning's |

## 2. Shared properties

| Property | Design | Rendered | |
|---|---|---|---|
| Font | Atkinson, Medium, 18px | Atkinson, 500, 18px | ✓ |
| Line height | 137.5% | 24.75px (1.375) | ✓ |
| Block padding | 12px (`spacing-3`) | 10.5px + 1.5px border | ✓ via `::part(button)` (2026-10-26): the padding gives back the border width, as Figma's inside stroke does |
| Inline padding | 24px (`spacing-5`); base 4px | 22.5px + 1.5px border; base 2.5px + 1.5px | ✓ via `::part(button)` (2026-10-26), replacing the legacy `--sds-c-button-spacing-inlinestart`/`-inlineend`. The public `--slds-c-button-neutral-spacing-inline` never applies: SLDS ships its declaration with a stray `;` |
| Gap, icon to label | 8px | 8px | ✓ |
| Icon size and colour (slots hidden in the design) | 14px, label colour | 14px (`0.875rem`), `currentColor` | ✓ |
| Radius | pill | pill (`--slds-g-radius-border-pill`) | ✓ |
| Height | 49px | 48.75px on 2x screens; 47.75px on 1x | ✓ on Retina, 1px short on 1x — accepted, option A (2026-10-26; was 50.75px) |
| Outline width (neutral, destructive-text, inverse) | 1.5px | 1.5px on 2x screens; 1px on 1x | ✓ via `::part(button)` (2026-10-26). Browsers snap borders to whole screen pixels, so a 1x screen floors it to 1px. Headless Chrome measures as 1x, so the 2x value is arithmetic, not measured |

## 3. Per variant: design vs rendered

✓ matches · ≈ near · ✗d differs, decided · ✗ differs, new

### Brand
| State | Fill | Border | Text | Shadow / ring |
|---|---|---|---|---|
| Default | `#017ac9` ✓ | none (= fill) ✓ | white ✓ | 0 4px 8px navy 20% ✓ |
| Hover | `#0a5ea0` ✓ | none ✓ | white ✓ | lift 0 8px 16px ✓ (legacy `--sds-c-*`, §8) |
| Focus | `#017ac9` ✓ | none ✓ | white ✓ | Inset-inverse ✓ |
| Active | `#0a5ea0` ✓ | none ✓ | white ✓ | inset press ✓ |
| Disabled | `#e0e0e0` ✓ | none ✓ | `#666666` ✓ | — |

### Neutral
| State | Fill | Border | Text | Shadow / ring |
|---|---|---|---|---|
| Default | white ✓ | `#017ac9` ✓ | `#292929` ✓ | resting shadow ✓ |
| Hover | `#f0f0f0` ✓ | `#134276` ✓ | `#0a213b` ✓ | lift 0 8px 16px ✓ (legacy `--sds-c-*`, §8) |
| Focus | white ✓ | `#858585` ✓ | `#0a5ea0` ✓ | Inset ✓ |
| Active | `#f0f0f0` ✓ | `#134276` ✓ | `#134276` ✓ | inset press ✓ |
| Disabled | `#e0e0e0` ✓ | `#c2c2c2` ✓ | `#666666` ✓ | — |

### Base
| State | Fill | Border | Text | Shadow / ring |
|---|---|---|---|---|
| Default | none ✓ | none ✓ | `#0a5ea0` ✓ | none ✓ |
| Hover | none ✓ | none ✓ | `#0a213b` ✓ | none ✓ |
| Focus | none ✓ | none ✓ | `#0a5ea0` ✓ | Outline ✓ |
| Active | none ✓ | **`#0a5ea0`** ✗d | `#134276` ✓ | **inset press** ✗d |
| Disabled | none ✓ | none ✓ | `#666666` ✓ | — |

Base's side padding is 4px, as drawn (counted under "inline padding" in §2).

### Destructive
| State | Fill | Border | Text | Shadow / ring |
|---|---|---|---|---|
| Default | `#d03633` ✓ | = fill ✓ | white ✓ | none ✓ |
| Hover | `#a62b29` ✓ | = fill ✓ | white ✓ | none ✓ |
| Focus | **`#a62b29`** (hover colour) ✗d | = fill ✓ | white ✓ | Inset-inverse ✓ |
| Active | `#a62b29` ✓ | = fill ✓ | white ✓ | inset press ✓ |
| Disabled | `#e0e0e0` ✓ | none ✓ | `#666666` ✓ | — |

### Destructive text
| State | Fill | Border | Text | Shadow / ring |
|---|---|---|---|---|
| Default | white ✓ | `#a62b29` ✓ | `#a62b29` ✓ | none ✓ |
| Hover | `#f0f0f0` ✓ | **`#a62b29`** (design `#7d201f`) ✗d | **`#a62b29`** (design `on-error-1` `#7d201f`) ✗d | none ✓ |
| Focus | white ✓ | `#a62b29` ✓ | `#a62b29` ✓ | Inset-inverse ✓ |
| Active | `#f0f0f0` ✓ | **`#a62b29`** ✗d | **`#a62b29`** ✗d | inset press ✓ |
| Disabled | `#e0e0e0` ✓ | `#c2c2c2` ✓ | `#666666` ✓ | — |

### Success
| State | Fill | Border | Text | Shadow / ring |
|---|---|---|---|---|
| Default | `#388314` ✓ | = fill ✓ | white ✓ | none ✓ |
| Hover | `#2d6910` ✓ | = fill ✓ | white ✓ | none ✓ |
| Focus | **`#2d6910`** (hover colour) ✗d | = fill ✓ | white ✓ | Inset-inverse ✓ |
| Active | `#2d6910` ✓ | = fill ✓ | white ✓ | inset press ✓ |
| Disabled | `#e0e0e0` ✓ | none ✓ | `#666666` ✓ | — |

### Inverse (Lightning's behaviour, as decided)
| State | Fill | Border | Text | Shadow / ring |
|---|---|---|---|---|
| Default | none ✓ | white (design `#f0f0f0`) ≈ | white ✓ | none ✓ |
| Hover | `#f0f0f0` ✓ | white ≈ | **`#0a5ea0`** (design `#134276`) ✗d | **none** (design: bevel) ✗d |
| Focus | **`#f0f0f0`** (design: transparent) ✗d | white ✓ | **`#134276`** (design: white) ✗d | Inset-inverse ✓ |
| Active | `#f0f0f0` ✓ | white ≈ | **`#0a5ea0`** (design `#134276`) ✗d | inset press ✓ |
| Disabled | none ✓ | **`#525252`** (design: as default) ✗d | **`#525252`** (design: white) ✗d | — |

**Tally**, counted mark by mark from §2 and §3: 122 ✓, 4 ≈, 16 ✗d, 0 ✗, 142 in total (2026-10-20; was 119 / 4 / 18 / 1). The 7 "—" cells are disabled states, which have no ring.

## 4. Assumptions the bindings still invite

Unchanged from the first review §5 and still true. In short:
- **Destructive and success:** bound to `color/component hooks/*` variables that alias ramp hues. `lightning-button` reads the semantic `error-container-*` / `success-container-*` tokens, which the skin re-points on those two variants.
- **Radius:** `radius-border/circle` is `100%` in CSS. The button is a pill through `--slds-g-radius-border-pill`.
- **Focus rings:** drawn on an outer frame. In code each is the button's own `box-shadow`.
- **Per-state text tokens** (`on-accent-2` and similar): the component has one text hook per variant.

New this time:
- **`sizing-border/2 (2px)` = 1.5px is the button's outline.** The value is deliberate; only the label is wrong.
- **A readable hook can still be dead.** `--slds-c-button-neutral-spacing-inline` looks like the lever for the side padding, and `hook-map.mjs` lists it as open, but it has no effect.

## 5. Figma hygiene

- **Inverse disabled is identical to inverse default.** A disabled state with no visual signal.
- **Stroke widths still vary:** 1px on Destructive Focus and Inverse Focus, 1.5px elsewhere.
- **The `sizing-border/2` label says "(2px)"** but the value is 1.5.

## 6. Questions

**1. Side padding: accept 16px, or reach 24px?** *Answered 2026-10-20: neither option below. A third lever was found, the legacy `--sds-c-*` variables, and chosen (§8).*
The only public hook is broken in SLDS. The options:
- **(a) Accept 16px.**
- **(b) `lightning-button::part(button) { padding-inline: var(--slds-g-spacing-5) }`**: rung 7, on the line, like the font-family rule already in `site.css`.
- **(c) The private `--slds-s-button-spacing-inline`**: not allowed by `rules-skinning.md`.

*Recommendation:* **(b)**, if the 24px matters to the design, since it's a single documented part and property. Otherwise (a). Not (c).

**2. Should the Figma file be updated to what ships?**
Sixteen values differ by decision. Until Figma draws them as they render, every review will flag them again. They are:
- outline: 1px
- base: pressed border and press shadow
- destructive and success: focus uses the hover fill
- destructive text: one border and text colour across states
- inverse: hover/active text `accent-2`, light focus fill, grey disabled

*Recommendation:* **yes.** Send this list to the designer.

**3. Inverse disabled.** The design draws it identical to default; the site renders it grey.
*Recommendation:* treat the design as an oversight and keep the grey.

## 7. If question 1 is answered (b) — superseded by §8

```css
/* site.css, inside the MSD Button skin. */
lightning-button:not([variant='base'])::part(button) {
    padding-inline: var(--slds-g-spacing-5);
}
```

Not applied.

## 8. Update 2026-10-20: legacy `--sds-c-*` hooks, and production status

**Legacy hooks, by decision.** No public hook reaches the side padding or the hover lift, and utility classes don't either. Measured: `slds-p-horizontal_large` pads the host outside the pill, and the button inside keeps 16px. The component still reads an older hook set, `--sds-c-button-*`, and two of those reach:

| Property | Hook | On | Value |
|---|---|---|---|
| Side padding | `--sds-c-button-spacing-inlinestart`, `-inlineend` | every variant | `spacing-5` (24px) |
| | | base | `spacing-1` (4px) |
| Hover lift | `--sds-c-button-shadow-hover` | brand, neutral | `0 8px 16px` in the resting shadow's tint (`Shadow/Buttons/Hover/Brand`) |

These are **not supported**. `--sds-*` was the beta name for styling hooks (Winter '21), renamed `--slds-*` when they became generally available (Spring '22), and Salesforce's linter converts any it finds. These two names were never even published: the linter's list of old public hooks spells the padding one `-inline-start` and has no `-shadow-hover`. They're the button's own internal variables, which work only because this build reads them. They may stop working in any release and are the first lines to retest. Nothing, deprecated or public, reaches the 1.5px outline.

**Production status of the whole skin.** Salesforce's *SLDS 2 Best Practices* treats the skin's levers as follows:
- Component hooks (`--slds-c-*`) are a **developer preview** in SLDS 2, not for production.
- Assigning a global hook is **reserved for theming tools**, which rules out the solid destructive and success fills and the disabled pair.
- The SLDS Linter also flags 15 of the button's component-hook lines as hooks SLDS 2 doesn't publish.

By decision (2026-10-20), all of these stay as **prototype-only levers**. Each one is listed for the developer in [handover-styling-register.md](handover-styling-register.md).

**Also new:** every global-hook reference in the skin now carries the fallback the linter names. Re-measured in headless Chrome after both changes: every variant and state renders as before, apart from the side padding and the hover lift, which now match.
