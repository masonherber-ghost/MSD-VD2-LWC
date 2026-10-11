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

**Gutters come from the item's `padding` attribute, never from `slds-gutters`.**

`class="slds-gutters"` does **nothing** on a `lightning-layout`. Its rule is
`.slds-gutters .slds-col { padding-inline: … }`, and `lightning-layout-item` only puts `slds-col`
on its host when `flexibility="auto"` is set — by default the host carries size classes alone. So
the selector never matches: no gutter is produced, while the class's own
`margin-inline: -0.75rem` still drags the grid 12px outside its container and out of alignment with
the page header. It is worse than doing nothing.

Spacing comes from `padding` on each item, and **`pull-to-boundary` on the parent is not
optional** — that padding would otherwise push the outer edges inward and break the same alignment.
Match it to the padding: `padding="around-small"` → `pull-to-boundary="small"` (both resolve to
0.75rem, one positive, one negative).

| Layout | Item padding | Gives |
|---|---|---|
| Page region split, card grid | `padding="around-small"` | 24px between columns, vertical space when they stack |
| Field form inside a card | `padding="horizontal-small"` | 24px between columns, no extra vertical gap — the inputs already carry their own |

Both components set their classes on their own **host** element, which is in the parent's light
DOM — that is why the global SLDS stylesheet reaches them. The layout host gets `slds-grid`
(plus `slds-wrap`, the alignment and pull-padded classes); the item host gets its
`slds-size_*` classes and its padding class, and `slds-col` **only** when `flexibility="auto"` is
set. That last detail is what makes `slds-gutters` inert here.

---

## Content width

**Lightning Experience has no max width.** A record page is fluid — it fills the browser at any
size, and App Builder regions are proportional, not pixel-bound. The cap comes from Experience
Cloud: the Theme panel's maximum content width, which compiles to
`--dxp-s-section-columns-max-width` and its header and footer siblings, with the `-mobile` variants
set to `none`. Production LWR sites run 1440px or 1800px.

This project follows the Experience Cloud model — fluid on small screens, capped from the large
breakpoint up. Two custom properties in `site.css` are the only authority:

| Property | Holds |
|---|---|
| `--site-content-max-width` | The cap. `none` below the large breakpoint |
| `--site-content-gutter` | The horizontal page gutter |

Redefined at the SLDS breakpoints, and nowhere else:

| From | Cap | Gutter | Why |
|---|---|---|---|
| 0 | `none` | `--slds-g-spacing-4` (1rem) | Phones run fluid, as Experience Cloud's `-mobile: none` does |
| 48em / 768px | `none` | `--slds-g-spacing-5` (1.5rem) | Tablets still fluid, wider gutter |
| 64em / 1024px | `80rem` (1280px) | 1.5rem | `slds-container_x-large`, the widest cap SLDS ships |
| 100em / 1600px | `90rem` (1440px) | 1.5rem | The production LWR cap, with a real margin either side |

**Never hard-code a page width.** A screen needing a narrower measure uses an SLDS container class
(`slds-container_medium` and friends, 30/48/64/80rem) inside the content column — it does not
redefine these properties.

### Three bars, one column

`.site__main`, `.site-header__inner` and `.site-footer__inner` all take the same
`max-width` + `margin-inline: auto`, so the wordmark, the page and the release toggle share one
left edge at every width. Adding another docked or full-bleed bar means giving it the same pair.

Two details that are easy to get wrong:

- **Cap an inner row, never the bar itself.** `.slds-global-header` carries the header's background
  and shadow; capping it shrinks those too and the bar stops reaching the viewport edge. That is
  why `ui/siteHeader` has a `site-header__inner` wrapper inside it — the bar stays full-bleed, its
  contents do not.
- **`slds-global-header__item` already has 1rem of horizontal padding.** The header row makes up
  only the difference (`calc(var(--site-content-gutter) - var(--slds-g-spacing-4))`), or the
  wordmark sits 16px further in than the page below it.

---

## Spacing

