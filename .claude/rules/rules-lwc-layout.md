# LWC layout — Lightning page anatomy, spacing, and composition

How a screen is assembled so it reads as production Salesforce and could be lifted into a real DX
project. This file wins over the others on **layout, spacing and component composition**.

Read `rules-lwc-components.md` first for *which* components to use.

---

## There is no FlexiPage

`lightning-base-components` ships no page-template component. In a real org the Lightning App
Builder template renders down to SLDS grid markup plus base components — so that is what we write
directly. It is not a workaround; it is the same composition.

## Page anatomy

### Record page

The canonical vertical order. `example/jobDetail` is the reference implementation.

| Region | Built from |
|---|---|
| Global header | `ui/siteHeader` (already built — do not re-create) |
| Breadcrumb | `lightning-breadcrumbs` + `lightning-breadcrumb` |
| Highlights panel | `slds-page-header` + `__row` / `__col-title` / `__col-actions` / `__row_gutters` / `__detail-block` |
| Record switcher | `slds-page-header__name-switcher` + `lightning-button-menu` |
| Path / process | `lightning-progress-indicator type="path"` + `lightning-progress-step` |
| Split body 2:1 | `lightning-layout` + `lightning-layout-item` |
| Main region | `lightning-tabset` — Details field form, Related datatable |
| Sidebar region | `lightning-card` — activity, contacts, context widgets |

### Object home / list page

`example/jobs` is the reference. `slds-page-header slds-page-header_object-home` (eyebrow, title,
item count, primary action) above either a `lightning-card` grid or a `lightning-datatable`.

Cards suit few records with status and counts worth visual weight; a datatable suits many rows,
dense scanning and sorting.

---

## The 2:1 split

```html
<lightning-layout multiple-rows pull-to-boundary="small">
  <lightning-layout-item size="12" medium-device-size="8" padding="around-small">
    <!-- main region -->
  </lightning-layout-item>
  <lightning-layout-item size="12" medium-device-size="4" padding="around-small">
    <!-- sidebar region -->
  </lightning-layout-item>
</lightning-layout>
```

`size="12"` with a `medium-device-size` or `large-device-size` override is what gives the authentic
behaviour: one stacked column on a phone, 2:1 from the breakpoint up.

**`pull-to-boundary` is not optional.** When layout items carry `padding`, that padding pushes the
outer edges inward and the grid stops aligning with the page header above it. `pull-to-boundary`
applies the compensating negative margin. Match it to the padding: `padding="around-small"` →
`pull-to-boundary="small"`.

Do **not** also add `slds-gutters` to a layout whose items already carry `padding` — that is the
same spacing applied twice.

`lightning-layout` and `lightning-layout-item` set their `slds-grid` / `slds-col slds-size_*`
classes on their own **host** element, which is in the parent's light DOM. That is why the global
SLDS stylesheet reaches them.

---

## Spacing

**Never write a raw pixel or rem value for spacing.** Use the SLDS utility class; in custom CSS use
the styling hook.

| Need | Use |
|---|---|
| Space between stacked cards | `slds-m-bottom_small` or `slds-m-bottom_medium` |
| Page canvas margin | Wrap the view in `slds-p-around_small` or `slds-p-around_medium` |
| Space inside a layout grid | `padding="around-small"` on the item + `pull-to-boundary="small"` on the parent |
| Spacing in custom CSS | `var(--slds-g-spacing-N)` |

The scale, as shipped:

| Token | Value | Utility suffix |
|---|---|---|
| `--slds-g-spacing-1` | 0.25rem | `xx-small` |
| `--slds-g-spacing-2` | 0.5rem | `x-small` |
| `--slds-g-spacing-3` | 0.75rem | `small` |
| `--slds-g-spacing-4` | 1rem | `medium` |
| `--slds-g-spacing-5` | 1.5rem | `large` |
| `--slds-g-spacing-6` | 2rem | `x-large` |

Utilities ship as `slds-{p,m}-{around,top,bottom,left,right,horizontal,vertical}_{size}`. Verify any
you are unsure of against the stylesheet — see `rules-lwc-components.md`.

## Styling hooks, not hex

Custom CSS references SLDS 2 tokens, never static colours:

```css
/* Yes */
background: var(--slds-g-color-surface-container-1);
color: var(--slds-g-color-on-surface-2);
padding: var(--slds-g-spacing-4);

/* No */
background: #f3f3f3;
padding: 24px;
```

A hex fallback is acceptable only where a token may legitimately be absent —
`var(--slds-g-color-surface-1, #fff)`.

---

## The modular component rule

**Do not build a page as one sprawling component.**

In production Salesforce an administrator assembles a page in Lightning App Builder from
self-contained widgets dropped into layout regions. A component that owns the whole page cannot be
placed in a region, so it cannot be handed over without a rewrite.

**Antipattern** — one `jobDetail.html` holding the highlights panel, path, tabs, field form and
every sidebar card in one 300-line file.

**Practice** — child components that each own one region:

```
ui/jobHighlights/        highlights panel for one vacancy
ui/jobDetailsForm/       the Details tab's field form
ui/applicantPipeline/    sidebar pipeline card
ui/activityTimeline/     sidebar activity card
example/jobDetail/       the page: fetches data, composes the children
```

The page component fetches and owns the data, then passes it down through `@api` properties. Each
child stays a widget a Salesforce developer could copy into a DX project and expose to App Builder
unchanged.

**Threshold:** if a page template passes ~150 lines, or a region inside it would read as a named
widget on its own, extract it. Extracting a region into `src/modules/ui/` is composition, not a new
custom control — it does **not** need the custom component gate.

---

## Known debt

The current screens predate this file and do not all follow it. When you next touch one of these,
bring it into line rather than matching the existing shape:

| Screen | Deviation |
|---|---|
| `example/jobDetail` (324 lines) | Monolithic — highlights, path, tabs and three sidebar cards in one template |
| `example/manageOrg` (273 lines) | Monolithic — two full tabs in one template |
| `example/profile` (192 lines) | Monolithic |
| All grid pages | Use `class="slds-gutters"` instead of `pull-to-boundary` on the parent layout |
| `src/assets/css/site.css` | `.site__main { padding: 1.5rem }` is a raw value; should be `var(--slds-g-spacing-5)` or an `slds-p-around_large` wrapper |

This table is the backlog — keep it honest. Delete a row when it is fixed.
