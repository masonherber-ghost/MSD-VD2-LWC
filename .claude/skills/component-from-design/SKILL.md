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
- **Values** — each one *by its design token name*, then find the `--site-*` token that holds it
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

| Design property | State | Design token → `--site-*` | Lever (rung) | Hook / class | Reachable? |
|---|---|---|---|---|---|

Fill "Reachable?" honestly: **yes**, **no — no hook**, **no — internal state**, **on the line —
part only**. This table goes in the report and, condensed, in the skin's comment.

## 5. Apply it

- Write the skin where `rules-skinning.md` § *Where the skin lives* says: usually a block in
  `site.css` under *Component skins*, selected by the tag.
- Values are tokens only. Comment: design source (file + node), states covered, states not covered
  and why.
- Attributes the design implies (`input-icon-name`, `input-maxlength`, `variant`) are set **where
  the component is used**, not in CSS.

## 6. Update the design system

- **`/design-system` → Components** renders the shipped examples live, so a skin set on the tag
  shows there automatically — check that the component has examples (`ls
  node_modules/lightning-base-components/src/lightning/<name>/__examples__/`).
- `npm run compositions` if you added a `sep-` class or a wrapper; `npm run tokens` if you added a
  token.
- Run the `assess-tiers` skill: the skin must add **no** out-of-bounds flag.

## 7. Verify

- Curl the changed modules / served CSS (`CLAUDE.md` § *Verifying*); `npm run build` exits 0.
- **Read computed values per state in a browser.** If none is available, report the skin as
  *unverified* — a compiled hook can be a no-op.

## 8. Report

1. The match — component, and why it and not its neighbour.
2. The skin map table.
3. What could not be reached, by state, with the reason — and the options (accept, a `sep-`
   modifier, a part on the line, or the custom component gate).
4. Where the skin lives, and what changed in the design system.
5. What was verified and how — and what was not.
