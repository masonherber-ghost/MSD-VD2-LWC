---
name: component-from-design
description: Take ONE component from a design — a Figma frame or an HTML page — find the shipped lightning-* component that is its match, skin that component to the design using only the levers `rules-skinning.md` allows, apply the skin, and update the design system. Use when given a Figma node or HTML for a single control or component ("skin the combobox to this", "make the input match SEP", "/component-from-design <figma link>"). For a whole page or layout use build-from-wireframe instead.
---

# Component from design

Turns a design of **one component** into a skin on the shipped component that already does that
job. It does not build a new component and it does not restyle a component's internals.

**Read first:** `.claude/rules/rules-skinning.md` (the ladder, where skins live, the never list) and
`_docs/customisation-tiers.md` (the tiers and the gate). Where this skill and those disagree, they win.

`build-from-wireframe` composes a *page* from components; this skill skins *one component*. A page
design that needs a component skinned uses both.

---

## 1. Read the design

**Figma** (desktop MCP — see the `figma-mcp` skill if it is not connected). The node id is in the
URL: `node-id=141-726` → `141:726`.

```
get_screenshot     <node>   — what it looks like
get_metadata       <node>   — its layers: states, slots, sub-parts
get_variable_defs  <node>   — the design's tokens, by name and value
```

**HTML page** — read the markup and its computed styles; treat its values the same way.

Write down, before touching code:

- **Anatomy** — label, field, icons, helper text, counter, dropdown, items, sections…
- **States** — every column the design draws (default, hover, focus, filled, error, disabled, …).
- **Values** — each one *by its design token name*, then find the `--sep-*` token that holds it
  (`grep -n "<hex>" src/assets/css/design-tokens.css`). A value with no token is a finding, not a
  literal to paste.

## 2. Find the shipped match

The catalog is the authority — a tag that is not in it does not exist:

```bash
grep -o '"tag": "lightning-[a-z-]*"' src/modules/data/catalog/catalog.js | sort -u
```

Pick the component whose **behaviour** matches (a typeahead with grouped suggestions is
`lightning-grouped-combobox`, not `lightning-combobox`). Then list what it takes — its catalog
`properties` — and map every anatomy item to an attribute, a slot, an `items` shape, or **nothing**.

If the design's behaviour has no shipped match, **stop**: that is the custom component gate. Report
it in the five-part form (`build-from-wireframe` § *What to report when you hit the gate*) and ask.

## 3. Inventory the levers

Follow `rules-skinning.md` § *Finding the hooks a component really reads* — its own stylesheets
and its private children's. For each hook, note the state it covers. List the documented parts.

## 4. Build the skin map

One table, one row per design property × state:

| Design property | State | Design token → `--sep-*` | Lever (rung) | Hook / class | Reachable? |
|---|---|---|---|---|---|

Fill "Reachable?" honestly: **yes**, **no — no hook**, **no — internal state**, **on the line —
part only**. This table goes in the report and, condensed, in the skin's comment.

**"On the line — part only" is a question, not a dead end.** Do not rule `::part()` out and do not
write it unasked: list each such row, propose the rule, and **ask the user** before applying it
(`rules-skinning.md` § the ladder, rung 7). Once agreed it goes in the skin like any other lever.
It is preferred to a legacy `--sds-c-*` or unpublished `--slds-c-*` hook reaching the same
property — the part is documented, they are not. Measure it: a part can reach a property the
browser then rounds (a fractional border floors to 1px on a 1x screen, and headless Chrome
measures as 1x).

## 4a. Writing the CSS — SLDS and LWC best practice

Sources: Salesforce's own `design-systems-slds-apply` skill (github.com/forcedotcom/sf-skills —
its `SKILL.md` and `references/styling-decision-guide.md`), the SLDS Linter, the LWC styling-hooks
docs. Where measured here, the measurement is stated. `rules-skinning.md` still wins.

### Selection order (Salesforce's)

**Base component → SLDS blueprint → styling hooks → custom CSS (last resort, still on hooks).**
Skinning starts at the first: the component exists, and this section is about the CSS around it.

### When no hook reaches the property — Salesforce's decision tree

```
Hook exists?        → use it, var(--slds-g-*, fallback)
No → utility class? → use the utility class, in markup
No → minimal custom CSS: a prefixed class (sep-), hook values inside it, a comment saying why
```

