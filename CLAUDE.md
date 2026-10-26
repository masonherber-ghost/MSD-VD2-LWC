# MSD VD2 — LWC prototype

Task routing for this repository. This file says **what this project is and which rules file
applies to which kind of task**. It deliberately carries no feature requirements and no product
copy — those belong in `_docs/` and in the screens themselves. Keep it that way.

## What this is

A **standalone design prototype of the MSD employer portal**, built to look and behave like a real
Salesforce Lightning Experience app. It runs as a plain LWR site: **no Salesforce org, no
`sfdx`/metadata deploy, no Apex, no LDS wire adapters.** Components are the open-source
`lightning-base-components`, styled by the SLDS 2 stylesheet loaded globally.

The goal is that a downstream Salesforce developer could lift a component into a real DX project
with minimal refactoring. That is why the layout and composition rules matter as much as the
visuals — see `rules-lwc-layout.md`.

Data is a local SQLite file served by an Express API that exists **under `npm run dev` only**.
`npm run build` produces a static site with no `/api`; every screen must degrade to an empty state
there rather than throwing.

## Stack

| Concern | Package | Notes |
|---|---|---|
| Framework | `lwc` `9.4.3` | Pinned to the compiler `lwr` bundles — see `rules-architecture.md` |
| Dev server / SSG | `lwr` `0.24.1` | `npm run dev`, `npm run build` |
| Components | `lightning-base-components` `1.28.19-alpha` | 84 `lightning-*` components |
| Styling | `@salesforce-ux/design-system-2` `2.264.2` | SLDS 2, Cosmos theme (the SLDS 2 default), **unscoped and global** |
| Data (dev only) | `better-sqlite3` | Express API over `data/msd-vd2.db` |
| Server language | TypeScript via `tsx` | No build step; `tsx` runs `.ts` directly |

Frontend in `src/`, backend in `server/`, both driven from one root `package.json`.
`npm run dev` starts the site and the API on one port.

## Rules

Read the rules file that covers the task **before** writing code. Where two conflict, the more
specific one wins.

@.claude/rules/rules-architecture.md
@.claude/rules/rules-lwc-components.md
@.claude/rules/rules-lwc-layout.md
@.claude/rules/rules-skinning.md
@.claude/rules/rules-database.md
@.claude/rules/rules-app-logic.md

| File | Covers |
|---|---|
| [`rules-architecture.md`](.claude/rules/rules-architecture.md) | LWR config, module resolution, routing, light DOM, the static build, version pinning |
| [`rules-lwc-components.md`](.claude/rules/rules-lwc-components.md) | **Which components exist and how to verify it.** The gate for building anything custom |
| [`rules-lwc-layout.md`](.claude/rules/rules-lwc-layout.md) | Lightning page anatomy, spacing, styling hooks, the modular-component rule |
| [`rules-skinning.md`](.claude/rules/rules-skinning.md) | Skinning a shipped component: the lever ladder, where a skin lives, the never list |
| [`rules-database.md`](.claude/rules/rules-database.md) | Schema → repository → route → client. Allow-lists, WAL, seed scripts |
| [`rules-app-logic.md`](.claude/rules/rules-app-logic.md) | Business rules: auth, account scoping, locked fields, primary contact |

## Workflows

### Build from a wireframe, mockup or Figma design
**Use the `build-from-wireframe` skill.** Any visual design — an attached image, a pasted
screenshot, a Figma link or frame — routes there by default, without being asked for by name.

The short version, which the skill expands: map every region of the design to something that
already ships, build it out of that, and report what you could not match. Match structure, labels,
order, states and behaviour; leave the skin as Lightning ships it. **Never build a new custom
component and never customise a shipped one to chase the picture** — get as close as the Salesforce
lego allows and say where it falls short.

### Skin a component to a design
**Use the `component-from-design` skill** for one component (a Figma frame or an HTML page): it finds
the shipped match, skins it with only the levers `rules-skinning.md` allows, and updates the design
system. A whole page still goes through `build-from-wireframe`. Each shipped component's skin is
one file, `src/assets/css/site/components/<tag>.css` (`button.css` for `lightning-button`),
bundled into `site.css` — see `rules-architecture.md` § *Stylesheets*.

