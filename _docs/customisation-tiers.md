# Salesforce Customisation Tiers & The Upgrade Gate

How far a screen can be customised before it stops getting Salesforce's upgrades for free, explained for a designer who writes HTML and CSS. The target is an **Experience Cloud LWR site**, which is what this employer portal would become. Salesforce doesn't publish numbered tiers. It publishes **ladders**: ordered lists of "try this first, then this". The tiers below are those ladders laid end to end, using Salesforce's own words wherever it has them. Where a term is ours rather than Salesforce's, it is marked **[ours]**. Every quote links to its source in §9.

---

## 1. The short answer

* **The gate is Salesforce's documented surface.** In Salesforce's words: *"Overriding base component styling isn't supported except when using documented styling hooks"* and *"Salesforce doesn't support styling based on rendered output."* Anything Salesforce has documented (an attribute, a variant, a utility class, a styling hook, a part) is inside the gate. Anything that depends on what a component happens to render (its inner HTML, its internal classes, its private variables) is outside.

* **Why it matters for upgrades:** Salesforce ships three releases a year and upgrades every org automatically. The documented surface is what Salesforce keeps working across those releases. Internals are not: *"Salesforce needs the flexibility to redesign the internals of our components… If you create styling based on such an assumption, the styling can break in the future. We document changes to the features and behavior of components, but don't document changes to their internals."* A component's API version doesn't protect you either: *"Regardless of apiVersion, custom components always use the latest version of… Lightning base components."*

* **Effort and the gate are independent.** A large, hand-coded component can sit fully inside the gate. A single line of CSS can cross it. "Simple" doesn't mean safe, and "advanced" doesn't mean unsupported.

* **The test for any line of CSS [ours]:**
  1. Am I setting something Salesforce has *documented*, or reaching for something it hasn't?
  2. Is my rule on a class of our own, or does it hit an SLDS class everywhere it appears?
  3. If Salesforce rewrote this component's insides tomorrow, would my rule still mean the same thing?

* **Two corrections to common assumptions:**
  * **LWC is not the no-code layer.** Lightning Web Components is the *programming model* components are written in. The no-code layer is the **builder**: Experience Builder for sites, Lightning App Builder for internal pages. Trailhead calls these *"point-and-click"* and *"low-code"* tools. In the builder, an admin drags in components that a developer has already built and fills in the settings that developer chose to expose.
  * **"Composition" is an official term**, though "compositions tab" is ours. *"Composition enables you to build complex components from simpler building-block components."*

---

## 2. What's official and what's ours

| Term | Status | Source |
|---|---|---|
| Declarative / point-and-click / low-code | **Salesforce** | Trailhead, *Develop Without Code* |
| Experience Builder, Theme panel | **Salesforce** | Experience Cloud LWR guide |
| Lightning base components | **Salesforce** | LWC guide, *Base Components* |
| Design variation (`variant`) | **Salesforce** | LWC guide, *SLDS* |
| SLDS blueprint | **Salesforce** | LWC guide, *Create a Component from a Blueprint* |
| Composition | **Salesforce** | LWC guide, *Compose Components* |
| Global styling hooks `--slds-g-*`, component styling hooks `--slds-c-*`, `--dxp` styling hooks | **Salesforce** | LWC guide; Experience Cloud LWR guide |
| Private hooks `--_slds-*` **and `--slds-s-*`** | **Salesforce** | SLDS Linter, `no-slds-private-var` |
| Preapproved parts | **Salesforce** | Experience Cloud LWR guide |
| Tier numbers 0–7, "the gate", the effort scale | **ours** | This doc |
| `sep-` class prefix, `--site-*` tokens | **ours** | This project's conventions |
| "Shared hooks" as a public tier | **ours, and wrong**. See §7 | `rules-lwc-layout.md` |

---

## 3. Words you'll meet

* **Component:** A custom HTML tag with its own template, logic and styles, such as `<lightning-button>`. You use it like an element and set attributes on it.

* **Base component:** A component Salesforce ships and maintains in the `lightning` namespace. *"Lightning base components are the building blocks that make up Lightning Experience, the Salesforce mobile app, and Experience Builder sites."* This project has 84 of them.

* **Shadow DOM:** A sealed box around a component's insides that your stylesheet can't reach into. Base components are built this way on purpose. Hooks and parts are the openings Salesforce deliberately cut in the box.