**On a shipped component, a utility class styles the host, not the inside.** The shadow root stops
everything except inherited properties and custom properties. Measured on `lightning-button`
(2026-10-20): `slds-p-horizontal_large` put 24px of padding on the host *outside* the pill while the
button kept 16px, and `slds-border_*` bordered the host, not the button. What a utility **can** do
to a shipped component:

| Utility does | Example | Reaches |
|---|---|---|
| Space or position the component | `slds-m-bottom_small`, `slds-size_1-of-2`, `slds-grid` on the parent | ✓ the host — the usual job |
| Set an **inheritable** property the component leaves to `inherit` | `slds-text-heading_small` → label 20px; `slds-text-title_bold` → 700 | ✓ through inheritance (same mechanism as rung 6) |
| Set padding, border, radius, shadow, or a property the component sets itself | `slds-p-*`, `slds-border_*` | ✗ the host's own box only |

So a utility is the right lever for **placement** and for **one-off type on one instance**. For a
site-wide skin, the same inheritable property on the tag in its `components/<tag>.css` is equivalent and needs no
class on every instance. A utility never closes a gap inside the component; record that as a gap.

### Selectors

- The **tag** (`lightning-button`), narrowed by a **reflected attribute** (`[variant='neutral']`),
  or a **`sep-` class**. Nothing deeper than the host.
- Never an `.slds-*` class or a component's internal markup (linter `no-slds-class-overrides`; its
  prescribed fix is a namespaced class *beside* the SLDS one — which is our `sep-`).
- No `id` selectors, no `!important`, no descendant chains into a component.

### Values

- Every `--slds-g-*` **reference** carries a fallback: `var(--slds-g-spacing-3, 0.75rem)` (linter
  `no-slds-var-without-fallback`). Use the fallback the linter names — SLDS's light default — not
  our Figma value: the fallback only renders where the hook is missing, and copying Figma values
  into it would drift on the next import.
- No raw px, rem or hex except as that fallback, or a value with no hook, commented as intentional.
- Font sizes are `--slds-g-font-scale-*` (only `--slds-g-font-size-base` exists unnumbered); every
  colour hook ends in a number.

### Hook status — which prefixes may be set

