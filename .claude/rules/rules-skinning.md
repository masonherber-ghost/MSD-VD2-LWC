# Skinning — how a shipped component is made to look like the design

The rules for changing how a `lightning-*` component *looks* without changing what it *is*. Distilled
from `_docs/customisation-tiers.md` (the tiers and the gate, with official sources) and the
`sep-` / hook practice already in `rules-lwc-layout.md`. This file wins on **where a skin lives and
which lever it may pull**; `rules-lwc-layout.md` still wins on spacing and layout.

The `component-from-design` skill is the procedure; this is the law it follows.

---

## The ladder — try each rung before the next

Salesforce's own order is *variant → utility class → styling hook → your own class*. With the
Experience Cloud layer added:

| Rung | Lever | Tier | Example |
|---|---|---|---|
| 1 | A documented **attribute or `variant`** | 2B | `variant="label-stacked"`, `input-icon-name="utility:search"` |
| 2 | An SLDS **utility class** on the host | 2 | `slds-m-bottom_small` |
| 3 | A **`--dxp-*` hook** — the Theme panel value, if the property is site branding | 3A | heading sizes |
| 4 | The component's own **`--slds-c-*` hook** | 3A | `--slds-c-inputtext-color-border` |
| 5 | A **global `--slds-g-*` hook, scoped to the host** — when the component reads a global token for one state | 3A | `--slds-g-color-border-error-1` on `lightning-grouped-combobox` |
| 6 | A **real property on your own class** | 3B | `.sep-…` |
| 7 | A **documented `::part()`** | 3B, *on the line* | `lightning-button::part(button)` |

**Stop at the first rung that reaches the property.** Skipping to a lower rung because it is
quicker is the failure mode.

**Rung 7 is allowed, not ruled out — ask first.** When rungs 1–6 cannot reach a property and the
component exposes a `part="…"` for that element, propose the `::part()` rule and ask the user
before writing it. Once agreed it is a normal skin: tokens only, scoped by tag / reflected
attribute / `sep-` class, listed in the handover register. Prefer it to a legacy `--sds-c-*` or an
unpublished `--slds-c-*` hook: the part is documented API, those are not. (`lightning-button`, user
2026-10-26: border width, padding and line height moved from hooks to `::part(button)`.)

**A lever can reach a property the browser will not render.** Browsers snap `border-width` and
`outline-width` to whole *screen* pixels: a 1.5px border draws true on a 2x (Retina) screen and
floors to 1px on a 1x one. Headless Chrome renders as 1x whatever scale it is given, so it always
reads 1px (Chrome 156, 2026-10-26). A fractional stroke is a screen-density question, not a
Salesforce gap — say which screens it holds on. (`lightning-button` keeps the design's 1.5px; on
1x screens the button is 1px short, accepted by the user 2026-10-26.)

**Production status (Salesforce, *SLDS 2 Best Practices*):** rung 4 `--slds-c-*` hooks are a
**developer preview** in SLDS 2 — not for production — and rung 5 assigns a value to a global hook,
which Salesforce reserves for theming tools. **Decision (user, 2026-10-20): both stay as
prototype-only levers, listed for the developer at handover** in `_docs/handover-styling-register.md`
(generated: `node .claude/skills/component-from-design/styling-register.mjs`). Deprecated
`--sds-c-*` hooks are used where nothing public reaches (user, 2026-10-20) and are listed there too. A utility on a shipped component styles its host only — it reaches inside solely
through inherited properties. Detail: `component-from-design` § 4a.

## Never — the gate

- `--slds-s-*` or `--_slds-*` — private per the SLDS Linter (`no-slds-private-var`). Existing uses
  are debt (see `_docs/teirs-adherance.md`); do not add more.
- A selector naming an SLDS class or a component's internal markup (`no-slds-class-overrides`).
- An undocumented attribute set to unlock a hook — check the catalog's `properties`.
- A raw colour, pixel or font value. Values come from `--sep-*` / `--slds-g-*` tokens; a hex is
  only acceptable as a `var()` fallback.