* **Styling hook:** A CSS custom property (a `--variable`) that Salesforce's own CSS reads. When you set it, the component restyles itself. You aren't overriding its CSS. You're passing a value into it, the way you pass a value into a function. This is the answer to *"what is a hook?"* in `to-do.md`. There are four kinds:
  * `--dxp-*`: site-wide branding for Experience Cloud. *"Each property in the Theme panel in Experience Builder maps to one or more --dxp styling hooks."*
  * `--slds-g-*` (**global**): *"Use global hooks to make a change across all the components you are using."*
  * `--slds-c-*` (**component**): *"enable you to update properties in a specific component."*
  * `--_slds-*` and `--slds-s-*` (**private**): *"reserved only for internal Salesforce use."* Not for us.

* **Token:** A named design value, such as a colour or a spacing step. In SLDS 2 the tokens *are* the global hooks. *"Design tokens are not supported in SLDS 2 themes"*, which means the old token system is gone and the hooks replaced it.

* **Blueprint:** *"Framework-agnostic, accessible HTML and CSS that defines how a component looks and its user interaction, but doesn't provide logic."* It's a recipe of HTML with SLDS classes. You write the markup, and if it does anything interactive, you write that behaviour too.

* **Part:** A named element inside a component that the component's author has marked as styleable from outside. Experience Cloud exposes them in the format `part="dxp-[component]-[part]"`.

---

## 4. The tiers

| Tier | Salesforce term | You touch | Effort [ours] | Gate |
|---|---|---|---|---|
| **0** | Declarative: Experience Builder and its Theme panel | Builder settings | Configure, no code | Inside |
| **1** | Lightning base components, with design variations | HTML: tags and attributes | Simple coding | Inside |
| **2** | SLDS blueprint | HTML and SLDS classes, plus JS if interactive | Simple to moderate coding | Inside, but **not auto-updated** |
| **3** | Composition | HTML, JS, a little CSS | Moderate to advanced coding | Inside |
| **4** | `--dxp` and global styling hooks | Site-wide CSS variables | CSS only | Inside |
| **5** | Component styling hooks and your own CSS classes | CSS on classes you own | CSS only | Inside |
| **5b** | Custom CSS on preapproved parts | CSS on documented parts | CSS only | **On the line** |
| | **THE GATE** | | | |
| **6** | Unsupported CSS: what the SLDS Linter flags | | Often one line | Outside |
| **7** | Unsupported customisation: relying on internals, rebuilding what ships | | Often the most | Outside |
| | *Remove SLDS*: an official option that leaves the system | | Most | Off the path by design |

### Tier 0 — Configure in the builder

* **What it is:** An admin uses Experience Builder to drop components into page regions and fill in their settings. The **Theme panel** sets site-wide branding: *"several branding properties that let you declaratively control the color, image, text, and site spacing of your site."* For example, its **Base Font Family** property sets the site typeface.
* **Effort:** No code. But a developer's component only appears in the builder if the developer exposes it. *"If isExposed is false, the component isn't exposed in the builders."* Each setting the admin sees is an `@api` property the developer chose to expose.
* **Example:** This prototype has no builder, so this example is **illustrative, not from the repo**. It shows the metadata file that would make our `ui/readOnlyNotice` draggable, with its message editable as a text field:

```xml
<!-- readOnlyNotice.js-meta.xml — illustrative -->
<LightningComponentBundle xmlns="http://soap.sforce.com/2006/04/metadata">
    <apiVersion>62.0</apiVersion>
    <isExposed>true</isExposed>
    <masterLabel>Read-only notice</masterLabel>
    <targets>
        <target>lightningCommunity__Page</target>
        <target>lightningCommunity__Default</target>
    </targets>
    <targetConfigs>
        <targetConfig targets="lightningCommunity__Default">
            <property name="message" type="String" label="Message" />
        </targetConfig>
    </targetConfigs>
</LightningComponentBundle>
```

* **Design consequence:** Anything you want an admin to change later without a developer has to be designed as an exposed property from the start.

### Tier 1 — Use a base component

* **What it is:** You write the tag and set its documented attributes. `variant` is Salesforce's *design variation*, the first thing to reach for before any styling.
* **Effort:** Simple coding. A designer who writes HTML can do this.
* **Example:** `src/modules/example/jobDetail/jobDetail.html:41-57`. A record switcher with every behaviour (opening, keyboard, focus, positioning) provided by Salesforce:

