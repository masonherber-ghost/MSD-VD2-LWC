# Architecture — LWR, modules, routes, and the static build

How the project is wired. Read this before changing `lwr.config.json`, adding a route, or touching
the dev server.

---

## Two halves, one package.json

| Half | Lives in | Runs |
|---|---|---|
| Site | `src/` | LWR — `npm run dev` (with API) or `npm run dev:lwr` (site only) |
| API | `server/` | Express, mounted into LWR's internal server by `scripts/dev-server.ts` |

`npm run dev` runs both on one port via `tsx scripts/dev-server.ts`. There is no compile step for
the server — `tsx` executes TypeScript directly.

## Module resolution

`lwr.config.json` → `lwc.modules` resolves every LWC import:

```json
"modules": [
  { "dir": "$rootDir/src/modules" },
  { "npm": "lightning-base-components" },
  { "name": "examples/…", "path": "node_modules/…" }
]
```

- `dir` — our own components, as `namespace/name`.
- `npm` — `lightning-base-components` ships its own `lwc.modules` declaring both its component
  directory and stubs for every `@salesforce/*` platform import (labels, i18n, feature flags). One
  entry pulls all of it in.
- `name`/`path` — the `examples/*` records for `/design-system`. **Generated.** `npm run catalog`
  rewrites this block; never hand-edit it.

`npm run catalog` never touches `routes`. Routes are hand-maintained.

## Routes

**Routes live in `routes.json`, not in `lwr.config.json`.**

Adding a route is two steps:

1. An entry in `routes.json` → `routes[]`:
   ```json
   { "id": "jobs", "path": "/jobs", "rootComponent": "example/jobs",
     "layoutTemplate": "$layoutsDir/main.njk" }
   ```
2. A matching component at `src/modules/example/jobs/`.

Every route uses `src/layouts/main.njk`, which loads the SLDS stylesheet and `site.css` and is the
only HTML shell. So "the template for a route" is always two files: that one shell, shared by every
route, plus the `rootComponent`'s own `.html`.

### How routes get out of routes.json — the hook

`lwr.config.json` is the only file LWR reads, it is JSON, and JSON has no include mechanism. Routes
therefore cannot simply live elsewhere. What LWR does support is `hooks`: modules it instantiates
during config resolution, whose `initConfigs` may mutate the global config **before** routes are
normalised and validated. That is the seam `scripts/routes-hook.mjs` uses, declared as:

```json
"hooks": ["$rootDir/scripts/routes-hook.mjs"]
```

It runs for `npm run dev` **and** `npm run build`, because hooks belong to config resolution rather
than to the dev server. Verified both ways: every route serves in dev, and all 19 are emitted to
`site/`.

Two consequences:

- **`lwr.config.json` has no `routes` block.** Adding one back does nothing — the hook overwrites
  `globalConfig.routes` wholesale.
- **A malformed `routes.json` fails the boot**, deliberately, rather than starting a site with no
  routes.

**Query parameters are not part of the route.** LWR matches on path only, so `?id=2` is read at
runtime from `window.location.search`. Guard it for the static build:

```ts
if (typeof window === 'undefined') return null;
```

A component reading a query param must fall back sensibly when it is missing or unknown —
`example/jobDetail` falls back to the account's first vacancy.

## Assets

`lwr.config.json` → `assets[]` maps directories to URL paths:

| Alias | From | Served at |
|---|---|---|
| `assetsDir` | `src/assets` | `/public/assets` |
| `sldsCss` | `node_modules/@salesforce-ux/design-system-2/dist/css/bundled` | `/public/slds` |
| `favicon` | `src/assets/favicon.ico` | `/favicon.ico` |

The stylesheet is the **unscoped** `slds2.cosmos.css` — the Cosmos theme, SLDS 2's default — loaded
globally in `main.njk`. (The package also ships `slds2.lightning-blue.css`, the classic theme this
site used before; the alert, notification and badge rules are identical in both, but 517 tokens
differ — Cosmos draws status as pale tinted fills with coloured text, and rounds `radius-border-2`
to 8px.) Cosmos's dark mode is opt-in through a `slds-color-scheme_*` class on `<body>`, which this
site does not set, so it renders light. There
is no cascade-layer juggling and no scope wrapper — which is precisely why every component must be
light DOM (see `rules-lwc-components.md`).

### `url()` inside a stylesheet must be absolute — the trap

**A relative `url()` in our CSS passes `npm run dev`, passes `npm run build`, and then 404s in the
built site.**

LWR rewrites the `href` of a `<link>` in `main.njk` to the hashed asset URL. It does **not** rewrite
a `url()` inside a stylesheet — that is emitted byte for byte, verified against both our
`fonts.css` and the shipped SLDS stylesheet, whose own `url(../../public/einstein-figure.svg)`
comes out of the build unchanged. And by the CSS spec a relative URL in a stylesheet resolves
against *that stylesheet's* URL, not the page's. Those differ between dev and the build:

| | `fonts.css` is served at | `url(../fonts/x.woff2)` resolves to |
|---|---|---|
| `npm run dev` | `/1/asset/s/latest/public/assets/css/` | `/1/asset/s/latest/public/assets/fonts/x.woff2` — **exists** |
| `npm run build` | `/1/asset/immutable/s/<hashA>/public/assets/css/` | `/1/asset/immutable/s/<hashA>/public/assets/fonts/x.woff2` — **does not** |

In dev every asset shares one `s/latest/` prefix, so relative paths between assets happen to work.
The build gives **each asset its own immutable hash directory**: `fonts.css` lands alone in
`<hashA>`, the woff2 files get `<hashB>`, `<hashC>` and so on, and nothing sits beside anything.

