# Skinning shipped components: the never list

MSD VD2 LWC prototype · one-page team reference · 26 October 2026

Skin only through what Salesforce documents. It upgrades every org three times a year and promises nothing about a component's internals. Full detail: `_docs/skinning-what-not-to-do.md`.

## The ladder

Try each rung in order. Stop at the first one that reaches the property.

| Rung | Lever | Note |
| --- | --- | --- |
| 1 | Attribute or `variant` | `variant="label-stacked"` |
| 2 | SLDS utility on the host | Placement and inherited type only |
| 3 | `--dxp-*` hook | Site branding (Theme panel) |
| 4 | `--slds-c-*` hook | **Prototype only.** Developer preview in SLDS 2 |
| 5 | Global `--slds-g-*` on the host | **Prototype only.** Assignment is for theming tools |
| 6 | Property on a `sep-` class | `.sep-listing-chip { … }` |
| 7 | Documented `::part()` | On the line; last resort |

Prototype-only levers are listed for handover in `_docs/handover-styling-register.md`.

## Never

**Reach inside a component** (upgrade gate)

- × Private hooks `--slds-s-*` or `--_slds-*` (`no-slds-private-var`)
- × A selector naming an SLDS class, e.g. bare `.slds-page-header` (`no-slds-class-overrides`)
- × Descendant chains into a component's internal markup
- × Undocumented or "internal use" attributes to unlock a hook
- → Stop at the host: tag, reflected attribute, or `sep-` class

**Hard-code values**

- × Raw hex, px, rem or font values, except as a `var()` fallback (`no-hardcoded-values-slds2`)
- × A `--slds-g-*` reference with no fallback (`no-slds-var-without-fallback`)
- × `!important`. Ours already win
- × `--lwc-*` tokens or SLDS 1 classes (`slds-page-header_record-home`)
- × A relative `url()`. It 404s in the built site

**Put a skin in the wrong place**

- → All instances: the tag, in `site/components/<tag>.css`
- → Opt-in variant: a `sep-` class in that component's file
- × Editing `site.css` — it is generated (`npm run css`)
- × Leaving switched-off CSS commented out — delete it
- × Component hooks at `:root` in `design-tokens.css`
- × Setting a `--slds-g-*` global outside `design-tokens.css`
- × Spacing baked into a `sep-` class. Placement stays a utility

**Rebuild or fake it** (custom-component gate)

- × Rebuild a shipped control (combobox, modal, tabs, pill, toggle) because the skin falls short
- × Build a new custom component without asking the user first
- × Script a class on to fake a state the shadow root owns (hover, filled)
- × Remove SLDS
- → Record the gap and say what is off

**Hide the risks**

- ! `--slds-c-*` hooks: dev preview, not for production
- ! Re-pointed globals: comment each use
- ! Legacy `--sds-c-*`: unsupported, ask first
- → Regenerate the register after any skin change

**Call it done because it compiles**

- × Assume a hook works. Three in this project compiled and did nothing
- → Read the computed value off the element, per state
- → No browser? Report the skin as unverified
- → Lint the block: no fallback, class-override or private findings

**Misuse a blueprint** (the 37 no component renders)

- × Hand-write a blueprint a `lightning-*` component already renders. Check `/design-system` → Blueprints
- × Use a class without grepping the shipped CSS. `slds-table_column` and `slds-setup-assistant__step` don't ship
- × Override the blueprint's SLDS class. Add a `sep-` class beside it
- × Use `--slds-s-pageheader-*`. The page header has no public hooks: set real properties on `.sep-page-header`
- × Select an inner element by its SLDS class. Add `sep-page-header__title` beside `slds-page-header__title`
- × Put a responsive `sep-` modifier alongside `slds-m-*`. The utility's `!important` wins
- × Add state or keyboard to a blueprint without treating it as Tier 4, or hand-roll one for a control that ships
- ! Blueprints aren't auto-updated by SLDS. They're our code to maintain
- → Badges: always `slds-badge` blueprint markup, never `lightning-badge`

## Quick reference

- **Regenerate the register:** `node .claude/skills/component-from-design/styling-register.mjs`
- **Two gates:** upgrade gate (documented parts only) and custom-component gate (the user decides). Passing one doesn't pass the other.
- **Read in full:** `rules-skinning.md` · `component-from-design/SKILL.md` · `_docs/customisation-tiers.md`

Key: × never · → do this instead · ! prototype-only risk
