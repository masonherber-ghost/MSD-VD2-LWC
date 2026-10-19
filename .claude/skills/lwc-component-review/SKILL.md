---
name: lwc-component-review
description: Review ONE Figma component design (all its variants and states) against the shipped lightning-* component BEFORE anything is built — out of the box first. Maps every visual property to what the component already renders, the component hook (--slds-c-*) that reaches it, a global hook (--slds-g-*) scoped to the host, or nothing; flags values the design asks for that no public hook can set; and audits the assumptions the Figma variable bindings invite (a hue where a semantic token belongs, a "component hook" variable the component never reads, a token whose CSS value differs from its Figma value). Writes a review to _docs and raises questions. Use for "review this component", "is this button design buildable OOTB", "check the hooks for this design", or before component-from-design.
---

# Review a component design — out of the box first

Answers one question per visual property, for every variant and state in the design:
**does the shipped component already do this, and if not, which supported lever reaches it?**
It builds nothing. Its output is a review in `_docs` and a list of questions for the user.
Building comes after, through `component-from-design`, once the questions are answered.

**Read first:** `.claude/rules/rules-skinning.md` (the ladder and the never list) and
`.claude/rules/rules-lwc-components.md` (what ships). This skill applies them; they win.

**OOTB means:** the shipped component, its documented attributes, its `--slds-c-*` hooks, and the
`--slds-g-*` tokens it reads. A design value that needs more than that is a **finding**, not a task.

---

## 1. Read the design — every variant, every state, every binding

`get_metadata` on the frame. An examples frame holds **instances**; follow each to its main
component and **component set** (`getMainComponentAsync()` → `.parent`). Review the set, not the
examples.

Dump each variant with `use_figma` — fills, strokes and stroke weight, effect style, text style,
font, padding, gap, radius, size, and **the variable bound to each** (`boundVariables`, and
`paint.boundVariables.color`). Print the variable's Web code syntax where it has one, its name
where it does not, and `RAW` where nothing is bound. The script used for the button is in the
review it produced (`_docs/component-review-button-2026-10-19.md`, *Method*). Split calls to stay
under the 20 KB return cap; run them in parallel.

Note what the design does **not** cover: hidden icon slots, sizes, stretch, a stateful/pressed state.

## 2. Find the shipped component and map variants

Map each Figma variant to the component's real variant value (`lightning-button`'s are `base`,
`neutral`, `brand`, `brand-outline`, `destructive`, `destructive-text`, `inverse`, `success`).
Check the catalog (`rules-lwc-components.md`). A Figma variant with no shipped equivalent is the
custom-component gate — stop and ask.

## 3. Map what the component really reads — from ITS stylesheet

```bash
node .claude/skills/lwc-component-review/hook-map.mjs <component>                 # every rule
node .claude/skills/lwc-component-review/hook-map.mjs <component> --variant <v>   # one variant
```

`lightning-*` components style themselves in their **own shadow stylesheet**
(`*.slds.css` / `*.lbc.native.css`), not the global SLDS sheet. A hook that exists in the global
sheet may never be read by the component — `--slds-c-button-destructive-*` is the proven case.
**Only a hook the component's own sheet reads is a hook.**

How to read the output:

| The rule… | Means |
|---|---|
| **READS** `--slds-c-x` and nothing inside **SETS** it | Set it on the host → it inherits in. **Rung 4** |
| A variant rule **SETS** `--slds-c-x` | Closed **for that variant**. A host value loses to the inner declaration |
| …and computes it from `--slds-g-y` | Reach it by setting `--slds-g-y` **on that host only** (`lightning-button[variant='x']`). **Rung 5** |
| Reads only `--slds-s-*` / `--sds-*` | Private / internal. **No supported lever** |
| `property: var(--undefined)` or `…, inherit)` | Falls back to inheritance → a real property on the host reaches it. **Rung 6** |
| `part="x"` in the template | `::part(x)` reaches it. **Rung 7 — on the line**; only with the user's agreement |

A hook set on the bare tag (`lightning-button { … }`) reaches **every variant that does not close
it**, which is usually more than intended. Scope by the reflected attribute
(`[variant='neutral']`) and list the leaks.

## 4. Resolve the OOTB value, then compare

For each variant × state × property, resolve what the component renders **today**: follow its
`var()` chain to the global token, then to the value `design-tokens.css` (or Cosmos) gives it.
Then classify against the design:

| Verdict | Meaning | Work |
|---|---|---|
| **OOTB** | Already renders the design value | None |
| **Hook** | An OPEN `--slds-c-*` reaches it | One line in `site.css` § Component skins |
| **Scoped global** | Only via a `--slds-g-*` re-pointed on the host | Allowed, but say what else on that host reads the token |
| **Host property** | Inheritance reaches it | Allowed (rung 6) |
| **::part** | Only `::part` reaches it | On the line — ask |
| **Unreachable** | Private hook only, or closed with no global | Ask: accept OOTB, or change the design |

A "match" is a **resolved value** match — two tokens with the same hex today are still a finding
if the roles differ, because a theme change will split them.

## 5. Audit the assumptions the bindings invite

The variables a designer binds read like instructions. Check each against what code does:

- **Hue instead of role.** A fill bound to a ramp step or a "component hooks" variable
  (`Pink 50`, `destructive-button-container-1`) where SLDS reads a **semantic** token
  (`--slds-g-color-error-container-1`). Say which semantic SLDS uses and what it means in Cosmos —
  `error-container-1` is a pale tint in Cosmos, not a solid fill.
- **A hook that is not read.** A variable named or code-syntaxed as a component hook the
  component's own sheet never reads.
- **Same name, different value in CSS.** Figma `radius-border/circle` = 9999px; the CSS token is
  `100%`, which turns a pill into an ellipse. The pill token is `--slds-g-radius-border-pill`.
- **State tokens the component does not have.** Figma binds per-state text (`on-accent-2` for
  hover) where the component has one text hook for all states.
- **Effects on the wrong layer.** A focus ring drawn as an effect on an outer frame with a
  transparent fill — in code it is the button's own `box-shadow`.
- **Text style name vs weight.** A style called "Semibold" bound to a Medium (500) weight.
- **Hard-coded values.** Line heights, stroke weights, paddings with no variable.
- **Figma geometry vs CSS geometry.** Figma strokes sit inside the frame; CSS borders add to the
  box. A 2px border makes the coded button 4px taller than the drawing at the same padding.

## 6. Write the review — `_docs/component-review-<component>-<YYYY-MM-DD>.md`

**Readers: the designer and the developers.** Sections:

1. Summary — verdict counts, and the questions that block building.
2. Variant map — Figma variant → shipped variant.
3. Per variant: a table of state × property → design token, OOTB value, verdict, lever.
4. Shared properties (type, radius, padding, height, shadows, focus) — once, not per variant.
5. Assumptions the bindings invite (§5).
6. Figma hygiene — unbound values, inconsistent strokes, states identical to default.
7. **Questions** — numbered, each with the options and a recommendation.
8. The build plan *if* the recommendations are accepted — the exact hooks, by selector. Not
   applied.

Every hook named must come out of `hook-map.mjs`. Re-count the verdict totals before saving.

## 7. Report and stop

Give the user the questions, the recommendation for each, and the review link. **Build nothing
until they answer.**

If the review finds that `design-tokens.css` documents a hook wrongly, fix that file and update
`lwc-figma-ds-tokens-import` (its decision log).

---

## Decision log

| Date | Change |
|---|---|
| 2026-10-19 | Created. First run: `lightning-button`, Figma node 18216:94008. `hook-map.mjs` added |
