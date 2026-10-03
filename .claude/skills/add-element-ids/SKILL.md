---
name: add-element-ids
description: Add stable `id` attributes to every landmark element on a page or component — sections, layout columns, cards, components, buttons, links, icons, form controls and state blocks. Use when asked to "add ids", "give elements ids", "make this page scriptable/reviewable", or when building or touching a screen that is missing them.
---

# Add element ids

Every landmark element carries an `id` so a page can be reviewed, annotated and scripted against
with a handle that does not move when a class changes. **The rule itself — what gets one, the
naming scheme and its four traps — is `rules-lwc-layout.md` § *Every landmark element gets an
`id`*. Read it first.** This skill is the procedure, plus what that section does not cover:
components that render more than once, loops, and the template-expression trap.

---

## 1. Decide the prefix by what kind of component it is

| Component | Renders | Prefix | How |
|---|---|---|---|
| Route component (`example/*`) | Once, on its own page | The page: `job-detail-`, `profile-` | Static `id="…"` in the template |
| Singleton shell (`ui/siteHeader`, `ui/siteFooter`) | Once on every page | Its own: `site-header-`, `site-footer-` | Static `id="…"` |
| Region used by one page (`ui/jobManageHeader`) | Once, on one page | Its own: `job-header-` | Static `id="…"` |
| **Shared component** (`ui/jobListingPreview`) | On more than one route | **Set by the page** | `@api idPrefix` + an `ids` getter — see §3 |
| A component placed twice with a mode (`ui/siteNav`, `region=`) | Twice per page, one branch each | Per branch: `site-nav-links-`, `site-nav-menu-` | Static, one prefix per branch |

The test for "shared": would a fixed id collide anywhere — two routes, or two instances on one
page? If yes, the page names it.

## 2. Walk the template and tag each landmark

Top to bottom. For each element ask the rule's test: **would you point at it in a review, or reach
for it in a script?**

- Containers and regions: `site__body`, `site__main`, each `lightning-layout` that is a region,
  each `lightning-layout-item` that is a column.
- Every `lightning-card`, `lightning-tabset`, `lightning-tab`, `lightning-datatable`.
- Headings that name a section.
- Every button, link, `lightning-button-menu` and `lightning-menu-item` that does something.
- Icons, avatars, spinners, badges, progress bars.
- Form controls, and a locked field's read-only twin (`-field-` / `-static-`).
- Every state block: loading, error, empty, no-matches, signed-out.
- Each child component's **host** tag (`<ui-job-listing-preview id="…">`).

Skip purely presentational wrappers and text inside a block that already has an id.

**Conditional branches get different names** even though only one renders
(`job-detail-listing-tabbed` / `-untabbed`, `-public` on signed-out nav items). A failing
selector then says which branch it expected.

## 3. A shared component: `idPrefix` and an `ids` getter

```ts
/** Prefixes every id this renders; the page that places it sets it. */
@api idPrefix = 'job-listing';

/** Keyed in camelCase — see the trap below. The ids are kebab-case. */
get ids(): Record<string, string> {
    const p = this.idPrefix || 'job-listing';
    const names = ['root', 'col-main', 'title', 'title-edit-button' /* … */];
    return Object.fromEntries(
        names.map((n) => [n.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase()), `${p}-${n}`])
    );
}
```

```html
<h2 id={ids.title}>…</h2>
<lightning-button id={ids.titleEditButton} …></lightning-button>
```

Each page passes its own: `id-prefix="job-detail-listing"`, `id-prefix="create-job-step7-listing"`.
`ui/jobListingPreview` is the reference implementation.

> **The trap.** A template expression cannot contain a hyphen. `{ids.col-main}` parses as
> `ids.col - main` and fails to compile. Key the map in camelCase (`ids.colMain`); keep the id
> **values** kebab-case.

## 4. Inside a `for:each`, compose the id in the getter

Never write a static `id` inside a loop — it repeats once per row. Build it from the row's key in
the getter that shapes the list, and bind it:

```ts
return this.buildSections().map((s) => ({ ...s, id: `${p}-about-${s.key}` }));
```

```html
<div key={section.key} id={section.id}>
```

Small repeated items (chips, list rows) usually do not need one — the list does. Give rows ids only
when a script genuinely needs a single row.

## 5. Verify

1. **Compile.** Curl each changed module — `200` passes (`CLAUDE.md` § *Verifying*).
2. **No duplicates across the page.** Concatenate every template that renders on the route and look
   for repeats; expect no output:
   ```bash
   cat src/modules/example/<page>/<page>.html src/modules/ui/<each-child>/*.html \
     | grep -o 'id="[^"]*"' | sort | uniq -d
   ```
   Repeats inside mutually exclusive `lwc:if` / `lwc:else` branches are the one acceptable case —
   and §2 says to name those apart anyway.
3. **No static id in a loop:**
   ```bash
   grep -n 'for:each' -A8 <template>.html | grep 'id="'
   ```
4. `npm run build` exits 0.

Never use an id for styling or lookup — style with classes, find elements with `data-*`. An id is
identity only.