- `!important`.
- Rebuilding the component because the skin cannot reach — that is the custom component gate:
  stop and ask (`rules-lwc-components.md`).

## Finding the hooks a component really reads

The catalog lists a component's `@api` properties, not its hooks. The hooks are in the stylesheets
it — **and its private children** — ship:

```bash
L=node_modules/lightning-base-components/src/lightning
grep -oh -- "--slds-c-[a-z0-9-]*" $L/<name>/*.css | sort -u        # its own
grep -n "^import" $L/<name>/<name>.js | grep lightning/            # its children
grep -oh -- "--slds-c-[a-z0-9-]*" $L/<child>/*.css | sort -u        # theirs
grep -oh 'part="[^"]*"' $L/<name>/*.html $L/<child>/*.html | sort -u  # documented parts
```

Then read the rule that consumes each hook to learn **which state it covers**. A component often
sets a hook *itself* for a state (`[invalid]` setting the border to `--slds-g-color-border-error-1`),
which overrides anything inherited from the host — so the state is reached through the token the
component reads, rung 5, not the hook.

Gotchas already met: the label hook only works if the component sets `data-render-mode="shadow"`
(most do; `lightning-badge` does not); hooks that only apply under an attribute the component
does not expose are out of reach.

## Where the skin lives

| Scope | Where | Selector |
|---|---|---|
| **Every instance on the site** of one shipped component | `src/assets/css/site/components/<tag>.css` — one file per component, named by its tag without `lightning-` (`button.css`) | The tag: `lightning-button { … }`, `lightning-button[variant='brand']::part(button)` |
| **An opt-in variant** of a shipped component | That component's file in `site/components/` | A `sep-` class: `.sep-listing-chip { … }` |
| **A site-wide skin of an SLDS blueprint** | `src/assets/css/site/blueprints/<name>.css` | A `sep-` class beside the SLDS one |
| **Only inside one of our wrappers** | That wrapper's own `.css` | The wrapper's class |
| **A site-wide branding value** (type scale, brand colour) | `src/assets/css/design-tokens.css` | `:root`, as a `--dxp-*` stand-in |

**Never edit `src/assets/css/site.css`** — it is the bundle, generated from `site/` by
`npm run css` (`rules-architecture.md` § *Stylesheets*). A new component file needs no
registration; the bundler picks it up, and `npm run dev` re-bundles on save.

**Delete, don't comment out.** A skin that is switched off is removed, not left as a commented
`[OFF]` block: dead CSS in comments reads as live to the next person, drifts from the rules, and
git keeps the history. (2026-10-26: 21 such blocks removed from the old `site.css`; a copy is in
`_docs/archive/css-before-split-2026-10-26/`.)

Component hooks do **not** go in `design-tokens.css` at `:root` — that file is for tokens and the
Theme-panel stand-in (`rules-lwc-layout.md` § *Defining a project token*). Setting a component's
hooks on its **tag** keeps them on that component and nowhere else.

Every skin block opens with a comment naming: the design source (Figma node / page), the component,
which states are covered, and which are not and why.

## Cover the states, say which you could not

A design draws states (default, hover, focus, filled, error, disabled, read-only…). For each:
the lever that reaches it, or **why none does**. "Filled" and "hover" are the usual gaps — they are
CSS states inside the shadow root that no hook exposes. Never fake a state with a class toggled
from script to chase the picture.

## Verifying a skin

- **Read the computed value off the rendered element**, per state, in a browser. A hook that
  compiles can still be a no-op — this project has found three. If no browser is available, say
  the skin is **unverified** rather than implying it works.
- A **new** stylesheet on an existing component needs a dev-server restart (and possibly
  `rm -rf __lwr_cache__`); a change to an existing one does not.
- Re-run `npm run compositions` (a new `sep-` class or wrapper) and the `assess-tiers` skill
  (the skin must add no out-of-bounds flag).