```html
<lightning-button-menu
    icon-name="utility:down"
    icon-size="x-small"
    variant="bare"
    alternative-text="Switch vacancy"
    menu-alignment="left"
    onselect={handleRecordSwitch}
>
    <template for:each={recordOptions} for:item="option">
        <lightning-menu-item key={option.value} value={option.value}
            label={option.label} checked={option.checked}></lightning-menu-item>
    </template>
</lightning-button-menu>
```

* **What you get:** Salesforce upgrades this automatically, and no one maintains it on our side.

### Tier 2 — Write a blueprint

* **What it is:** Salesforce's HTML-and-class recipe for something no base component renders. 37 of SLDS's 89 blueprints have no component behind them, the page header among them.
* **Salesforce's two warnings:** *"Before you create a component from a blueprint, make sure that there's no other way to meet your use case."* And the cost, which is the important part: *"If SLDS updates the related blueprint, your component code isn't updated automatically… Salesforce automatically updates the base components when SLDS updates the associated blueprint."* A blueprint is supported, but its upkeep is yours.
* **Effort:** Simple coding for a static blueprint. Moderate coding for an interactive one, because the blueprint *"doesn't provide logic"*: you supply the state, the events and the accessibility.
* **Static example:** `src/modules/example/jobs/jobs.html:20-30`, the page header:

```html
<div class="slds-page-header sep-page-header sep-page-header_spaced slds-m-bottom_medium">
    <div class="slds-page-header__row">
        <div class="slds-page-header__col-title">
            <div class="slds-page-header__name">
                <div class="slds-page-header__name-title">
                    <h1 class="slds-page-header__title slds-truncate">My jobs</h1>
                </div>
            </div>
            <p class="slds-page-header__name-meta">{itemCount}</p>
        </div>
```

* **Interactive example:** `src/modules/ui/accountTabs/accountTabs.ts:3-32`. The tabs blueprint, where the JS decides which tab carries `slds-is-active` and which link gets `aria-current`. None of that comes with the blueprint:

```ts
const ITEM = 'slds-tabs_default__item';
const ACTIVE = `${ITEM} slds-is-active`;

@api current: 'profile' | 'manage-org' = 'profile';

get profileItemClass(): string {
    return this.isProfile ? ACTIVE : ITEM;
}
```

### Tier 3 — Compose a component

* **What it is:** A component of our own built out of base components and blueprints, and reused as one unit. *"It's useful to compose apps and components with a set of smaller components to make the code more reusable and maintainable."* What you can't do is modify the originals: *"You can't extend the lightning namespace."* So you build *around* base components, never *into* them.
* **Effort:** Moderate to advanced coding: JS, `@api` properties, events. But often little or no CSS. 10 of this project's 32 compositions have no stylesheet at all.
* **Example:** `ui/readOnlyNotice` is a blueprint (scoped notification) plus a base component (`lightning-icon`), with one setting. A page uses it like this (`src/modules/example/profile/profile.html:75-78`):

```html
<ui-read-only-notice
    id="profile-readonly-notice"
    message="Your sign-in email, organisation and role cannot be changed here."
></ui-read-only-notice>
```

* **Where they're listed:** `/design-system` → **Compositions** lists all 32, ordered by how much CSS each one needed. That ordering roughly shows how hard each one pushed against the system.

### Tier 4 — Skin with tokens

* **What it is:** Changing a design value once, site-wide, so every component that reads it follows. In a real Experience Cloud site this is the Theme panel (tier 0), which writes the `--dxp` hooks for you. Below that sit the global `--slds-g-*` hooks.
* **Effort:** CSS only, with no selectors to get wrong.
* **Example:** `src/assets/css/design-tokens.css:61-67`. One declaration retypes the whole site, including inside every component's shadow box, because the font is inherited rather than set per component:

```css
:root {
    --slds-g-font-family-base:
        'Atkinson Hyperlegible Next Variable',
        system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
        'Helvetica Neue', Arial, sans-serif;
}
```

* **In a real site:** This line becomes the Theme panel's *Base Font Family* setting. The prototype sets it in CSS only because it has no Theme panel.

### Tier 5 — Style with component hooks and your own classes

* **What it is:** Changing *one* component, or one *use* of a component, rather than the whole site. Salesforce gives the order: design variation first, then utility classes, then *"If design variations and utility classes don't meet your requirements, use styling hooks."* And for anything else: *"create your own custom CSS classes instead of overriding SLDS classes."* In this project, "your own classes" are the opt-in `sep-` classes **[ours]**.
* **Effort:** CSS only.
* **Example:** `src/assets/css/site.css:628-633` with its markup. A solid-blue chip, which none of the badge's variants provide, made entirely from documented badge hooks on a class we own:

