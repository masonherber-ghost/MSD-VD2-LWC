# Salesforce Lightning Layout Architecture & Constraints Guide

Salesforce layout architecture is divided into two distinct levels: **Macro Layouts** (Lightning Page / FlexiPage templates governing page regions) and **Micro Layouts** (in-component responsive grid systems governing layout inside individual components).

---

## 1. Macro Layouts: Lightning Page Templates (FlexiPages)

In Salesforce, pages are assembled declaratively inside Lightning App Builder using pre-defined page templates. Custom Lightning Web Components are designed to live inside one of these defined regions.

### Standard Page Templates

| Template Name | Layout Composition | Standard Use Case | Platform Constraints |
| --- | --- | --- | --- |
| **Header and Right Sidebar** | Full-width header; ~66%–70% left main body; ~30%–33% right sidebar.

 | Standard Record Pages (Accounts, Contacts, Opportunities, Cases).

 | The right sidebar operates as a "narrow" region (~300–360px wide). Standard components like Related Lists automatically collapse into narrow tile formats and truncate displays to 3 items.

 |
| **Header and Two Equal Regions** | Full-width header; 50% left column; 50% right column.

 | Side-by-side comparisons, operational split-views, approval queues.

 | Columns stack into a single column on mobile devices. Wide elements (e.g., multi-column data tables) cause horizontal scrolling if content is dense.

 |
| **Header and Three Regions** | Full-width header; three equal columns (~33.3% each).

 | Home pages, command centers, high-density KPI monitoring.

 | High information density; components must support narrow container widths.

 |
| **Header and One Region** | Full-width header; 100% full-width canvas.

 | Full-screen data grids, complex wizard workflows, heavy administrative tools.

 | Offers no contextual sidebars; secondary information must be embedded in tab sets or modals.

 |
| **Pinned Region Templates** (e.g., Pinned Left Sidebar) | Non-scrolling persistent side column alongside a scrolling workspace canvas.

 | Service Cloud / Lightning Console apps.

 | **Desktop-only.** Pinned templates do not adapt to the Salesforce Mobile App and cannot be used in Standard Navigation apps.

 |

### FlexiPage Structural Constraints

* **Injected Component Gutters (`.flexipageComponent`):** Lightning App Builder wraps every component dropped onto a page in a system container that automatically injects a vertical bottom margin:


```css
.flexipageComponent:not(:last-child):not(:empty) {
  margin-bottom: var(--lwc-cardSpacingMargin, 0.75rem);
}

```


This margin cannot be removed or styled from within a custom component’s CSS stylesheet. Any design requiring multiple cards to sit flush without a 12px (`0.75rem`) vertical gap will break when moved to production.


* **Width-Aware Components:** Standard Salesforce components adapt their UI depending on whether they sit in a "wide" or "narrow" region. For example, `<lightning-datatable>` preserves columns in wide regions but requires horizontal scrolling in narrow regions, whereas list views automatically switch from tabular grids to stacked record tiles.



---

## 2. Micro Layouts: In-Component Grid Systems

Inside a custom component, layout is structured using `<lightning-layout>` and `<lightning-layout-item>` (which wrap the SLDS responsive flexbox grid).

### Configuration Options for `<lightning-layout>`

* **Responsive 12-Column Sizing:** Layout item widths are set using integer spans from `1` to `12` based on device breakpoints:


* `size="12"`: Default / mobile portrait (100% width).


* `small-device-size="12"`: Mobile landscape.


* `medium-device-size="6"`: Tablets / mid-size screens ($\ge$ 768px, 50% width).


* `large-device-size="4"`: Desktops ($\ge$ 1024px, 33.3% width).




* **Wrapping Rows (`multiple-rows`):** Boolean attribute (`multiple-rows="true"`) allowing items to wrap to subsequent lines when their cumulative size exceeds 12.


* **Horizontal Alignment (`horizontal-align`):**
* `center`: Groups items tightly in the container center.


* `space`: Distributes items evenly with spaces around and between elements.


* `spread`: Places first/last items flush to the edges and distributes remaining space evenly.


* `end`: Aligns items to the far right edge.




* **Vertical Alignment (`vertical-align`):**
* `start`: Top-aligns items.


* `center`: Vertically centers items.


* `end`: Bottom-aligns items.


* `stretch`: Forces all column items to match the height of the tallest item.




* **Gutters & Boundary Padding (`pull-to-boundary`):**
* Layout items accept internal padding (`padding="around-small"`, `padding="around-medium"`).


* The parent `<lightning-layout>` requires `pull-to-boundary="small"` (or medium) to counteract this padding on outer edges, keeping exterior borders flush with cards.





### Grid Constraints & Architectural Pitfalls

* **Strict Descendant Hierarchy:** Only `<lightning-layout-item>` elements can be direct children of `<lightning-layout>`. Placing raw `<div>` wrappers, custom components, or conditional `<template lwc:if>` tags between them breaks flexbox calculations and column sizing.


