---
name: assess-tiers
description: Assess the build and component library against the customisation tiers (T1 configure → T5 external embed, and the upgrade gate) — counts of what Salesforce makes available vs what this project has built at each tier, a per-component tier, and every out-of-bounds finding. Use when asked to "assess the tiers", "tier adherence", "audit the component library", "how far past the gate are we", or before a handover / lift into a real org.
---

# Assess tiers

Measures where every component in this project sits on the customisation tiers, and what in it
would not survive an upgrade or a lift into a real Experience Cloud site.

**The tiers are defined in `_docs/customisation-tiers.md` — read it first.** This skill does not
restate them. It measures (a script) and then judges (you), and the judging is the half that matters:
the script reads text, it cannot tell a hand-rolled dropdown from a layout wrapper.

---

## 1. Refresh the inventories

The script reads the generated data modules. Regenerate the two that change with our own source:

```bash
npm run compositions
npm run tokens
```

(`npm run catalog` and `npm run blueprints` only change when a package is upgraded.)

## 2. Run the script

```bash
node .claude/skills/assess-tiers/assess-tiers.mjs          # markdown tables
node .claude/skills/assess-tiers/assess-tiers.mjs --json   # raw data, for your own queries
```

Read-only, exits 0. It prints:

- **Inventory** — what Salesforce makes available (installed versions) against what is used here.
- **Utility classes by family** — the SLDS utility classes (Tier 2) available in the stylesheet we load against those our templates use.
- **Built here** — pages and wrappers counted by the highest tier each reaches.
- **Per component** — tier, base components used, hand-written blueprints, CSS lines, flags.
- **Global stylesheets** — what `fonts.css`, `design-tokens.css` and the site bundle's sources (`src/assets/css/site/**`: `base.css`, one file per component in `components/`, `utilities.css`) set site-wide. Never the generated `site.css`, which would double-count.

How it tiers a component (highest wins): **T4** script owns behaviour (data, `this.*` state,
lifecycle, `window`/`navigator`) · **T3B** stylesheet sets real properties, `::part`, or element
selectors · **T3A** stylesheet only sets/reads custom properties · **T2B** no stylesheet,
presentational script. Pages are T2A by nature; the script reports the tier of their *code*.

## 3. Check what the script cannot

Go through the per-component table and confirm each of these by reading the file:

| Check | How |
|---|---|
| **A hand-rolled control** — a dropdown, modal, tab strip, pill, toggle built from `<div>`s | The antipattern list in `rules-lwc-components.md`. A T4 wrapper with a blueprint and click handlers is the usual suspect |
| **An undocumented attribute** on a `lightning-*` tag | Compare against the component's `@api` list: `grep -n "@api" -A3 node_modules/lightning-base-components/src/lightning/<name>/<name>.js` |
| **Styling by rendered output** — a selector reaching into a component's internals | Flags `SLDS class in selector` / `bare .slds-* override`; read each one |
| **A `::part` that is not preapproved** | Flagged "on the line". Experience Cloud's preapproved parts are `part="dxp-…"`; a base component's own parts are unconfirmed |
| **A private hook** — `--slds-s-*`, `--_slds-*` | Flagged. The SLDS Linter lists both prefixes as private |
| **A global hook reassigned site-wide** | The list under *Global stylesheets*. In a real site these belong to the Theme panel (`--dxp-*`) |
| **A raw hex** that is not a token definition or a `var()` fallback | Flagged per component; `design-tokens.css` is the one place hex belongs |
| **Monolithic pages** | `rules-lwc-layout.md` § Known debt; any page template over ~150 lines |

Dev-tool components (`ui/dataBrowser`, `ui/tokenBrowser`, `ui/kitchenSink`, `ui/exampleStage`,
`ui/blueprintBrowser`, `ui/compositionBrowser`, `example/data`, `example/designSystem`) are not
product surface. Report them, but separately, and do not let them drive the headline.

## 4. Write the report

Write to **`_docs/teirs-adherance.md`**, replacing what is there. Structure:

1. **Headline** — three to five sentences: where the product surface sits, and the one or two things
   that most threaten a lift.
2. **Counts** — the script's inventory and tier tables, pasted as generated, dated.
3. **Out of bounds, ranked** — each finding with: what, how many, where (paths), why it is out (the
   official source), and the fix. Most consequential first.
4. **On the line** — `::part`, scoped SLDS-class selectors, global reassignments: allowed by the
   project's rules, flagged by Salesforce's.
5. **Per-tier notes** — anything a count hides (a T4 that should be T2B, a T3B that is really T3A).
6. **Recommendations** — ordered, each one a concrete change.

Say what was measured and what was judged. A count is a fact; a classification is an opinion.

## 5. Verify

- The script exits 0.
- Spot-check three numbers against an independent `grep` (for example `::part` selectors,
  distinct `<lightning-` tags, `--slds-s-` names) and say in the report that you did.
- Every path cited in the report exists.
