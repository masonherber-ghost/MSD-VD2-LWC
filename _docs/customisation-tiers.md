# Salesforce Customisation Tiers — Team Reference

How far a screen can be customised, what each level costs, and where it stops riding Salesforce's upgrades. The numbering is **our team's model** (Tier 1 → Tier 5, with 2A/2B and 3A/3B); everything under it is checked against **official Salesforce documentation** and quoted where it matters. The target runtime is an **Experience Cloud LWR site**. Counts are from the `assess-tiers` skill, run 2026-10-04 against this repo; the latest full assessment is `_docs/teirs-adherance.md`. Superseded drafts are in `_docs/archive/`.

---

## 1. The short answer

* **The gate is Salesforce's documented surface.** In Salesforce's words: *"Overriding base component styling isn't supported except when using documented styling hooks"* and *"Salesforce doesn't support styling based on rendered output."* Anything documented — an attribute, a variant, a slot, a utility class, a public hook, a preapproved part — is inside the gate. Anything that depends on what a component happens to render is outside it.

* **Why it matters.** Salesforce upgrades every org three times a year, automatically. It keeps the documented surface working; internals are not promised: *"We document changes to the features and behavior of components, but don't document changes to their internals."* A component's API version does not protect you: *"Regardless of apiVersion, custom components always use the latest version of … Lightning base components."*

* **Effort and the gate are independent.** Tier 4 is the most effort and can sit fully inside the gate. A single line of CSS can cross it. Tiers measure *effort and ownership*; the gate measures *what you depend on*.

* **Every tier below the gate is supported. They differ in who maintains it.** Tier 1 is maintained by Salesforce; every tier above it is maintained by us, a little more each step.

---

## 2. The tiers at a glance

| Tier | Salesforce term | What you touch | Effort | Who maintains it | Gate | Available | Built here |
|---|---|---|---|---|---|---|---|
| **1** Configure | Declarative / point-and-click — Experience Builder, Theme panel | Builder settings | No code | Salesforce | Inside | Theme panel: 6 heading + 2 paragraph text styles, colours, spacing | 20 `--dxp` hooks declared as a Theme-panel stand-in (no builder in the prototype) |
| **2A** Layout | Page templates; `lightning-layout` | Regions and grid | Configure / low code | Salesforce | Inside | 2 LWR site templates (Build Your Own, Microsite); 2 layout components | 25 routes |
| **2B** Structural composition | Composition | A wrapper of base components and blueprint markup | Low code | Us (light) | Inside — blueprints are **not auto-updated** | 84 base components · 89 blueprints, 37 with no component behind them | 38 base components used · 22 blueprints used · 7 wrappers, 9 pages at this tier |
| **2A/2B** Utility classes | Utility classes | `slds-*` classes in the markup — spacing, text, grid, sizing, visibility | Markup only | Salesforce (what the class does) | Inside | 821 classes in 11 families | 67 distinct, 805 uses, in 45 of 58 templates |
| **3A** Hook skinning | Styling hooks | `--dxp-*`, `--slds-g-*`, `--slds-c-*` | CSS only | Us (light) | Inside | 514 global hooks · 275 component hooks | 33 global hooks reassigned · 26 component hooks set · 0 wrappers stop here |
| **3B** Conformant CSS | Your own CSS classes; preapproved parts | Your own classes | CSS | Us | Inside — **parts on the line** | SLDS Linter rule set | 14 wrappers · 23 `sep-` classes · 16 `::part` selectors |
| | **THE GATE** | | | | | | |
| **4** Custom LWC engineering | Custom Lightning web components | State, events, data, behaviour | Code — advanced | Us (heavy) | **Inside if built from the public API** | — | 12 wrappers · 16 pages |
| **5** External embed | Canvas app · iframe · third-party script | A non-Salesforce app | Specialist | Us + the third party | Outside the design system | — | 0 |
| **—** Out of bounds | What the SLDS Linter flags | Internals | Often one line | Nobody — it breaks | **Outside** | 102 private hooks (+ every `--slds-s-*`) | 37 `--slds-s-*` touched — see the assessment |

Read *Built here* by the highest tier a component reaches: a wrapper with a stylesheet and no logic is 3B, one that fetches data is 4. A page is always 2A by nature; the count is the tier of its code.

---