* **The Viewport Breakpoint Trap:** The responsive attributes (`medium-device-size`, `large-device-size`) evaluate **browser viewport media queries**, not the component container width.


* *The Trap:* Placing a component configured with `large-device-size="6"` into a 300px sidebar on a wide desktop screen will trigger the desktop breakpoint, forcing the component into a 150px column and breaking text labels.


* *The Fix:* Use CSS Container Queries in your component stylesheet instead of viewport attributes for components designed to live anywhere:


```css
:host {
  display: block;
  container-type: inline-size;
}
@container (max-width: 400px) {
  .responsive-column {
    flex-direction: column;
    width: 100%;
  }
}

```




* **Form Field Density:** A 2-column input layout (`size="6"` per field) requires at least 480px–500px of container width to remain readable. Inside a sidebar region, input fields must be set to `size="12"`.



---

## 3. UI Composition Rules for Realistic Salesforce Interfaces

1. **The Card Container Pattern:** Salesforce UI never places inputs, tables, or buttons directly onto the bare page canvas. Every feature must be enclosed in a `<lightning-card>` with an icon, title, and action buttons.


2. **Page Anatomy Formula:**
* **Top:** Page Header / Highlights Panel with record icon, title, and action button group.


* **Main Column (Left 66%–70%):** `<lightning-tabset>` containing "Details" (2-column forms) and "Related Lists" (`<lightning-datatable>`).


* **Context Column (Right 30%–33%):** Stacked single-column cards (Activity Timelines, Tasks, Quick Notes).




3. **Spacing Tokens:**
* Spacing between vertically stacked cards: `slds-m-bottom_small` (12px) or `slds-m-bottom_medium` (16px).


* Canvas padding around the page: `slds-p-around_small` or `slds-p-around_medium`.





---

## 4. Production-Aligned Code Template

This implementation represents a standard, responsive Salesforce record layout:

```html
<template>
  <div class="slds-p-around_small">
    
    <!-- Highlights Panel / Page Header -->
    <div class="slds-page-header slds-m-bottom_small">
      <div class="slds-page-header__row">
        <div class="slds-page-header__col-title">
          <div class="slds-media">
            <div class="slds-media__figure">
              <lightning-icon icon-name="standard:account" size="large"></lightning-icon>
            </div>
            <div class="slds-media__body">
              <h1 class="slds-page-header__title">Acme Corporation</h1>
              <p class="slds-text-body_small">Account • Telecommunications</p>
            </div>
          </div>
        </div>
        <div class="slds-page-header__col-actions">
          <lightning-button-group>
            <lightning-button label="Edit"></lightning-button>
            <lightning-button label="Delete"></lightning-button>
          </lightning-button-group>
        </div>
      </div>
    </div>

    <!-- Macro 8 / 4 Responsive Grid -->
    <lightning-layout multiple-rows="true" pull-to-boundary="small">
      
      <!-- Main Content Column (Left ~66%) -->
      <lightning-layout-item size="12" medium-device-size="8" padding="around-small">
        <lightning-tabset variant="default">
          <lightning-tab label="Details">
            <lightning-card title="Account Details" icon-name="utility:record">
              <!-- Micro 2-Column Form Grid -->
              <lightning-layout multiple-rows="true" class="slds-p-around_medium">
                <lightning-layout-item size="12" small-device-size="6" class="slds-p-around_xx-small">
                  <lightning-input label="Account Name" value="Acme Corporation" readonly></lightning-input>
                </lightning-layout-item>
                <lightning-layout-item size="12" small-device-size="6" class="slds-p-around_xx-small">
                  <lightning-input label="Phone" value="(555) 019-2834" readonly></lightning-input>
                </lightning-layout-item>
              </lightning-layout>
            </lightning-card>
          </lightning-tab>

          <lightning-tab label="Related Contacts">
            <lightning-card title="Contacts (3)" icon-name="standard:contact">
              <div class="slds-p-horizontal_medium">
                <lightning-datatable
                  key-field="id"
                  data={contacts}
                  columns={columns}
                  hide-checkbox-column>
                </lightning-datatable>
              </div>
            </lightning-card>
          </lightning-tab>
        </lightning-tabset>
      </lightning-layout-item>

      <!-- Sidebar Context Column (Right ~33%) -->
      <lightning-layout-item size="12" medium-device-size="4" padding="around-small">
        <lightning-card title="Activity" icon-name="standard:task" class="slds-m-bottom_small">
          <div class="slds-p-around_medium">
            <lightning-input label="Log a Call" placeholder="Enter notes..."></lightning-input>
          </div>
        </lightning-card>

        <lightning-card title="Key Metrics" icon-name="standard:lead_insights">
          <div class="slds-p-around_medium">
            <p class="slds-text-body_small">Annual Revenue: $4,500,000</p>
            <p class="slds-text-body_small">Account Tier: Enterprise</p>
          </div>
        </lightning-card>
      </lightning-layout-item>

    </lightning-layout>
  </div>
</template>

```