**Never write a raw pixel or rem value for spacing.** Use the SLDS utility class; in custom CSS use
the styling hook.

| Need | Use |
|---|---|
| Space between stacked cards | `slds-m-bottom_small` or `slds-m-bottom_medium` — see *Stacked cards* |
| Page canvas margin | Nothing — `.site__main` already carries it, see *Content width* |
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

## Stacked cards

Cards stacked in a column carry `slds-m-bottom_small` (12px) or `slds-m-bottom_medium` (16px) on
each card **except the last**. Put the margin on the *preceding* card, not `slds-m-top_*` on the
one after — the rule reads as "a card leaves space beneath it", and it keeps the first card of a
conditionally-rendered stack from opening with a stray gap.

**The margin only works because `site.css` makes the host a block:**

```css
lightning-card { display: block; }
```

A custom element is `display:inline` unless told otherwise, and `lightning-card` sets no `:host`
display of its own. On an inline host a vertical margin is computed and then ignored, so stacked
cards sit flush against one another and the markup looks correct while the page does not. If a
future `lightning-*` component needs vertical margins, it needs the same treatment.

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

### Which tokens exist

Four sets. The first three are usable, in the order you should reach for them; the fourth is not.

| Set | Prefix | Count | Where it is documented |
|---|---|---|---|
| SLDS global tokens | `--slds-g-*` | 514 | The shipped stylesheet — grep it, see below |
| SLDS component hooks | `--slds-c-<component>-*` | 275 | The shipped stylesheet and the component's own CSS |
| **This project's tokens** | `--site-*` | 2 | **`src/assets/css/design-tokens.css`** — that file is the documentation |
| SLDS *private* hooks | `--_slds-*` | 102 | **Off limits.** The underscore is the contract |

**Browse them live: `/design-system` → Tokens.** Every family with its swatch, bar, type sample or
shadow, every token's *resolved* value read from the live stylesheet, a filter, the component hooks
grouped by component, and the private hooks named as off limits. It is generated by
`npm run tokens` from the installed package, so it cannot drift the way a written list would.

That page is the answer to "what can I change?". Reach for the shell only when you want a name in a
script or a diff:

```bash
C=node_modules/@salesforce-ux/design-system-2/dist/css/bundled/slds2.cosmos.css

grep -o -- "--slds-g-spacing-[a-z0-9-]*:[^;]*" $C | sort -u     # a global family, with values
grep -o -- "--slds-c-card-[a-z-]*"             $C | sort -u     # one component's hooks
grep -o -- "--_slds-c-globalheader-[a-z-]*"    $C | sort -u     # what is off limits, by name
```

Both generated lists live beside the catalog — see `rules-lwc-components.md` § *The catalog is the
source of truth*. Re-run `npm run catalog` **and** `npm run tokens` after upgrading either package.

### Defining a project token

`src/assets/css/design-tokens.css` is the **only** file that declares `--site-*` tokens, and
`main.njk` loads it before `site.css` so everything can consume them. Its header carries the rules;
the short version:

- Prefer an SLDS token. Define a `--site-*` one only where SLDS has no equivalent. A project token
  that duplicates `--slds-g-spacing-4` will drift from the design system unnoticed.
- Express its value in SLDS tokens where one fits, so a theme change still reaches it.
- A value used by exactly one component is **not a token** — it is a value, and belongs in that
  component's stylesheet.
- Overriding a shipped `--slds-c-*` hook is a component-level decision and lives with that
  component, not in the tokens file.
- Overriding a shipped `--slds-g-*` **global** token is the opposite: it has no component to live
  with, so it belongs in the tokens file, under its own commented block saying what it changes and
  why. The one we do today is `--slds-g-font-family-base` → Atkinson Hyperlegible Next. Such an
  override wins without `!important` or a specificity fight, because this file is unlayered and
  SLDS sets its defaults inside `@layer defaults` — unlayered always beats layered.

### Typeface