### Review a component design before building it
**Use the `lwc-component-review` skill** when given a Figma component (all its variants and
states). Out of the box first: it maps every property to what the shipped component renders, the
hook its OWN stylesheet reads (`hook-map.mjs`), or nothing, writes a review to `_docs`, and raises
questions. Build nothing until they are answered, then use `component-from-design`.

### Import or change design tokens
**Use the `lwc-figma-ds-tokens-import` skill** for a Figma variables import, and for any edit to
`src/assets/css/design-tokens.css`. It records the decisions already made (`--sep-*` prefix, light
values only, all 524 globals declared, Figma's value wherever Figma defines the hook; the token block
is generated by its `write-tokens.mjs`, grouped by token type) and `check-tokens.mjs` verifies the file. Update the
skill's *Current state* and decision log whenever the tokens file changes.

### Import or change icons
**Use the `lwc-figma-icons-import` skill** to import the SEP icon set from Figma, to map a
Salesforce icon name to a SEP icon (`src/icons/icon-map.json`), or for anything else under
`src/icons/`. Every `lightning-*` icon draws from that set, not Salesforce's — see
`rules-architecture.md` § *Icons*.

### Build or change a page
1. `rules-lwc-components.md` — find the components that already exist. **Do not invent tags.**
2. `rules-lwc-layout.md` — pick the page anatomy and compose it modularly.
3. `rules-app-logic.md` if the screen touches auth, accounts, or permissions.
4. Verify before reporting it done — see *Verifying* below.

### Add a route
`routes.json` → `routes[]` entry + a matching component under `src/modules/example/`.
Routes are **not** in `lwr.config.json` — `scripts/routes-hook.mjs` injects them during config
resolution, for `dev` and `build` alike. Details in `rules-architecture.md`.

### Add or change data
`rules-database.md`. The order is always schema → repository → route → `data/api` client → screen.
Never let a screen reach the database directly.

### Add a component the library does not have
**Stop and ask first.** This is a hard gate — see `rules-lwc-components.md` § *The custom
component gate*.

### Gate something behind a release
`rules-app-logic.md` § *Release preview*. Register the flag, hold the release in a field, pass it
to `isEnabled`, and gate the whole widget.

### Browse what the component library can do
`npm run dev` → `/design-system`. Seven tabs, every one generated — from the installed packages, or
from this project's own source. Nothing on that page is hand-maintained.

| Tab | Shows | Regenerate |
|---|---|---|
| **Foundations** | Typography: every class that sets type, the full `--slds-g-font-scale-*` scale with the classes that reach each step (and the CSS a classless step needs), and the weights | `npm run foundations` |
| **Icons** | The SEP icon set, each drawn live through `lightning-icon`, with the Salesforce names that draw it and every name still drawing the placeholder | `npm run icons` |
| **Components** | Every shipped `lightning-*` example, rendered live — plus project examples from `src/examples/<component>/<name>/`, tabbed "(project)" | `npm run catalog` |
| **Blueprints** | The 37 blueprints **no shipped component renders** — the ones you write by hand. Classes declared, whether they are in the stylesheet we actually load, hooks you may set, private ones you may not, and where this site uses each. A checkbox reveals the other 52 | `npm run blueprints` |
| **Compositions** | Every wrapper in `src/modules/ui/`, ordered by how much CSS it needed, with what that CSS touches — plus the `sep-` classes in `src/assets/css/site/` | `npm run compositions` |
| **Tokens** | Every design token with its resolved value: this project's `--sep-*` and the SLDS globals by family | `npm run tokens` |
| **Component hooks** | The `--slds-c-*` hooks you may set, grouped by component | `npm run tokens` |

Re-run `catalog`, `tokens`, `blueprints` and `foundations` after upgrading a package. Re-run `compositions` after
adding or restyling a wrapper — it reads our source, not the packages, and each wrapper's
description on that page is its own leading docblock, so the explanation lives with the code.