```css
.sep-listing-chip {
    --slds-c-badge-color-background: var(--slds-g-color-accent-container-1);
    --slds-c-badge-color-border: var(--slds-g-color-accent-container-1);
    --slds-c-badge-text-color: var(--slds-g-color-on-accent-1);
    --slds-c-badge-radius-border: var(--site-radius-pill);
}
```

```html
<lightning-badge label={chip.label} class="sep-listing-chip"></lightning-badge>
```

* **Why it's safe:** No selector reaches into the badge. It only hands values to hooks the badge already reads. Other badges are untouched because nothing applies site-wide.

### Tier 5b — CSS on preapproved parts (on the line)

* **What it is:** When hooks run out, Experience Cloud allows CSS aimed at the specific elements a component has marked as parts. *"Occasionally, styling hooks are insufficient… you can use CSS selectors to target and style preapproved 'parts' within a component."*
* **Why it's on the line:** It's supported, but with a warning attached: *"Use custom CSS sparingly and avoid targeting DOM elements without a part attribute. Doing so is brittle… Additionally, Salesforce Customer Support can't help resolve any issues with custom CSS."*
* **Salesforce's example** (Experience Cloud LWR guide), for a part a component exposes:

```css
[part="some-partner-hero-primary-button"] {
    --dxp-g-brand: red;
    --dxp-g-brand-contrast: white;
}
```

* **This repo's nearest case:** `src/assets/css/site.css:237-243`, a hover gradient no hook can express. See §7 for whether this particular form counts as preapproved.

```css
lightning-button[variant='brand']::part(button):hover {
    background-image: linear-gradient(to bottom,
        var(--site-color-brand-blue), var(--site-color-brand-navy));
}
```

---

### THE GATE

Everything above relies on what Salesforce has documented. Everything below relies on what a component happens to render today.

---

### Tier 6 — Unsupported CSS

* **What it is:** Salesforce's own **SLDS Linter** is the official definition. These are its CSS and HTML rules, in Salesforce's words:

| Rule | Says |
|---|---|
| `no-slds-class-overrides` | *"Create new custom CSS classes instead of overriding SLDS selectors."* |
| `no-slds-private-var` | *"Private SLDS styling hooks have prefixes --_slds- and --slds-s-."* |
| `no-hardcoded-values-slds2` | *"Replace static values with SLDS 2 styling hooks."* |
| `no-unsupported-hooks-slds2` | *"Replace deprecated --slds styling hooks."* |
| `no-deprecated-classes-slds2` | *"Replace classes that aren't available with SLDS 2 classes."* |
| `no-slds-var-without-fallback` | *"Add fallback values to SLDS styling hooks."* |
| `no-slds-namespace-for-custom-hooks` | *"create custom styling hooks in your namespace."* |
| `enforce-bem-usage` | *"Replace BEM double-dash syntax in class names with single underscore syntax"* |

* **Effort:** Often a single line, which is why this tier is the easiest to slip into.
* **Example:** This looks harmless, and it restyles every page header on the site with no way to opt out. If Salesforce changes how the header draws its border, the line silently stops working or starts fighting the new styles:

```css
/* No. This overrides an SLDS class directly. */
.slds-page-header { border: none; }

/* Yes (tier 5): the header's own hook, on a class we own. */
.sep-page-header { --slds-s-pageheader-sizing-border: 0; }
```

  That "yes" uses an `--slds-s-*` hook, which the Linter now calls private. So even this project's own correct example is off-limits by the official rules. See §7.

* **Salesforce's own example:** *"don't target .slds-input because it's part of the base component internal markup."*

### Tier 7 — Unsupported customisation

* **What it is:** Relying on a component's insides rather than its documented surface, or rebuilding something Salesforce already ships.
  * **Styling or scripting by rendered output:** depending on a base component's inner classes or HTML structure.
  * **Undocumented attributes:** *"If an attribute is marked 'Reserved for internal use', don't use the attribute."* The same goes for any attribute the component doesn't document.
  * **Rebuilding a shipped control:** a hand-made dropdown, modal, tab strip, toggle or pill, when a base component does it. That ignores Salesforce's *"make sure there's no other way."*
* **Effort:** Usually the most effort of any tier. You end up owning the behaviour, the accessibility and every release's breakage.
* **Example (refused):** `src/assets/css/site.css:196-202`. The button menu in a button group sat a few pixels short. There's a documented hook for exactly that height, but it only applies when the component has a `size` attribute, which `lightning-button-menu` doesn't document. Setting it anyway would have worked today:

```css
 *   --slds-c-buttonicon-sizing-height  is the public hook for exactly this, but
 *                                  its rule is gated behind `[size='medium']`,
 *                                  and `size` is NOT a public property of
 *                                  lightning-button-menu … Setting it would be
 *                                  reaching into internals through an
 *                                  undeclared attribute.
```

  The repo took a different route: a global hook, scoped to that one spot.

* **Example (reverted):** `ui/optionCards` hand-built the visual-picker blueprint *"plus 130 lines of CSS to re-create selection states, which IS reproducing a control."* It was replaced by `ui/radioBoxGroup`, which composes a shipped radio group and has no stylesheet.

### Off the path — Remove SLDS

* Salesforce documents removing SLDS from a site entirely, and warns in the same breath: *"Don't remove SLDS if you plan to use flexible layouts or any of the Lightning base components, as they rely heavily on the design system."* It's official, but it gives up everything above tier 4 and leaves the upgrade path on purpose. Not an option for this portal.

---

## 5. Effort against the gate

The gate is about *what you depend on*, not *how much you wrote*. Every effort level has a safe version and an unsafe one.

| Effort [ours] | Inside the gate | Outside the gate |
|---|---|---|
| **Configure** | Setting the brand colour in the Theme panel | Pasting CSS into the site's head markup that targets `.slds-*` classes |
| **Simple coding** | `<lightning-badge>` with attributes | `.slds-page-header { border: none; }` |
| **Moderate coding** | The tabs blueprint with JS for active state (`ui/accountTabs`) | Styling a combobox by its internal `.slds-combobox__input` class, Salesforce's own cautionary example |
| **Advanced coding** | A new composition from base components, asked for first (`ui/jobListingPreview`) | A hand-built picker re-creating selection states (`ui/optionCards`, since removed) |
| **CSS only** | `--slds-c-badge-*` hooks on a `sep-` class | Setting a private `--_slds-*` hook |

---

## 6. Two gates — don't confuse them

* **The upgrade gate (this doc):** Does this change rely only on what Salesforce has documented? It decides whether Salesforce's releases reach the screen without anyone fixing it.

* **The custom component gate** (`.claude/rules/rules-lwc-components.md`): This project's rule that *building a component the library doesn't have is the user's decision, not the developer's*. It's a "stop and ask" checkpoint, not a support boundary.

* **How they relate:** They're independent. Passing the ask doesn't license crossing the upgrade gate. A new component, once agreed, is still built only from tiers 1–5.

---

## 7. Where this prototype sits past the official line

Measured on 2026-10-03. The good news first: zero `!important`, zero `--_slds-*` private hooks, and zero bare `.slds-*` class overrides anywhere in the project's CSS. But checking against the official rules turned up four things the project's own rules got wrong or didn't know:

* **`--slds-s-*` hooks are private, and we use about 40 of them.** These cover buttons, inputs, page header, links and labels. The project's rules describe them as public "shared" hooks (for example `design-tokens.css:158`, *"a public shared hook"*). The SLDS Linter says otherwise: *"Private SLDS styling hooks have prefixes --_slds- and --slds-s-."* This is the biggest risk to lifting these components into a real site. Even the repo's "refused, took the public route" example (`site.css:222-228`) computes its value from `--slds-s-button-*` hooks.

* **`::part()` is not clearly preapproved.** There are 15 `::part()` selectors across 6 files. The Experience Cloud guide's preapproved parts are elements with a `part="dxp-…"` attribute, selected as `[part="…"]`. The LWC guide says *"No support for the ::part pseudo-element"*, and only the LWR-on-Node guide documents `lightning-button::part(button)`. Treat each of these selectors as something to re-check every release, until Salesforce confirms that a base component's parts count as preapproved on an Experience Cloud site *(unconfirmed)*.