## 3. Tier by tier

### Tier 1 — Configure

* **What it is:** an admin works in **Experience Builder**: drags standard and exposed components into page regions, and sets branding in the **Theme panel**. *"The Theme panel in Experience Builder provides several branding properties that let you declaratively control the color, image, text, and site spacing of your site."*
* **Constraints:**
  * Only what the builder exposes. A developer's component appears only if it is exposed: *"If isExposed is false, the component isn't exposed in the builders."* Each setting the admin sees is an `@api` property declared in the component's `js-meta.xml`.
  * Theme panel values are published as `--dxp` hooks: *"Each property in the Theme panel in Experience Builder maps to one or more --dxp styling hooks."* Text styles are Heading 1–6 and Paragraph 1–2.
* **Real example:** this prototype has no builder, so `src/assets/css/design-tokens.css` carries a labelled **Theme panel stand-in** — the six `--dxp-s-text-heading-*` levels mapped to our heading sizes. On lift the block is deleted and re-entered in the Theme panel.
* **Design consequence:** anything an admin should be able to change later without a developer must be designed as a Theme panel value or an exposed property from the start.

### Tier 2A — Layout

* **What it is:** arranging components into page regions — in the builder, a page template; in code, `lightning-layout` / `lightning-layout-item`.
* **Constraints:**
  * Experience Cloud LWR offers the **Build Your Own (LWR)** and **Microsite (LWR)** templates.
  * Breakpoints are the **viewport's**, not the container's (`medium-device-size`, `large-device-size`).
  * Gutters come from `padding` on each item paired with `pull-to-boundary` on the layout — `slds-gutters` does nothing on a `lightning-layout` (`rules-lwc-layout.md` § *The 2:1 split*).
  * No `lightning-*` component is a responsive table or a stacked list: a table on a phone needs a different layout (§ 6).
* **Real example:** `example/jobs` — one centred 10-of-12 column, full width below the large breakpoint.
* **Layout detail:** `_docs/layouts.md`.

### Tier 2B — Structural composition

* **What it is:** a wrapper component that combines base components and static SLDS blueprint markup into a reusable pattern. *"Composition enables you to build complex components from simpler building-block components."*
* **Constraints:**
  * **Every LWC has a JavaScript class**, so "no JavaScript" means *presentational only*: `@api` properties, getters that shape them, events re-dispatched. No fetching, no state, no listeners on the page.
  * **No stylesheet.** Spacing and type from SLDS utilities.
  * You cannot change what you compose: *"You can't extend the lightning namespace."*
  * **Blueprint markup has a cost:** *"If SLDS updates the related blueprint, your component code isn't updated automatically."* And: *"Before you create a component from a blueprint, make sure that there's no other way to meet your use case."*
* **Real example:** `ui/readOnlyNotice` — the scoped-notification blueprint plus `lightning-icon`, configured by one `@api message`:

```html
<ui-read-only-notice
    id="profile-readonly-notice"
    id-prefix="profile-readonly-notice"
    message="Your sign-in email, organisation and role cannot be changed here."
></ui-read-only-notice>
```

* **Built here:** 7 wrappers — `ui/readOnlyNotice`, `ui/vacancyEmptyState`, `ui/jobDetailsForm`, `ui/radioBoxGroup`, `ui/pagePlaceholder`, `ui/welcomeMat`, `ui/emailSecureInvite`.

### Tier 2 — Utility classes (with 2A and 2B)

* **What it is:** SLDS's single-purpose classes, written straight into the markup — `slds-m-bottom_medium`, `slds-text-heading_small`, `slds-grid slds-wrap`, `slds-show_medium`. No stylesheet, no logic: the class *is* the documented API, and Salesforce maintains what it does. Layout utilities (grid, sizing, visibility, alignment) belong with **2A**; spacing, text, borders and truncation with **2B**.
* **Where Salesforce puts them — before hooks:** *"If design variations and utility classes don't meet your requirements, use styling hooks."* The official order is **variant → utility class → styling hook → your own class**, so a utility is the first thing to try when an attribute or `variant` does not get there.
* **Constraints:**
  * **A class lands on the element you put it on, and nowhere else.** On a `lightning-*` host it styles the host, never the component's insides: `slds-p-vertical_none` on a `lightning-button` does not reach the `<button>` in its shadow root — that needs a hook.
  * **A margin on a custom element needs a block host.** Custom elements are `display: inline`; `lightning-card` has no host display of its own, so `site.css` makes it a block (`rules-lwc-layout.md` § *Stacked cards*).
  * **Gaps they leave.** No gap utility; no responsive spacing (no `slds-large-m-top_*`); responsive widths come only as fractions (`slds-medium-size_1-of-3`), not `auto`. Each of these forces 3B.
  * **Use the single-underscore names.** `slds-m-top_small`, not the deprecated `slds-m-top--small` — SLDS Linter `enforce-bem-usage`.
  * **Check a class ships before using it** — SLDS 2 dropped some SLDS 1 classes (`rules-lwc-components.md` § *SLDS classes — verify these too*).