### Reset or reseed data
`npm run db:reset` (restore from seed), `npm run auth:dev-passwords`, `npm run seed:team`.
All documented in `rules-database.md`.

## Before every implementation

1. **Check the component exists.** `rules-lwc-components.md` gives the two commands. A tag that is
   not in the catalog does not exist, however plausible it looks.
2. **Check the SLDS class exists** in the shipped stylesheet before using it. SLDS 2 dropped
   classes that SLDS 1 had (`slds-page-header_record-home` is the known trap).
3. **Read the existing screen that does the same thing.** `jobDetail` is the reference record page,
   `jobs` the reference list page, `manageOrg` the reference two-tab admin page.

## Verifying

<!-- FAST MODE — enabled deliberately to see how much time the screenshot loop costs.
     To restore the full checks, delete this block and uncomment "Full mode" below. -->

Run the cheap checks. **Do not screenshot and analyse the page unless asked**, or unless a
cheap check comes back wrong and you need to see why.

- `npm run dev` on a free port, then **curl the TEMPLATE module** of every component you touched.
  The template is its own module (`<name>%23<name>.html`); the component's `.js` URL does **not**
  compile it, and answers `200` over a broken template — measured. `500` is a compile error, with
  the detail in the dev server log:
  ```bash
  curl -sL -o /dev/null -w '%{http_code}\n' \
    "http://localhost:3000/1/module/esm/0/l/en-US/mi/example%2Fjobs%23jobs.html%2Fv%2F0_0_1/latest/example_jobs_jobs_html.js"
  ```
- `npm run build` must exit 0 before reporting completion. It does **not** prove templates compile
  either: it exited 0 over the same broken template.
- **Reading a computed value beats looking at a picture** and is faster. When a change has a
  number behind it — a size, a colour, a font — read it back off the rendered element rather
  than eyeballing it. That is what caught a button silently rendering in Arial, and a
  `font-weight` hook that was a no-op.
- **If the change adds an asset a stylesheet points at** (a font, an image), dev and a green build
  both prove nothing — serve the build (`npm run start`) and request the file. See
  `rules-architecture.md` § *`url()` inside a stylesheet must be absolute*.
- If a test wrote to `data/msd-vd2.db`, **restore it** and confirm with `git status`.

**Say so when reporting.** A change verified this way is "compiles and builds", not "checked in a
browser" — claim only what was done. This trades away the class of bug that shows up only visually:
an invisible icon, an element sitting behind another, a control off the edge at 390px.

<!-- Full mode — restore by deleting the block above.

A change is not done until it has run in a browser. The static build passing is not sufficient —
LWR renders client-side, so a template error only appears at runtime.

- `npm run dev` on a free port, then drive the page and read the console.
- `npm run build` must exit 0 before reporting completion.
- If a test wrote to `data/msd-vd2.db`, restore it and confirm with `git status`.
-->

## Always

- Compose from existing `lightning-*` components first, SLDS blueprint markup second.
- Handle the no-API case on every data-backed screen (the static build has no `/api`).
- Use SLDS spacing utilities and styling hooks, never raw pixel values.
- Keep the server's allow-lists (`*_UPDATABLE`) as the only writable-field authority.
- Restore any seed data a test touched.

## Never

- Invent a `lightning-*` tag, attribute, or SLDS class without verifying it ships.
- Restyle a shipped component's internals to match a mockup. Get as close as the lego allows,
  then say what is off.
- Hand-author markup for something a shipped component already renders.
- Build a custom component without asking first.
- Let a screen call the database directly, or trust the client for a business rule.
- Commit a `data/*.db` change that is only a side effect of testing.
- Edit `src/assets/css/site.css` by hand. It is generated from `src/assets/css/site/` by
  `npm run css` (and on every save under `npm run dev`).
- Edit `src/icons/sepIcons/` or the icon entries in `lwr.config.json` by hand. Both are generated
  by `npm run icons` from `src/icons/`.
- Leave switched-off CSS behind as a commented block. Delete it; git keeps the history.
- Write a relative `url()` in a stylesheet. It works in dev, survives the build, and 404s in the
  built site — use the `/public/assets/…` path the `assets[]` mapping serves.
