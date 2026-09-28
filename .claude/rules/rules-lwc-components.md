# LWC components — what exists, and the gate for building anything new

This project composes screens from **`lightning-base-components`**, the open-source Lightning base
components, plus SLDS 2 blueprint markup for the structures they do not cover.

This file wins over every other rules file on **component choice**.

---

## The catalog is the source of truth

`src/modules/data/catalog/catalog.js` is **generated** from the installed package by
`scripts/build-catalog.mjs`. It is not hand-maintained and must not be hand-edited. For every
component it records:

| Field | Meaning |
|---|---|
| `name` | Folder name, e.g. `buttonMenu` |
| `tag` | The tag to write, e.g. `lightning-button-menu` |
| `module` | The import specifier, e.g. `lightning/buttonMenu` |
| `properties` | Every `@api` property the component actually exposes |
| `slots` | Named slots (`""` is the default slot) |
| `examples` | Official examples, rendered live at `/design-system` |

Regenerate after upgrading the package: `npm run catalog`. It rewrites the catalog, the example
registry, `src/assets/example-sources.json`, and the `examples/*` module records in
`lwr.config.json`. It cannot disturb routes: those live in `routes.json` — see
`rules-architecture.md` § *Routes*.

`src/modules/data/tokens/tokens.js` is generated the same way, by `npm run tokens`
(`scripts/build-tokens.mjs`), from the installed SLDS stylesheet plus `design-tokens.css`. It backs
the **Tokens** tab at `/design-system` and is likewise never hand-edited. Both scripts read what is
installed, so after upgrading either package run both.

---

## Verify before you write — two commands

**A tag that is not in the catalog does not exist, however plausible it looks.** The library is
Lightning *base* components only. It has no `lightning-record-form`, no `lightning-record-edit-form`,
no `lightning-datatable` inline-edit save handler, no Apex, no LDS wire adapters — those are
platform features that need a real org.

```bash
# 1. Does the component ship?
ls node_modules/lightning-base-components/src/lightning/<name>/

# 2. What properties does it really take?
grep -n "@api" -A3 node_modules/lightning-base-components/src/lightning/<name>/<name>.js
```

For an attribute whose behaviour matters, read the component's own template — it is the only honest
answer about what it renders:

```bash
cat node_modules/lightning-base-components/src/lightning/<name>/<name>.html
```

### Known traps, all found the hard way

| Assumption | Reality |
|---|---|
| `rowActions` in a datatable `action` column accepts `{ fieldName: '…' }` | **No.** It must be an array or a `(row, doneCallback) => …` function |
| `lightning-input`'s `<input>` is one shadow level down | **No.** It is inside `lightning-primitive-input-simple`; a `type="toggle"` input is inside `lightning-primitive-input-toggle` |
| `lightning-card`'s `<article>` is reachable from light-DOM CSS | **No.** Use `lightning-card::part(card)` |
| `lightning-tabset` exposes its tab links directly | **No.** They live in a nested `lightning-tab-bar` shadow root |
| `lightning-input` only fires `change` on blur | **No.** Measured on this build, `type="search"` and `type="email"` both fire `change` on every keystroke; `search` also fires `commit` on blur. So a filter-as-you-type box needs no `onkeyup` — `ui/jobFilterBar` relies on this. What `change` cannot tell you is that *Enter* was pressed, which is the one thing `onkeyup` is still for (`example/login`) |
| A getter re-runs when the module state it reads changes | **No.** LWC re-renders only when a *field* read during the last render changes. A getter reaching into a module records no dependency — see `rules-app-logic.md` § *The reactivity rule* |
| A `lightning-combobox` flips its dropdown up near the viewport bottom | **No.** It opens downward off-screen. In a docked bar use `lightning-radio-group type="button"` or a `bottom-*` `menu-alignment` |
| A margin utility on a `lightning-*` tag spaces it out | **Only if the host is a block.** A custom element is `display:inline` by default and `lightning-card` sets no `:host` display, so a vertical margin computes but never applies. `site.css` makes `lightning-card` a block — see `rules-lwc-layout.md` § *Stacked cards* |