* **Real example:** the empty state is utility classes and two base components, with no stylesheet (`src/modules/ui/vacancyEmptyState/vacancyEmptyState.html`):

```html
<div class="slds-box slds-theme_default slds-text-align_center">
    <lightning-icon icon-name="standard:job_profile" size="large"></lightning-icon>
    <h2 class="slds-m-top_small">You have no vacancies yet</h2>
    <p class="slds-text-body_regular slds-text-color_weak slds-m-top_x-small">…</p>
</div>
```

* **Available vs used, by family** (installed SLDS 2.264.2; usage in `src/modules/example` and `src/modules/ui`):

| Family | Example | Available | Used | Uses |
|---|---|---|---|---|
| Spacing | `slds-m-bottom_medium`, `slds-p-around_small` | 126 | 31 | 392 |
| Text | `slds-text-body_small`, `slds-text-color_weak` | 29 | 11 | 169 |
| Grid | `slds-grid`, `slds-wrap`, `slds-col` | 148 | 6 | 98 |
| Borders & theme | `slds-box`, `slds-theme_default`, `slds-border_bottom` | 20 | 7 | 93 |
| Truncation | `slds-truncate` | 12 | 2 | 25 |
| Position | `slds-is-relative` | 4 | 1 | 8 |
| Alignment | `slds-align-bottom`, `slds-text-align_center` | 9 | 3 | 5 |
| Sizing | `slds-size_1-of-1`, `slds-medium-size_1-of-3` | 449 | 2 | 4 |
| Visibility | `slds-show_medium`, `slds-hide_medium` | 18 | 2 | 4 |
| Assistive | `slds-assistive-text` | 2 | 1 | 4 |
| Scrolling | `slds-scrollable_y` | 4 | 1 | 3 |
| **Total** | | **821** | **67** | **805** |

Sizing and grid are barely used because `lightning-layout` / `lightning-layout-item` do that job through their own attributes — the component form of the same utilities.

### Tier 3A — Hook skinning

* **What it is:** setting the values a component already reads, so it restyles itself. Three kinds, from widest to narrowest:
  * `--dxp-*` — Experience Cloud branding, written by the Theme panel.
  * `--slds-g-*` (**global**) — *"Use global hooks to make a change across all the components you are using."*
  * `--slds-c-*` (**component**) — *"enable you to update properties in a specific component."*
* **Constraints:**
  * Set from tokens, never raw values.
  * `--slds-c-*` hooks are endorsed by Experience Cloud LWR (*"to fine-tune the appearance of individual components where necessary"*) but are **not yet supported in SLDS 2 inside Lightning Experience** — they matter if a component is ever reused in the internal org.
  * **Global hooks are the theme.** SLDS 2 is reported to reserve them for theming tools *(unconfirmed)*; in an Experience Cloud site, site-wide values belong in the Theme panel.
  * Not hooks: `--slds-s-*` and `--_slds-*` — see *Out of bounds*.
* **Real example:** the vacancy card's frame, set entirely through `lightning-card`'s public hooks (`src/modules/ui/vacancyCard/vacancyCard.css`):

```css
.vacancy-card {
    --slds-c-card-color-border: var(--site-text-accent-primary);
    --slds-c-card-sizing-border: calc(var(--slds-g-sizing-border-4) * 2)
        var(--slds-g-sizing-border-2) var(--slds-g-sizing-border-2) var(--slds-g-sizing-border-2);
    --slds-c-card-radius-border: var(--slds-g-radius-border-3);
}
```