* **The font override belongs in the Theme panel.** It sets `--slds-g-font-family-base` directly because the prototype has no builder. In a real site it would be the Base Font Family property. The SLDS 2 site is reported to reserve global-hook values for theming tools *(unconfirmed; the page couldn't be read)*.

* **`--slds-c-*` component hooks are fine here, with one caveat.** The Experience Cloud guide endorses them *"to fine-tune the appearance of individual components."* But the LWC guide says SLDS 2 doesn't yet support them inside Lightning Experience. That only matters if a component is ever reused in the internal org.

* **A stale number:** `rules-lwc-layout.md:203` says the project has 2 `--site-*` tokens. It has 107.

None of this has been changed. Correcting the rules files and replacing the `--slds-s-*` usage is follow-up work.

---

## 8. Where to check

* **`/design-system`** (under `npm run dev`):
  * **Components:** the 84 base components, live.
  * **Blueprints:** the 37 with no component behind them, and their hooks.
  * **Compositions:** our 32 wrappers, ordered by how much CSS each needed.
  * **Tokens / Component hooks:** every hook with its value. **Private hooks are listed by name so you can avoid them.** Under the Linter's definition, that list should include every `--slds-s-*`, which it currently doesn't.

* **Before using an SLDS class:**
  ```bash
  grep -c "slds-<class>" node_modules/@salesforce-ux/design-system-2/dist/css/bundled/slds2.lightning-blue.css
  ```
  `0` means it doesn't exist in SLDS 2.

* **Developer detail** lives in `.claude/rules/`: `rules-lwc-components.md` (which components exist) and `rules-lwc-layout.md` (spacing, `sep-` classes, hooks). Page templates and grid are covered in `_docs/layouts.md`.

---

## 9. Sources

Accessed 2026-10-03. The developer.salesforce.com pages block automated reading, so their quotes were taken from archived copies dated April–July 2026. Re-check them before relying on the exact wording. The SLDS Linter rules and the Experience Cloud guide were read directly.

* **LWC guide, CSS anti-patterns** ("doesn't support styling based on rendered output", "redesign the internals", "isn't supported except when using documented styling hooks"): https://developer.salesforce.com/docs/platform/lwc/guide/create-components-css-antipatterns.html
* **LWC guide, SLDS styling** (ladder of variation → utilities → hooks, "create your own custom CSS classes", blueprint definition, `.slds-input`): https://developer.salesforce.com/docs/platform/lwc/guide/create-components-css-slds.html
* **LWC guide, styling hooks** (global, component, SLDS 2 support): https://developer.salesforce.com/docs/platform/lwc/guide/create-components-css-custom-properties.html
* **LWC guide, CSS** ("No support for the ::part pseudo-element"): https://developer.salesforce.com/docs/platform/lwc/guide/create-components-css.html
* **LWC guide, create a component from a blueprint** ("make sure there's no other way", "isn't updated automatically"): https://developer.salesforce.com/docs/platform/lwc/guide/create-components-css-slds-blueprint.html
* **LWC guide, SLDS 1 vs SLDS 2** ("Design tokens are not supported in SLDS 2 themes"): https://developer.salesforce.com/docs/platform/lwc/guide/create-components-css-slds1-slds2.html
* **LWC guide, base components:** https://developer.salesforce.com/docs/platform/lwc/guide/base-components-overview.html and https://developer.salesforce.com/docs/platform/lwc/guide/base-components-considerations.html
* **LWC guide, composition:** https://developer.salesforce.com/docs/platform/lwc/guide/create-components-compose-intro.html and https://developer.salesforce.com/docs/platform/lwc/guide/create-components-compose.html
* **LWC guide, versioning** ("Regardless of apiVersion…"): https://developer.salesforce.com/docs/platform/lwc/guide/create-version-components.html
* **LWC guide, configuration tags** (`isExposed`, targets): https://developer.salesforce.com/docs/platform/lwc/guide/reference-configuration-tags.html
* **LWR guide, styling base components** (`::part(button)`): https://developer.salesforce.com/docs/platform/lwr/guide/lwr-lbc-styling.html
* **Experience Cloud LWR guide (PDF)** (Theme panel, `--dxp` hooks, preapproved parts, custom CSS warning, Remove SLDS): https://resources.docs.salesforce.com/latest/latest/en-us/sfdc/pdf/exp_cloud_lwr.pdf
* **SLDS Linter rule descriptions:** https://github.com/salesforce-ux/slds-linter/blob/main/packages/eslint-plugin-slds/src/config/rule-messages.yml and https://developer.salesforce.com/docs/platform/slds-linter/guide/reference-rules.html
* **Trailhead, Develop Without Code** ("declarative", "point-and-click", "low-code"): https://trailhead.salesforce.com/content/learn/modules/platform-development-basics/develop-without-code-01
* **Trailhead, Lightning App Builder** (standard and custom components): https://trailhead.salesforce.com/content/learn/modules/lightning_app_builder/lightning_app_builder_intro
* **Trailhead, Salesforce releases** (three a year, automatic upgrades): https://trailhead.salesforce.com/content/learn/modules/sf_releases/sf_releases_start
