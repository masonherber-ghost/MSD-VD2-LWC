# Component review: Form element, after the build

A post-build review of the MSD "Form Element" design. It compares the design with what the site **renders**, measured in Chrome, after the skin was built with `component-from-design` the same day.

| | |
|---|---|
| Design | `figma.com/design/3FTyjvu0JC5UtYqnoLqDFh`, page "⚡ Form Element": guidelines `22776:17593`, examples `22776:17638` |
| Component sets | ⚡ Input - Default `748:78599`, ⚡ Textarea - Default `10127:33525`, ⚡ Checkbox `14223:162345` / - Group `17995:407950`, ⚡ Radio `1997:53076` / Group `2002:360640`, ⚡ Dual Listbox `2744:62499`, ⚡ Input - Read Only View Mode `26489:29686` |
| Rendered | `site.css` § Component skins, "MSD Form element", with tokens from `design-tokens.css` |
| Measured | Headless Chrome. Each control's shipped example moved into the light DOM, states forced with CDP `CSS.forcePseudoState`, and error raised with `setCustomValidity` / `reportValidity` |

---

## Summary

The guidelines say it plainly: *"The Form Element is not a supported component, but may contain the following components."* It's the SLDS form-element **pattern** (label, control, help text, error) around five shipped controls. Each control renders its own label, required marker, help text and error, so the skin is one block per control.

**59 of the 84 values compared match the design** (70%). The other 25 differ, and every one has a cause:

| | Values |
|---|---:|
| ✓ Matches | 59 |
| ✗ No public lever (tried and measured) | 22 |
| ✗ Not built: anatomy `lightning-*` doesn't have | 3 |
| **Total** | **84** |

**The biggest gap is the labels.** Every label and group legend renders at **16px / 600** (legends 700), where the design specifies **18px Medium**. They read the private `--slds-s-label-*` hooks, which Cosmos resolves once at the page root, so no supported lever reaches them (§7, question 1).

## 1. Component map

| Figma | Shipped | Built |
|---|---|---|
| ⚡ Input - Default | `lightning-input` (text types) | skinned |
| ⚡ Textarea - Default | `lightning-textarea` | skinned |
| ⚡ Checkbox / Checkbox - Group | `lightning-checkbox-group` (and `lightning-input type="checkbox"`) | skinned |
| ⚡ Radio / Radio Group | `lightning-radio-group` | skinned |
| ⚡ Dual Listbox - Default | `lightning-dual-listbox` | skinned |
| ⚡ Input / Textarea - Read Only View Mode | static read-only markup (`slds-form-element_readonly`, per `rules-app-logic.md`), not a `lightning-*` component | **not reviewed** (see §5) |
| Grab n Go layouts: stacked, horizontal error, 50/50 split, compound row and address, record view and edit | `lightning-layout` with these controls, and `variant="label-inline"` / `label-stacked` | not a skin; composition for each page |

## 2. Shared: labels, help and error text

| Property | Design | Rendered | |
|---|---|---|---|
| Field label size | 18px | 16px | ✗ private hook |
| Field label weight | Medium (500) | 600 | ✗ private hook |
| Field label colour | `on-surface-2` `#292929` | `#292929` | ✓ |
| Group legend (checkbox, radio) size and weight | 18px Medium | 16px / 700 | ✗ ✗ |
| Help and error text size | 14px | 14px | ✓ |
| Error text colour | `on-surface-2` after a red icon | `error-1` `#a62b29`, no icon | ✗ component renders error text red with no icon |

## 3. Per control: design vs rendered

✓ matches · ✗ differs (reason in the row)

### Input (`lightning-input`)
| State | Fill | Border | Other |
|---|---|---|---|
| Default | `#ffffff` ✓ | `border-1` `#c2c2c2` ✓ | radius 8px ✓ · height 52px ✓ · text 18px ✓ `#292929` ✓ · placeholder `#292929` ✓ · outline 1px (design 1.5px) ✗ · text indent 32px (design 16px) ✗ |
| Focus | `#ffffff` ✓ | `#017ac9` ✓ | ring: 2px blur `accent-2`, not the design's solid 2px `accent-1` outline ✗ |
| Filled | — | stays `border-1` (design `border-accent-3` navy) ✗ | "filled" is an internal state; no hook |
| Error | `#ffffff` ✓ | `#a62b29` ✓ | — |
| Disabled | `#e0e0e0` ✓ | `#c2c2c2` ✓ | text `#525252` ✓ |
| Dirty (focus and filled) | — | — | undo button ✗ (no such anatomy in `lightning-input`) |