* **Built here:** no wrapper stops at 3A — every styled wrapper also sets at least one real property.

### Tier 3B — Conformant CSS

* **What it is:** CSS on classes you own, when hooks run out. Salesforce: *"create your own custom CSS classes instead of overriding SLDS classes."* In this project the opt-in classes are prefixed `sep-`.
* **Constraints:**
  * Never select an SLDS class or a component's internals. The order to reach for things: the component's own hook → a property on your own class → an SLDS utility.
  * **Parts are on the line.** Experience Cloud allows CSS on *preapproved* parts (`part="dxp-…"`) with a warning: *"Use custom CSS sparingly and avoid targeting DOM elements without a part attribute … Salesforce Customer Support can't help resolve any issues with custom CSS."* A base component's own `::part()` names are documented for LWR, not confirmed as preapproved on an Experience Cloud site.
  * Responsive rules belong here when SLDS has no utility for them — on your own class, at SLDS breakpoints.
  * **Not enforced by Lightning Web Security.** LWS is a JavaScript sandbox; CSS stays scoped because of shadow DOM.
* **Real example:** the listing chip, 100% public badge hooks on a class we own (`src/assets/css/site.css`):

```css
.sep-listing-chip {
    --slds-c-badge-color-background: var(--slds-g-color-accent-container-1);
    --slds-c-badge-text-color: var(--slds-g-color-on-accent-1);
    --slds-c-badge-radius-border: var(--site-radius-pill);
}
```

* **Built here:** 14 wrappers — `ui/vacancyCard`, `ui/jobManageHeader`, `ui/jobFilterBar`, `ui/siteNav`, `ui/accountTabs` and others; 23 `sep-` classes; 16 `::part` selectors.

---

### THE GATE

Everything above relies on what Salesforce has documented. Tier 4 can stay above it — but only if it is built from the same documented parts.

---

### Tier 4 — Custom LWC engineering

* **What it is:** a component that owns behaviour — state, events, data, lifecycle, browser APIs.
* **Constraints:**
  * **Inside the gate if built from the public API** — base components, documented attributes, public hooks. A new component that does that is supported; it is just ours to maintain.
  * **The custom-component gate applies:** building a control the library does not ship is the user's decision, asked for first (`rules-lwc-components.md`). Rebuilding one it *does* ship is out of bounds.
  * An **interactive blueprint** belongs here: the blueprint gives *"HTML and CSS … but doesn't provide logic"* — you write the state, keyboard and accessibility.
* **Real examples:** `ui/jobListingPreview` (copies the job ID to the clipboard, confirms with a toast); every data page (`example/jobs`, `example/jobDetail`).
* **Built here:** 12 wrappers, 16 pages.

### Tier 5 — External embed

* **What it is:** running a non-Salesforce application inside the site.
* **Official terms:**
  * **Canvas app** — *"Canvas allows you to embed an existing web application"* in Salesforce; the documented route for whole external apps.
  * **iframe** — external targets must be added as trusted (CSP) URLs.
  * **Third-party script in an Experience Cloud LWR site** — `<x-oasis-script>`: *"Scripts loaded within this custom tag run inside a special iframe that's exempt from shadow DOM."*
* **Constraints:** it bypasses the design system, the tokens and the accessibility of the components. For pages with sensitive data, Salesforce recommends *"only standard components built by Salesforce or components that you built, customized, or vetted."*
* **Built here:** none.

### Out of bounds — not a tier

The official list is the **SLDS Linter**:

| Rule | Says |
|---|---|
| `no-slds-class-overrides` | *"Create new custom CSS classes instead of overriding SLDS selectors."* |
| `no-slds-private-var` | *"Private SLDS styling hooks have prefixes --_slds- and --slds-s-."* |
| `no-hardcoded-values-slds2` | *"Replace static values with SLDS 2 styling hooks."* |
| `no-unsupported-hooks-slds2` | *"Replace deprecated --slds styling hooks."* |
| `no-deprecated-classes-slds2` | *"Replace classes that aren't available with SLDS 2 classes."* |
| `lwc-token-to-slds-hook` | *"Replace the deprecated --lwc tokens with the latest --slds tokens."* |

And beyond CSS: styling or scripting against a component's rendered output; attributes *"Reserved for internal use"* or undocumented; rebuilding a shipped control; removing SLDS (*"Don't remove SLDS if you plan to use flexible layouts or any of the Lightning base components"*).