So: write the path the `assets[]` mapping serves, not a path relative to the stylesheet.

```css
/* Yes — the assetsDir mapping serves this under dev and the build alike */
src: url(/public/assets/fonts/atkinson-hyperlegible-next-latin-wght-normal.woff2);

/* No — resolves against the stylesheet's own URL, which the build changes */
src: url(../fonts/atkinson-hyperlegible-next-latin-wght-normal.woff2);
```

The cost is that the referenced file misses immutable-hash caching. Take it; a broken font is worse
than a revalidation. `font-display: swap` plus a `<link rel="preload">` in `main.njk` covers it.

This applies to every relative URL in a stylesheet, not just `@font-face` — `background-image`,
`mask-image`, `@import`, all of them resolve the same way. `src/assets/css/fonts.css` is currently
the only file in the project with a `url()` at all; keep it that way by checking before you add one:

```bash
grep -rn "url(" src/assets/css/ src/modules --include="*.css"
```

**Why nothing catches it.** LWR does check asset references, and warns when one cannot be resolved:

```
[warn][lwr-default-asset-transformer] Failed to resolve reference
  '../../public/einstein-figure.svg' in asset '…/slds2.cosmos.css'
```

That warning is no help here, because it resolves the reference **against the source tree**, where
`src/assets/css/` → `../fonts/` → `src/assets/fonts/` is perfectly valid. The path is only wrong
once served. So the transformer stays quiet, the build exits 0, and the dev server answers because
of its shared prefix. All three agree, and all three are looking at the wrong thing.

(Those two `einstein-*.svg` warnings are pre-existing and are SLDS's own — the bundled dist omits
the images its stylesheet points at. Not ours, and not fixable from here.)

The only honest check is to serve the build and request the asset:

```bash
npm run build && PORT=3200 npm run start
curl -sL -o /dev/null -w '%{http_code} %{content_type}\n' \
  http://localhost:3200/public/assets/fonts/<file>.woff2
```

`200 font/woff2` is the pass. Loading a page in dev will not tell you.

## Light DOM everywhere

Every component:

```ts
export default class Thing extends LightningElement {
    static renderMode: 'light' | 'shadow' = 'light';
}
```

```html
<template lwc:render-mode="light">
```

Both halves are required. Omit either and the component renders into a shadow root the global SLDS
stylesheet cannot reach.

## The static build

`npm run build` produces a fully static site in `site/` — **with no `/api`**.

This is the single most important constraint on data-backed screens. LWR answers `/api/*` in the
static build with the HTML shell, so `data/api` detects a non-JSON response and throws
`ApiError('Live data is not available in this build.')`. Every screen must catch it and render an
empty state:

```ts
} catch (e) {
    // The static build has no /api, so this is an expected state there.
    this.error = e instanceof ApiError ? e.message : 'Could not load …';
} finally {
    this.loading = false;
}
```

An unhandled rejection here is the only thing that breaks the static build.

LWR's SSG emits a shell and renders client-side, so `connectedCallback` runs in the browser only —
`window` access there is safe in practice, but guard it anyway for clarity.

`site/` is gitignored; building is always safe.

## Verifying a change

A green build proves the modules compile. It does **not** prove the page renders — LWR renders
client-side, so a template error surfaces only at runtime. Load the page in a browser and read the
console before calling anything done.

To check a module compiles without a browser:

```bash
curl -sL -o /dev/null -w '%{http_code}\n' \
  "http://localhost:3000/1/module/esm/0/l/en-US/mi/example%2Fjobs%2Fv%2F0_0_1/latest/example_jobs.js"
```

`500` there is a compile error — the dev server log has it in full. If the error quotes source that
is no longer in the file, it is cached: see *The module cache* below.

## The module cache — the trap

`__lwr_cache__/` holds LWR's compiled modules. **It caches failures as well as successes**, and a
cached compile error survives editing the file that caused it: the dev server keeps answering `500`
and keeps printing the *original* error, quoting source lines that are no longer on disk.

The tell is an error whose quoted code does not match the file:

```
SyntaxError: .../siteNav.ts: LWC1099: Boolean public property must default to false.
> 34 |   @api
     |   ^
  35 |   hasVacancies = true;      <- but the file now says `noVacancies = false`
```

When the quoted line and the file disagree, stop debugging the code. The code is already fixed.

```bash
lsof -ti:3000 | xargs kill      # the watcher does not clear this on its own
rm -rf __lwr_cache__
npm run dev
```

Two things follow from this:

- **A fix that "did not take" is usually this**, not a wrong fix. Check the file on disk against the
  error's quoted lines before changing anything else.
- **`__lwr_cache__` is disposable.** It is gitignored and rebuilt on demand, so deleting it is
  always safe — it only costs one slow first compile.

`npm run build` writes `site/` from scratch and is unaffected, which is why a build can pass while
the dev server still serves a stale 500. Neither proves the other.

Not to be confused with the **npm** cache below — different cache, different problem.

## Version pinning

`create-lwr` scaffolds `lwc` a version behind the compiler `lwr` bundles, which makes every
template log a version-mismatch error at runtime. `lwc` is pinned to `9.4.3` against `lwr` `0.24.1`.

**If you upgrade `lwr`:** check `npm ls @lwc/compiler` and realign `lwc` to match.

Overlay components (`LightningAlert.open()`, `LightningConfirm.open()`, `LightningPrompt.open()`,
`Toast.show()`) create their own overlay container and work standalone. `ShowToastEvent` alone does
not — it needs a Lightning Experience host to catch the event.

## npm cache

The npm cache on this machine is root-owned; `npm install` fails with `EACCES`. Use
`npm install --cache <writable-dir>` to get unblocked.