---

## SLDS classes — verify these too

The SLDS 2 stylesheet is **not** SLDS 1. Classes were removed. Check the shipped CSS before using
a class you remember from older Salesforce work:

```bash
grep -c "slds-<class-name>" site/public/slds/slds2.lightning-blue.css
```

`0` means it does not exist in this build.

**Faster: `/design-system` → Blueprints.** Filterable by class name, with the classes each
blueprint declares, the hooks it exposes, the private ones it does not, and where this site already
uses it. It flags the two classes that a blueprint's own stylesheet declares but the bundled
stylesheet does not ship — `slds-table_column` and `slds-setup-assistant__step` — which is the exact
failure the grep above is for.

By default it lists only the **37 blueprints no shipped component renders**, which is the set worth
writing by hand; a checkbox reveals the other 52. That coverage is computed from the SLDS classes
the components actually emit, following the import graph through private components — so
`lightning-tabset` is credited with the `tabs` blueprint even though `tabBar` is what writes
`slds-tabs_default`. Names are never compared: only 30 blueprints have a tag of the same name.

**There are no rendered previews and there cannot be.** SLDS 2 ships `dist/` as 134 CSS files and,
across all 89 blueprints, exactly one HTML file. Generated by `npm run blueprints`.

| Removed in SLDS 2 | Use instead |
|---|---|
| `slds-page-header_record-home` | Base `slds-page-header` + `__row` / `__col-title` / `__col-actions` / `__detail-block` |

Some blueprints behave differently than they read. `.slds-path__item.slds-is-complete` flips the
stage label away with `rotateX(180deg)` and reveals a tick — a completed path step showing no label
is **correct**, not a bug.

---

## The custom component gate

**Building a component the library does not provide is a decision for the user, not for you.**

When a design needs something with no `lightning-*` equivalent:

1. **Stop.** Do not start writing bespoke markup.
2. **Say so plainly**, in one or two sentences: what the design needs, what the closest shipped
   component is, and why it does not fit.
3. **Ask whether to build it**, and say where it would live (`src/modules/ui/<name>/`).
4. **Wait for an answer** before writing it.

This applies to a genuinely new UI *component*. It does not apply to:

- Composing existing components into a page — that is the normal job.
- SLDS blueprint markup for a structure the library has no component for (page header, path,
  timeline, tiles). That markup **is** the Salesforce-sanctioned way to build those; use it.
- A thin page-level wrapper, like `ui/pagePlaceholder`.

### The test

> Am I hand-writing markup and CSS that reproduces a *control* — something with state, interaction
> or keyboard behaviour — that Salesforce would ship as a component?

If yes → ask first. If it is layout, structure or a static blueprint → carry on.

### Antipattern

Hand-rolling a `<div>`-and-CSS dropdown, modal, combobox, tab strip, pill or toggle. Every one of
those ships. `lightning-button-menu`, `lightning-modal`, `lightning-combobox`, `lightning-tabset`,
`lightning-pill`, `lightning-input type="toggle"`.

---

## Where custom components live

| Namespace | Holds |
|---|---|
| `src/modules/example/` | Route root components — one per `lwr.config.json` route |
| `src/modules/ui/` | Shared presentational components (`siteHeader`, `dataBrowser`, `pagePlaceholder`) |
| `src/modules/data/` | Non-visual modules — the API client, the session, the generated catalog |

A component is a folder whose `.js`/`.ts`, `.html` and optional `.css` all share the folder's name.
The tag is the camelCase name kebab-cased: `ui/siteHeader` → `<ui-site-header>`.

---

## Light DOM

Every component in this project sets `static renderMode = 'light'` and every template opens with
`<template lwc:render-mode="light">`. Keep it that way: the SLDS stylesheet is global and unscoped,
so a shadow-DOM component would be unstyled.

The `lightning-*` components are shadow-DOM internally — that is theirs to manage, and the reason
the traps table above exists. They still style correctly because they set their SLDS classes on
their *host* element, which sits in the light DOM.