---

## 5. The research's open questions — proposed answers

* **Basic / Expected / Exceptional** *(proposal for the team to ratify)*:
  * **Basic** — Tiers 1, 2A, 2B. Every delivery; no approval.
  * **Expected** — Tiers 3A, 3B. Within budget; reviewed against the SLDS Linter rules.
  * **Exceptional** — Tier 4 (new behaviour) with the custom-component gate's approval; Tier 5 only with architecture sign-off.
  * **Never** — out of bounds, at any tier.
* **Does it depend on the surface?** The *gate* does not — it is the same everywhere. The *budget* can: a public portal will reasonably spend more at 3A/3B than an internal record page.
* **Responsiveness:**
  * Fluid layout with `lightning-layout` breakpoints → **2A**.
  * Showing or hiding regions with SLDS visibility utilities (`slds-show_medium`, `slds-hide_medium`) → **2A/2B**.
  * A responsive rule on your own class where SLDS has no utility → **3B**.
  * A form-factor-specific component (`@salesforce/client/formFactor`) or a different rendering per device → **4**.
* **Naming Tier 5:** *External embed*, and name the mechanism — Canvas app, iframe, or `<x-oasis-script>`. Permitted only where no Salesforce-native option exists, and never on pages with sensitive data without a security review.

---

## 6. Two gates — don't confuse them

* **The upgrade gate** (this document): does it rely only on what Salesforce documents?
* **The custom-component gate** (`rules-lwc-components.md`): building a control the library does not ship is decided by the user, not the developer.

Passing one does not pass the other. An approved new component is still built only from documented parts.

---

## 7. Where to check

* **`/design-system`** (`npm run dev`) — Components (84), Blueprints (the 37 nothing renders), Compositions (our wrappers and their CSS), Tokens and Component hooks (with the private ones named).
* **The assessment** — `assess-tiers` skill; latest report `_docs/teirs-adherance.md`.
* **The rules** — `.claude/rules/rules-lwc-components.md` (what exists), `rules-lwc-layout.md` (spacing, `sep-` classes, hooks, ids).

---

## 8. Sources

* LWC guide — CSS anti-patterns: https://developer.salesforce.com/docs/platform/lwc/guide/create-components-css-antipatterns.html
* LWC guide — styling with SLDS: https://developer.salesforce.com/docs/platform/lwc/guide/create-components-css-slds.html
* LWC guide — styling hooks: https://developer.salesforce.com/docs/platform/lwc/guide/create-components-css-custom-properties.html
* LWC guide — create a component from a blueprint: https://developer.salesforce.com/docs/platform/lwc/guide/create-components-css-slds-blueprint.html
* LWC guide — composition: https://developer.salesforce.com/docs/platform/lwc/guide/create-components-compose-intro.html
* LWC guide — versioning: https://developer.salesforce.com/docs/platform/lwc/guide/create-version-components.html
* LWC guide — configuration tags (`isExposed`): https://developer.salesforce.com/docs/platform/lwc/guide/reference-configuration-tags.html
* Experience Cloud LWR Sites guide (PDF) — Theme panel, `--dxp` hooks, parts, custom CSS warning, `<x-oasis-script>`, Remove SLDS, templates: https://resources.docs.salesforce.com/latest/latest/en-us/sfdc/pdf/exp_cloud_lwr.pdf
* `--dxp` styling hooks: https://developer.salesforce.com/docs/atlas.en-us.exp_cloud_lwr.meta/exp_cloud_lwr/brand_hooks.htm
* SLDS Linter rule descriptions: https://github.com/salesforce-ux/slds-linter/blob/main/packages/eslint-plugin-slds/src/config/rule-messages.yml
* Lightning Web Security FAQ: https://help.salesforce.com/s/articleView?id=000392327&language=en_US&type=1
* DOM access containment (LWS and shadow DOM): https://developer.salesforce.com/docs/platform/lightning-components-security/guide/locker-dom.html
* Trailhead — Develop Without Code: https://trailhead.salesforce.com/content/learn/modules/platform-development-basics/develop-without-code-01

developer.salesforce.com refuses automated reads; quotes from it were taken from archived copies (April–July 2026). Re-check wording before quoting externally.
