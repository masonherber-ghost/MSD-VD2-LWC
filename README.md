# MSD Component Library (LWR + Lightning base components + SLDS 2)

A standalone prototype site for designing against the Salesforce Lightning look and
feel — no Salesforce org, no deploy, no authentication. It runs as a plain
[LWR](https://developer.salesforce.com/docs/platform/lwr/overview) site with the
open-source Lightning base components installed as an npm dependency.

## What's wired up

| Concern | Package | Notes |
| --- | --- | --- |
| Framework | `lwc` | Kept in step with the compiler LWR bundles (see *Version pinning*) |
| Dev server / SSG | `lwr` | `npm run dev`, `npm run build` |
| Components | `lightning-base-components` | 84 exposed `lightning-*` components |
| Styling | `@salesforce-ux/design-system-2` | SLDS 2, Lightning Blue theme |

> `github.com/salesforce/lwc` is the LWC **framework** and ships no `lightning-*`
> components. The base components live in `lightning-base-components`, which is
> what this project installs.

## Running it

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # static build into ./site
npm run start    # serve the built site
npm run catalog  # regenerate the component catalog (see below)
```

## How the wiring works

### Components

`lightning-base-components` ships its own `lwc.modules` config declaring both its
component directory and stubs for every `@salesforce/*` platform import
(labels, i18n, feature flags). LWR consumes all of that through one entry in
`lwr.config.json`:

```json
"lwc": {
    "modules": [
        { "dir": "$rootDir/src/modules" },
        { "npm": "lightning-base-components" }
    ]
}
```

No per-component registration is needed. Any of the 84 components can be dropped
into a template and LWR resolves it:

```html
<lightning-card title="Account" icon-name="standard:account">
    <lightning-input label="Name"></lightning-input>
    <lightning-button variant="brand" label="Save"></lightning-button>
</lightning-card>
```

Icons are inlined as LWC templates inside the package — there is no SLDS icon
sprite to host or configure.

### Styling

The SLDS 2 bundle is served as a static asset and linked from a custom layout:

- `lwr.config.json` maps `@salesforce-ux/design-system-2/dist/css/bundled` to `/public/slds`
- `src/layouts/main.njk` links `slds2.lightning-blue.css` and is set as the route's `layoutTemplate`

Swap the stylesheet in that layout to change theme — `slds2.cosmos.css` is the
other bundled theme, and `dist/css/modular/` has base + theme layers separately.

Note that the layout is Nunjucks, so it uses `{{ body | safe }}`, **not** the
`{{{body}}}` syntax of LWR's built-in default layout.

### Light DOM

Site chrome (`example/app`, `ui/*`, `gallery/*`) sets `static renderMode = 'light'`.
Global SLDS utility classes cannot cross a shadow boundary, so any component of
ours that uses `slds-*` classes must be light DOM. The base components are
unaffected — they bundle their own styles.

## The catalog

`npm run catalog` regenerates `src/modules/data/catalog/catalog.js` by reading the
installed package. A module is treated as a usable component when it is marked
`isExposed` in its `*.js-meta.xml`, exports a default class, and ships a template.
That filter separates the 84 real components from internal primitives, service
modules (`navigation`, `messageDispatcher`) and CSS-only style modules
(`sldsUtils*`). Re-run it after upgrading `lightning-base-components`.

The **Full catalog** page in the site renders this data with a live filter over
tag, module name and public properties.

## Layout of the source

```
src/
  layouts/main.njk              custom HTML layout (loads SLDS)
  modules/
    example/app/                app shell: global header, sidebar, routing
    ui/demoCard/                demo frame with toggleable markup snippet
    ui/catalogTable/            searchable catalog
    gallery/overview/           landing section
    gallery/buttons/            buttons, icon buttons, groups, menus
    gallery/forms/              inputs, selection, compound fields, validation
    gallery/data/               datatable, tree, tiles, formatted-* output
    gallery/feedback/           alert/confirm/prompt/toast, spinner, progress
    gallery/layout/             grid, cards, tabs, accordion, breadcrumbs, nav
    data/catalog/               GENERATED component catalog
scripts/build-catalog.mjs       catalog generator
```

Add a section by creating a `gallery/<name>` component and adding an entry to
`SECTIONS` in `src/modules/example/app/app.ts` plus a matching tag in `app.html`.

## Things worth knowing

**Version pinning.** `create-lwr` scaffolds `lwc` at a version behind the compiler
that `lwr` bundles, which makes every template log a version-mismatch error at
runtime. This project pins `lwc` to match (`9.4.3` against `lwr` `0.24.1`). If you
upgrade `lwr`, check `npm ls @lwc/compiler` and realign `lwc`.

**Overlays work standalone.** `LightningAlert.open()`, `LightningConfirm.open()`,
`LightningPrompt.open()` and `Toast.show()` create their own overlay container, so
they need no Lightning Experience host. `ShowToastEvent` on its own does *not*
work outside the platform — use `Toast.show(config, this)`.

**Build warnings.** The SLDS 2 CSS references two Einstein SVGs that the published
package does not ship. The warnings are harmless unless you use the Einstein
header classes.

**Fonts.** Salesforce Sans is not redistributed in the npm package, so type falls
back to the system sans stack. Add the font files and a `@font-face` rule in the
layout if exact type matters.