### Textarea (`lightning-textarea`)
| State | Fill | Border | Other |
|---|---|---|---|
| Default | `#ffffff` ✓ | `#c2c2c2` ✓ | radius 8px ✓ · padding 16px ✓ · text 18px ✓ `#292929` ✓ · outline 1px ✗ |
| Focus | `#ffffff` ✓ | `#017ac9` ✓ | text turns `#0a213b` (design stays `#292929`) ✗ |
| Error | `#ffffff` ✓ | `#a62b29` ✓ | — |
| Disabled | `#e0e0e0` ✓ | `#c2c2c2` ✓ | text `#666666` ✓ |
| Dirty | — | — | undo button ✗ |

### Checkbox (`lightning-checkbox-group`)
| State | Fill | Border | Other |
|---|---|---|---|
| Default | `#ffffff` ✓ | `#c2c2c2` ✓ | box 16px (design 28px) ✗ · radius 4px (design 8px on 28) ✗ · outline 1px ✗ · option label Medium ✓ 16px (design 18) ✗ |
| Hover | `#ffffff` ✓ | stays `#c2c2c2` (design `#017ac9`) ✗ | the component has no hover state |
| Checked | `#017ac9` ✓ | `#017ac9` ✓ | tick white ✓ |
| Error | `#ffffff` ✓ | `#a62b29` ✓ | — |
| Error + checked | `#a62b29` ✓ | `#a62b29` ✓ | — |
| Disabled | white (design `#e0e0e0`) ✗ | `#c2c2c2` ✓ | — |
| Disabled + checked | white (design `#e0e0e0`) ✗ | `#c2c2c2` ✓ | — |

### Radio (`lightning-radio-group`)
| State | Fill | Border | Other |
|---|---|---|---|
| Default | `#ffffff` ✓ | `#c2c2c2` ✓ | radio 16px (design 28px) ✗ · outline 1px ✗ · option label Medium ✓ 16px ✗ `#292929` (design `on-surface-1` `#525252`) ✗ |
| Selected | `#017ac9` ✓ | `#0a5ea0` ✓ | dot white ✓ |
| Error | `#ffffff` ✓ | `#a62b29` ✓ | — |
| Disabled | `#f0f0f0` (design `#e0e0e0`) ✗ | `#c2c2c2` ✓ | — |

### Dual listbox (`lightning-dual-listbox`)
| State | Fill | Border | Other |
|---|---|---|---|
| Default | — | container `border-2` `#858585` ✓ · radius 8px ✓ | option text 18px ✓ `#0a213b` ✓ · padding 8/12px ✓ |
| Option hover | `#e6f2fa` ✓ | — | — |
| Option selected | `#017ac9` ✓ | — | text white ✓ |

**Tally**, counted mark by mark (§2 and §3) with a script: 59 ✓, 25 ✗, 84 in total. Of the 25: 22 have no public lever, and 3 are anatomy that doesn't exist (the undo button ×2, and the error icon).

## 4. Assumptions the bindings invite

- **Label weight "Medium" vs SLDS's label weight.** The design's labels use `Body/font-scale-1/Medium`. SLDS sets every form label through the shared, private `--slds-s-label-font-weight` (`weight-6`), so the label weight follows the global weight 6 (600), not a label-specific token. Matching Medium means changing weight 6 site-wide, which would also change every other weight-6 use.
- **"Filled" as a state.** Figma draws a navy border once a field holds a value. Neither the browser nor `lightning-input` has a "filled" state; it would take script to toggle a class, which the rules forbid.
- **Dirty states and the undo button** are Salesforce record-edit (inline edit) anatomy. A plain `lightning-input` has neither.
- **28px checkboxes and radios with an 8px corner.** The size is internal to the component. At SLDS's 16px, the same 8px corner would make a checkbox a circle, so the build uses 4px.
- **The design's focus ring** is the `Focus/Outline` effect (solid 2px `accent-1`). The input draws its own ring from `accent-2` with a blur, and no hook changes its shape.
- **Placeholder text** is bound to `on-surface-2`, the same colour as entered text. SLDS greys placeholders, and a placeholder that matches real input can be mistaken for a value. Built as drawn, but worth a design check.
- **Radio option labels** use `on-surface-1` (lighter); checkbox option labels use `on-surface-2`. The inconsistency looks unintended.
- **The dual-listbox selected row** uses `Body/font-scale-base` (16px) while the other rows use 18px.

## 5. Not reviewed

- **The read-only and view-mode fields** (`⚡ Input / Textarea - Read Only View Mode`). On this site they're static SLDS markup, the locked-field pattern in `rules-app-logic.md`, not a `lightning-*` component, so the skin doesn't cover them. A separate `sep-` class would.
- **The layout examples** (stacked, horizontal, 50/50, compound, record view and edit) are page compositions, not skins.
- **Sizes and variants the design doesn't draw:** `label-inline`, `label-hidden`, toggles, file inputs, date pickers.