The site typeface is set by that one token. SLDS 2 ships a single family token: it is set on
`:where(html)`, `--slds-g-font-family` aliases it, one `html` rule consumes it, and everything else
inherits — through shadow roots, and into form controls via SLDS's own
`button, input, optgroup, select, textarea { font: inherit }` reset. So there is nothing to chase
component by component, and **no second place to set a font**. `--slds-g-font-family-monospace` is
separate and deliberately untouched.

There is no heading-family token, so headings and body share one face.

The `@font-face` declarations live in `src/assets/css/fonts.css`, loaded by `main.njk` before
`design-tokens.css`, with the woff2 files vendored in `src/assets/fonts/` — not installed, so the
static build carries them with no npm dependency.

**Their `url()`s must be absolute**, and so must every other `url()` we write. A relative one
passes both `npm run dev` and `npm run build` and then 404s in the built site. The rule and the
reason are in `rules-architecture.md` § *`url()` inside a stylesheet must be absolute*; read it
before touching this file.

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

## Restyling a shipped blueprint: `sep-` classes, never a bare override

A bare `.slds-page-header { border: none }` in `site.css` restyles **every** page header on the
site, including ones that wanted the Lightning default, and there is no way to opt out. So our
changes to a shipped SLDS blueprint go on an opt-in class of our own, prefixed **`sep-`**.

```html
<div class="slds-page-header sep-page-header slds-m-bottom_medium">
```

### The order to reach for things

1. **Set the component's own hook**, if it has one. This is not an override — SLDS's own rule reads
   `var()` on it, so you are using the published API. It cannot be broken by a specificity change
   and it survives an upgrade.
2. **Declare the property on the `sep-` class**, only where no hook exists.
3. **An SLDS utility in the markup**, for a one-off deviation on a single screen.

`.sep-page-header` is the worked example of all three:

```css
.sep-page-header {
    /* 1. Hooks — SLDS reads these itself. */
    --slds-s-pageheader-sizing-border: 0;
    --slds-s-pageheader-shadow: none;

    /* 2. Override — there is no page-header padding hook. SLDS reads the
       GLOBAL --slds-g-spacing-var-*-4, which is used far beyond this
       component, so redefining that is not an option. */
    padding: 0;
}
```

### Finding the hooks — the trap

Page-header hooks are `--slds-s-pageheader-*`: the **shared** tier, and **no hyphen in
"pageheader"**. Grepping for the obvious `--slds-c-page-header-*` returns nothing and makes it look
like the component has no hooks at all. It has nine. Search both tiers and both spellings:

```bash
C=node_modules/@salesforce-ux/design-system-2/dist/css/bundled/slds2.cosmos.css
grep -o -- "--slds-[sc]-pageheader-[a-z-]*" $C | sort -u
```

### Why the padding override needs no `!important`

SLDS declares `.slds-page-header` inside `@layer component`. This project's stylesheets are
unlayered, and **unlayered always beats layered**, whatever the specificity or the load order. It is
the same mechanism `design-tokens.css` relies on for `--slds-g-font-family-base`. Reaching for
`!important` here would be cargo cult.

### Identity versus placement

The `sep-` class carries what the element **is** — borderless, flush, our colours. Where it sits is
a property of the screen, so **spacing stays in the markup as a utility**: `slds-m-top_x-large`,
`slds-m-bottom_medium`. A margin baked into `.sep-page-header` makes every screen agree about its
own vertical rhythm, and they do not.

### Responsive spacing has to be CSS

**SLDS ships no responsive spacing utilities.** Its only responsive families are `size_*`,
`order_*` and `show_*` / `show-only_*` — 214 classes, not one of them a margin or a padding. There
is no `slds-large-m-top_x-large`, and no amount of looking will find one:

```bash
grep -o -- "\.slds-\(small\|medium\|large\)-[a-z-]*_[a-z0-9-]*" $C | sed 's/_[a-z0-9-]*$/_*/' | sort -u
```

So a margin that only applies from a breakpoint up cannot be a utility. Make it a **modifier on the
`sep-` class**, which keeps the markup deciding *whether* while CSS handles *how it responds*:

```css
/* class="slds-page-header sep-page-header sep-page-header_spaced" */
@media (min-width: 64em) {
    .sep-page-header_spaced { margin-block-start: var(--slds-g-spacing-6); }
}
```

Use it **instead of** the unconditional utility, never alongside: `slds-m-top_x-large` carries
`!important` and would win at every width.

Breakpoints are the SLDS ones (48em / 64em), the same ones the content cap steps at — see
*Content width*. Verified by measuring: 0px at 390/768/1023, 32px at 1024/1440.

### Verifying one of these

Strip the class at runtime and read the values back. If the shipped defaults return, the change is
genuinely scoped and the component underneath is intact:

```js
el.classList.remove('sep-page-header');   // → border 1px, shadow 0 2px 2px, padding 16px
```

---

## Every landmark element gets an `id`

A page is reviewed, annotated, automated against and handed over. All of that needs a **stable
handle that does not move when a class changes**, so every landmark element on a screen carries an
`id`. `example/profile` and `example/manageOrg` are the reference implementations.

### What gets one

| Gets an `id` | Does not |
|---|---|
| Page containers — `.site__body`, `.site__main` | Every `<p>`, `<span>` and wrapper `<div>` |
| Layout columns — each `lightning-layout-item` that is a region | Purely presentational nesting |
| Header blocks — the `slds-page-header` and its title, detail blocks, badges | Text inside a block that already has one |
| Cards — every `lightning-card` | |
| Buttons and links that do something | |
| Icons, avatars, spinners, badges | |
| Form fields — both the editable control and its read-only twin | |
| Tabs and tabsets | |
| State blocks — loading, signed-out, empty, error, confirmation | |

The test: **would you point at it in a review, or reach for it in a script?** If yes, it gets one.

### Naming

`{page}-{region}[-{element}]`, kebab-case, page prefix always:

```html
<main class="site__main" id="profile-main">
<lightning-layout-item id="profile-col-main" …>
<lightning-card id="profile-details-card" …>
<lightning-button id="profile-save-button" …>
<lightning-input id="org-field-company-name" …>
<div id="org-static-company-name" class="slds-form-element slds-form-element_readonly">
```

The page prefix (`profile-`, `org-`) is what keeps ids unique across a document and readable in a
diff. A field's editable control and its locked read-only twin are `-field-` and `-static-` on the
same name, because only one of them is ever in the DOM.

### Four things that bite

- **`id` is for identity, never for styling or lookup.** Style with classes; find elements inside a
  component with `data-*` and `querySelector`, which is what the existing screens do
  (`data-field` in `manageOrg`). An `id` in a stylesheet couples the handle to the appearance and
  one of them will move.
- **Never put a static `id` inside a `for:each`.** It renders once per row and duplicate ids are
  invalid. Rows are identified by `key` and `data-*`; if a row genuinely needs one, compose it from
  the record id in the getter that builds the list.
- **Conditional branches cannot collide**, so give each its own name anyway. `lwc:if` / `lwc:else`
  only ever render one, and naming them apart is what makes a failing selector readable.
- **An `id` on a `lightning-*` host is safe.** It lands on the host and does not disturb the
  component's internals — measured on `lightning-input`, whose inner `<label for>` still matches its
  own generated input id. Light DOM keeps the `id` literal: `document.getElementById()` finds
  exactly what the template wrote. (LWC scopes ids inside *shadow* components; our route components
  are light DOM, so they are left alone.)

---

## Known debt

The current screens predate this file and do not all follow it. When you next touch one of these,
bring it into line rather than matching the existing shape:

| Screen | Deviation |
|---|---|
| `example/jobDetail` (290 lines) | Still monolithic — highlights, path and three sidebar cards in one template. The Details region is now `ui/jobListingPreview`, shared with the create flow's last step |
| `example/manageOrg` (426 lines) | Monolithic — two full tabs in one template. Has GROWN since this row was written |
| `example/profile` (278 lines) | Monolithic. Has grown since this row was written |

This table is the backlog — keep it honest. Delete a row when it is fixed.