| Prefix | Status | Use |
|---|---|---|
| `--slds-g-*` | Public | Reference anywhere. Declared site-wide only in `design-tokens.css` |
| `--slds-c-*` the component reads **and the linter accepts** | Published, but a **developer preview** in SLDS 2 | Set on the host (rung 4); flag as not production-supported |
| `--slds-c-*` the component reads but the linter flags (`no-slds-namespace-for-custom-hooks`, `no-unsupported-hooks-slds2`) | **Read by this build, not published for SLDS 2** | Works here; an org may not honour it. Use only with the line listed in the review as a risk |
| `--sds-c-*` | **Not supported.** `--sds-` was the beta namespace (Winter '21), renamed `--slds-` at GA (Spring '22); the linter's `enforce-sds-to-slds-hooks` converts them. Some names the components still read were **never published at all** — they are the component's internal variables (`--sds-c-button-spacing-inlinestart`, `-shadow-hover`: absent from the linter's 321-name deprecated list, which spells the old public one `-inline-start`) | On the line, closer to internals than to `::part` — ask first. It often reaches what `--slds-c-*` cannot (button side padding, hover shadow — measured) |
| `--slds-s-*`, `--_slds-*` | Private | Never |
| `--lwc-*` | Deprecated tokens | Never as a primary value |

**Production status, from Salesforce's *SLDS 2 Best Practices* (supplied by the user, 2026-10-20):**

- **Component-level `--slds-c-*` hooks in SLDS 2 are a developer preview** — "not generally
  available… Don't implement functionality in production with these." Every `--slds-c-*` line in a
  skin works in this prototype but is **not production-supported** in an org on an SLDS 2 theme.
  List each one in the review and the register; it is the developer's call at handover.
- **"Don't assign direct values to global styling hooks, as value assignment is reserved for
  theming tools."** `design-tokens.css` is the stand-in for that theming tool (the Theme panel), so
  it stays. **Rung 5 — re-pointing a global on one host — is assignment outside a theming tool.**
  The linter does not flag it, but it is against the guidance: on the line, each use commented and
  listed as an exception.
- **"The newest global styling hooks are only available in Lightning Experience and are not
  supported for Experience Cloud sites."** On an Experience Cloud build, check each global a skin
  references against what the site's theme actually ships; semantic hooks are SLDS 2 only.
- **Project decision (user, 2026-10-20):** component hooks, re-pointed globals and deprecated
  `--sds-c-*` hooks are **prototype-only levers**. Use them to match the design here; every one is
  listed for the developer at handover in `_docs/handover-styling-register.md`. Regenerate it after
  any skin change: `node .claude/skills/component-from-design/styling-register.mjs`.
- Their layer order: **base components → blueprints → custom components built from blueprints**,
  styled with global hooks, "the lowest-complexity layer that meets your UI requirements".

### LWC

- Our components are light DOM; the `site.css` bundle is global, so a skin is plain CSS on the tag. A
  wrapper's own `.css` styles only the wrapper's prefixed classes.
- Only inherited properties and custom properties cross into a `lightning-*` shadow root. If a
  property is neither, no CSS outside the component reaches it — not a utility, not a wrapper.
- Never script a class onto a component to fake a state the shadow root owns.

### Lint every skin

```bash
mkdir -p <scratch>/lint && cp -R src/assets/css/site <scratch>/lint/   # the SOURCES: line numbers match
cd <scratch>/lint && npx --yes --cache <scratch>/npmcache @salesforce-ux/slds-linter@latest lint .
```

The block you wrote must have **no** `no-slds-var-without-fallback`, `no-slds-class-overrides` or
`no-hardcoded-values-slds2` warning. Each `no-slds-namespace-for-custom-hooks` /
`no-unsupported-hooks-slds2` warning that remains is a hook that works here but is unpublished —
list it in the report. `--fix` does not add fallbacks; take the value from the warning.

## 5. Apply it

- Write the skin where `rules-skinning.md` § *Where the skin lives* says: the component's own file,
  `src/assets/css/site/components/<tag>.css` (create it if it is the first skin for that tag —
  named by the tag without `lightning-`), selected by the tag. Never edit the generated
  `src/assets/css/site.css`; `npm run dev` re-bundles on save, otherwise `npm run css`.
- Values are tokens only. Comment: design source (file + node), states covered, states not covered
  and why.
- Attributes the design implies (`input-icon-name`, `input-maxlength`, `variant`) are set **where
  the component is used**, not in CSS.

## 6. Update the design system

- **`/design-system` → Components shows the skin.** The shipped examples are native shadow-DOM
  components; `ui/exampleStage` adopts the page's stylesheets (SLDS, tokens, the `site.css` bundle,
  utilities) into each example's shadow root, so their own `slds-*` classes and our tag-level
  skins apply as on a page (fixed 2026-10-19 — before, buttons rendered unspaced and unskinned).
- `npm run compositions` if you added a `sep-` class or a wrapper; `npm run tokens` if you added a
  token.
- Run the `assess-tiers` skill: the skin must add **no** out-of-bounds flag.

## 7. Verify

- Curl the changed modules / served CSS (`CLAUDE.md` § *Verifying*); `npm run build` exits 0.
- **Read computed values per state in a browser.** `measure-states.mjs` in this folder does it:
  headless Chrome (installed app, `playwright-core` in a scratch dir), the component's shipped
  examples moved into the light DOM so the site stylesheet applies, each state forced with CDP
  `CSS.forcePseudoState` (synthetic mouse events gave wrong `:active` readings). Usage is in its
  header. Compare every row with the skin map; a hook that changes nothing is a finding.
- A hook can be read by the component and **still be dead**: `lightning-button` reads
  `--slds-c-button-neutral-spacing-inline` in a declaration SLDS ships with a stray `;`, so it
  never applies. `hook-map.mjs` lists it as OPEN; only measuring caught it.
- If no browser is available, report the skin as *unverified*.
- Run the SLDS Linter (§4a) and report what remains, block by block.

## 8. Report

1. The match — component, and why it and not its neighbour.
2. The skin map table.
3. What could not be reached, by state, with the reason — and the options (accept, a `sep-`
   modifier, a part on the line, or the custom component gate). Every row a `::part()` would
   close is offered as a question for the user, never silently dropped or silently applied.
4. Where the skin lives, and what changed in the design system.
5. What was verified and how — and what was not.

- **Test levers live before writing them.** Set each candidate hook or property on a real host in headless Chrome and re-read the target; only the ones that move go in the skin (form element, 2026-10-19: of 21 candidates tried, 5 moved). The probe scripts are in the form-element review session; `measure-states.mjs` is the general one.