## 6. Figma hygiene

- **Inconsistent label colours:** radio option labels `on-surface-1`, checkbox labels `on-surface-2`.
- **Inconsistent row type:** the dual-listbox selected row is 16px; the others are 18px.
- **Mismatched text boxes:** the input text box is 20px tall at a 137.5% line height (24.75px). The field's 52px height depends on that 20px.
- **Inconsistent outlines:** the radio error outline is 2px; every other outline is `sizing-border-2` (1.5px).
- **Unbound colours:** the input's spinner dots and the textarea resize grip use `Neutral/50` directly, not a semantic token.

## 7. Questions

**1. Labels: 16px / 600, or the design's 18px Medium?**
Options:
- **(a) Accept 16px / 600.**
- **(b) Set the private `--slds-s-label-font-size` / `-font-weight` on the form controls.** That breaks `rules-skinning.md`; it's the same debt the old input skin carried.
- **(c) Change the design to 16px / 600.**

*Recommendation:* **(c) or (a).** A label one step smaller than its field is the Lightning convention. If 18px Medium is a firm brand requirement, (b) needs your explicit sign-off.

**2. Checkbox and radio size: accept 16px?**
The 28px controls can't be reached. *Recommendation:* accept, and ask design to draw 16px controls (4px checkbox radius).

**3. Disabled checkbox and radio fills.** They render white and `#f0f0f0`; the design draws `#e0e0e0`. *Recommendation:* accept and update the design. Neither control exposes a disabled-fill hook.

**4. Error message style.** The component renders the message red with no icon; the design draws dark text after a red icon. *Recommendation:* accept. The red message is Lightning's accessible error pattern, and the icon isn't anatomy the component has.

**5. Placeholder colour.** It's built as drawn (same as entered text). *Recommendation:* ask design whether it should be `on-surface-1`, which is one hook line.

**6. Should the read-only view mode get its own `sep-` skin?** *Recommendation:* yes, as a follow-up. It's markup this site writes, so a `sep-` class reaches all of it.

## 8. If the recommendations are accepted

There's nothing more to build for questions 1–4. Question 5 would be one line:

```css
lightning-input { --slds-c-inputtext-text-color-placeholder: var(--slds-g-color-on-surface-1); }
```

Question 6 would be a new `sep-form-element-readonly` class in `site.css`, via `component-from-design`.

Not applied.

## 9. Update 2026-10-20: legacy hooks, fallbacks and production status

**The design is unchanged** since the build: 18px Medium labels, a 52px input with 16px padding, 1.5px outlines, and 28px checkboxes and radios.

**Legacy `--sds-c-*` variables don't close the gaps.** On the button, two of these unsupported variables reached side padding and the hover lift. Here, 17 candidates were tried live on the five controls, and only one moved:

| Gap | Legacy variable tried | Moved? |
|---|---|---|
| Label size 18px | `--sds-c-inputtext-label-font-size`, `--sds-c-inputcheckbox-label-font-size` | No |
| Label weight Medium | `--sds-c-inputtext-label-font-weight` | **Yes, but only on text-type `lightning-input`.** The textarea, checkbox and radio groups, dual listbox and combobox labels don't read it |
| Outline 1.5px | `--sds-c-inputtext-sizing-border`, `--sds-c-inputcheckbox-sizing-border` | No |
| Input text indent 16px | `--sds-c-inputtext-spacing-inlinestart` | No |
| Focus ring shape | `--sds-c-inputtext-shadow-focus` | No |
| Checkbox and radio 28px, radius 8px | `--sds-c-inputcheckbox-sizing`, `-radius-border` | No |
| Textarea focus text colour | `--sds-c-textarea-text-color-focus` | No |
| Error text colour | `--sds-c-inputtext-helptext-text-color` | No |

The label weight is **not applied**. Medium on input labels alone would make the form's labels disagree with each other, which is worse than the current consistent 600. Question 1 (§7) is unchanged.

**Fallbacks.** Every global-hook reference in the form skin now carries the fallback the SLDS Linter names (29 lines). Re-measured in headless Chrome: every value is as before.

**Production status.** The skin's component hooks are a developer preview in SLDS 2. Its re-pointed globals (the textarea and listbox borders, the selected listbox row) assign global hooks outside a theming tool. Both stay as prototype-only levers, by decision (2026-10-20). Every line is listed for the developer in [handover-styling-register.md](handover-styling-register.md).
