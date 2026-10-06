Creating new compositions of existing components **fits directly into Tier 2**—provided that the composition is purely **layout and structural wrapping**, without introducing custom reactive JavaScript, state management, or custom CSS.

To keep your design system governance clean, Tier 2 can be formally split into two sub-levels to make this distinction crystal clear for designers and developers:

---

### Tier 2 Sub-Levels: Formats vs. Compositions

```
Tier 2: No-Code Layout & Slot Composition
 ├── Tier 2A: Page Layout Formatting (Arranging components inside FlexiPages / Regions)
 └── Tier 2B: Structural Component Composition (Combining Base Components into a new reusable LWC)

```

#### Tier 2A: Page Layout Formatting

* **What it is:** Arranging existing, standalone Base Components into standard regions using drag-and-drop builders (Lightning App Builder, Experience Builder) or native grid containers (`<lightning-layout>`).
* **Example:** Placing a `<lightning-card>` on the left side of a page and an activity feed on the right.

#### Tier 2B: Structural Component Composition (The Reusable Composite)

* **What it is:** Nesting multiple Base Components together inside a single LWC wrapper to create a new **reusable UI pattern**.
* **Key Constraint:** It relies entirely on native Base Component properties, named slots, and SLDS utility classes—**no custom CSS overrides and no custom JavaScript controller logic**.
* **Example:** Creating a reusable `<c-record-summary-card>` that combines `<lightning-card>`, `<lightning-icon>`, a `<lightning-button-group>`, and a 2-column field grid.

```html
<!-- Example Tier 2B Composite: Pure XML/HTML structure using existing primitives -->
<template>
  <lightning-card icon-name={iconName}>
    <span slot="title" class="slds-text-heading_small">{title}</span>
    <div slot="actions">
      <lightning-button label="View Details" variant="neutral"></lightning-button>
    </div>
    
    <!-- Micro-layout using native SLDS grid utilities -->
    <div class="slds-grid slds-gutters slds-p-around_medium">
      <div class="slds-col slds-size_1-of-2">
        <p class="slds-text-title">{labelOne}</p>
        <p class="slds-text-body_regular">{valueOne}</p>
      </div>
      <div class="slds-col slds-size_1-of-2">
        <p class="slds-text-title">{labelTwo}</p>
        <p class="slds-text-body_regular">{valueTwo}</p>
      </div>
    </div>
  </lightning-card>
</template>

```

---

### When Does a Composite Escape Tier 2 into Tier 3 or Tier 4?

A composite component stays safely in **Tier 2** as long as it behaves like a structural shell. It crosses the threshold into higher tiers the moment you add custom styling or logic:

| Action Taken on the Composite | Escalates To | Why It Changes Tiers |
| --- | --- | --- |
| You wrap existing Base Components together using native HTML templates and standard slots. | **Tier 2** | Pure structural composition; zero upgrade risk. |
| You apply custom styling hooks (`var(--slds-g-color-*)`) or scoped `.css` rules to alter the composite's appearance. | **Tier 3** | Escalate to Skinning/Styling. |
| You add custom JS functions (`connectedCallback`, third-party event listeners, data manipulation, dynamic API fetches). | **Tier 4** | Escalate to Custom Component Engineering. |

---

### Updated Architecture Framework Matrix

By keeping composites inside Tier 2, your complete governance matrix looks like this:

| Tier | Category | Technical Definition | Dev Effort / Risk |
| --- | --- | --- | --- |
| **Tier 1** | **Out-of-the-Box Configuration** | Standard page assembly via drag-and-drop; global theme panel token tweaks. | Declarative / 0% Risk |
| **Tier 2A** | **Page Formatting & Layout** | Arranging existing components into regions using `<lightning-layout>`. | Declarative / Low Risk |
| **Tier 2B** | **Structural Composition** | Wrapping multiple Base Components into a new reusable composite component (no custom CSS/JS). | Low Code / Low Risk |
| **Tier 3A** | **Token Skinning** | Styling composites using official SLDS 2 component-level styling hooks (`var(--slds-g-*)`). | Moderate / Low-Med Risk |
| **Tier 3B** | **Conformant Custom CSS** | Adding scoped component `.css` rules (linted to respect Shadow DOM). | Moderate / Medium Risk |
| **Tier 4** | **Custom LWC Engineering** | Writing custom JS reactive state, custom HTML templates, and novel UI logic. | Advanced / High Maintenance |
| **Tier 5** | **External Architecture Integration** | Porting in non-Salesforce apps (AEM, iFrames, React Canvas micro-frontends). | Specialized / Architectural Risk |


Here is a clean, structured rewording of your thoughts, followed by an analysis of how your proposed tiers map to official Salesforce terminology and a dedicated breakdown of your open questions.

---

### Reworded Architecture Framework

#### Executive Summary

We are defining a four-tiered customization model to classify front-end work within our Salesforce ecosystem. This framework establishes clear boundaries for component creation, styling depth, and platform upgradeability—ensuring our design system remains conformant while providing clear guidelines on where basic configuration ends and custom engineering begins.

#### Customization Tiers

* **Tier 1: Out-of-the-Box Configuration (Declarative)**
* **Scope:** Uses native Salesforce capabilities via drag-and-drop tools (Lightning App Builder, Experience Builder).
* **Capabilities:** Assembling existing standard Base Components into standard page layouts; applying global theme tokens and global styling hooks via the styling panel (including brand colors and global Cosmos/SLDS 2 theme parameters).
* **Development Effort:** Zero code. Fully declarative.
* **Upgradeability Risk:** 0% (Fully supported platform standard).


* **Tier 2: No-Code Layout & Composition (Slot-Based Composition)**
* **Scope:** Creating new page layouts or component compositions without writing custom CSS or JavaScript.
* **Capabilities:** Using native layout containers (`<lightning-layout>`, `<lightning-layout-item>`, `<lightning-card>`) and leveraging component slots to arrange existing base components into new functional patterns.
* **Development Effort:** Low / Declarative HTML template structure only.
* **Upgradeability Risk:** Low (Uses native component APIs and standard slot boundaries).


* **Tier 3: Component Skinning & Extended Styling (Styling Hooks vs. Custom CSS)**
* **Sub-Tier 3A (Standard Skinning):** Customizing component appearance exclusively via component-level SLDS 2 styling hooks (`var(--slds-g-color-*)`).
* **Sub-Tier 3B (Conformant Custom CSS):** Applying light, scoped CSS directly inside a component's isolated stylesheet. Enforced via strict linting rules so it never pierces Shadow DOM boundaries or disrupts native platform classes.
* **Development Effort:** Moderate front-end styling.
* **Upgradeability Risk:** Medium-Low (As long as Shadow DOM encapsulation is respected and styling hooks are prioritized over hardcoded CSS selectors).


* **Tier 4: Custom Component Engineering (Full LWC Development)**
* **Scope:** Building custom Lightning Web Components (LWC) with custom HTML templates, reactive JavaScript logic, and custom scoped CSS.
* **Capabilities:** Complex UI interactions, custom state management, third-party library integrations, and tailored user flows that cannot be achieved using Base Components alone.
* **Development Effort:** Advanced front-end engineering.
* **Upgradeability Risk:** Medium (Requires ongoing developer maintenance across seasonal Salesforce releases).


* **Tier 5 / Edge Case: Architecture Bypass ("Frame / Port" Integration)**
* **Scope:** Embedding external or non-Salesforce web applications (e.g., ported Adobe Experience Manager / AEM assets, legacy React micro-frontends, or web components) inside Salesforce.
* **Capabilities:** Running fully custom code outside the native LWC execution engine.
* **Development Effort:** Specialized integration engineering.
* **Upgradeability Risk:** High (Bypasses Salesforce design tokens, accessibility standards, and platform lifecycle management).



---

### Salesforce Terminology Mapping

Your tier breakdown aligns closely with Salesforce's internal terminology. Here is how your proposed definitions map to official Salesforce concepts:

| Your Proposed Tier | Salesforce Lingo / Equivalent Term | Accuracy & Terminology Alignment Notes |
| --- | --- | --- |
| **Tier 1: Configuration** | **Declarative / Clicks-Not-Code** | **Accurate.** Salesforce calls this "Declarative Development" or "App Builder Configuration." Styling at this level maps to **Global Styling Hooks** and **Builder Themes**. |
| **Tier 2: Formatting & Layout** | **Slot-Based Composition / Declarative Layouts** | **Accurate.** In Salesforce, inserting components inside container regions uses **Named Slots** (e.g., `slot="actions"`, `slot="title"`) and grid primitives (`<lightning-layout>`). |
| **Tier 3: Skinning** | **Styling Hooks (SLDS 2) & Scoped Component CSS** | **Accurate.** Salesforce specifically uses the term **Styling Hooks** (CSS Custom Properties) for Level 1 skinning. Level 2 maps to **Scoped LWC CSS** enforced by **Lightning Web Security (LWS)** and Shadow DOM rules. |
| **Tier 4: Customization** | **Custom LWC Development** | **Accurate.** This maps to building custom **Lightning Web Components (LWC)** using ES6+ JavaScript, custom HTML templates, and the LWC framework. |
| **Tier 5: Frame Port / Porting** | **Canvas App / iFrame / External Web Component Embed** | **Conceptually Accurate.** In Salesforce lingo, embedding external non-Salesforce UI (like AEM or React apps) is referred to as a **Salesforce Canvas App**, an **iFrame Integration**, or **Lightweight Headless Web Component Embedding**. |

---

### Captured Questions & Decision Points

Here are the specific strategic questions extracted from your ramble:

#### 1. Governance & Boundary Questions

* **Where is the hard boundary for acceptable customization?** At what tier or sub-tier do we draw the line and say *"This exceeds standard project scope / goes too far"*?
* **What defines "Basic", "Expected", and "Exceptional" deliverables?**
* Which tiers fall under **Basic** (default requirement for every delivery)?
* Which tiers fall under **Expected** (standard customization within budget)?
* Which tiers fall under **Exceptional** (requires special architecture approval)?


Here is a clean, structured rewording of your thoughts, followed by an analysis of how your proposed tiers map to official Salesforce terminology and a dedicated breakdown of your open questions.

---

### Reworded Architecture Framework

#### Executive Summary

We are defining a four-tiered customization model to classify front-end work within our Salesforce ecosystem. This framework establishes clear boundaries for component creation, styling depth, and platform upgradeability—ensuring our design system remains conformant while providing clear guidelines on where basic configuration ends and custom engineering begins.

#### Customization Tiers

* **Tier 1: Out-of-the-Box Configuration (Declarative)**
* **Scope:** Uses native Salesforce capabilities via drag-and-drop tools (Lightning App Builder, Experience Builder).
* **Capabilities:** Assembling existing standard Base Components into standard page layouts; applying global theme tokens and global styling hooks via the styling panel (including brand colors and global Cosmos/SLDS 2 theme parameters).
* **Development Effort:** Zero code. Fully declarative.
* **Upgradeability Risk:** 0% (Fully supported platform standard).


* **Tier 2: No-Code Layout & Composition (Slot-Based Composition)**
* **Scope:** Creating new page layouts or component compositions without writing custom CSS or JavaScript.
* **Capabilities:** Using native layout containers (`<lightning-layout>`, `<lightning-layout-item>`, `<lightning-card>`) and leveraging component slots to arrange existing base components into new functional patterns.
* **Development Effort:** Low / Declarative HTML template structure only.
* **Upgradeability Risk:** Low (Uses native component APIs and standard slot boundaries).


* **Tier 3: Component Skinning & Extended Styling (Styling Hooks vs. Custom CSS)**
* **Sub-Tier 3A (Standard Skinning):** Customizing component appearance exclusively via component-level SLDS 2 styling hooks (`var(--slds-g-color-*)`).
* **Sub-Tier 3B (Conformant Custom CSS):** Applying light, scoped CSS directly inside a component's isolated stylesheet. Enforced via strict linting rules so it never pierces Shadow DOM boundaries or disrupts native platform classes.
* **Development Effort:** Moderate front-end styling.
* **Upgradeability Risk:** Medium-Low (As long as Shadow DOM encapsulation is respected and styling hooks are prioritized over hardcoded CSS selectors).


* **Tier 4: Custom Component Engineering (Full LWC Development)**
* **Scope:** Building custom Lightning Web Components (LWC) with custom HTML templates, reactive JavaScript logic, and custom scoped CSS.
* **Capabilities:** Complex UI interactions, custom state management, third-party library integrations, and tailored user flows that cannot be achieved using Base Components alone.
* **Development Effort:** Advanced front-end engineering.
* **Upgradeability Risk:** Medium (Requires ongoing developer maintenance across seasonal Salesforce releases).


* **Tier 5 / Edge Case: Architecture Bypass ("Frame / Port" Integration)**
* **Scope:** Embedding external or non-Salesforce web applications (e.g., ported Adobe Experience Manager / AEM assets, legacy React micro-frontends, or web components) inside Salesforce.
* **Capabilities:** Running fully custom code outside the native LWC execution engine.
* **Development Effort:** Specialized integration engineering.
* **Upgradeability Risk:** High (Bypasses Salesforce design tokens, accessibility standards, and platform lifecycle management).



---

### Salesforce Terminology Mapping

Your tier breakdown aligns closely with Salesforce's internal terminology. Here is how your proposed definitions map to official Salesforce concepts:

| Your Proposed Tier | Salesforce Lingo / Equivalent Term | Accuracy & Terminology Alignment Notes |
| --- | --- | --- |
| **Tier 1: Configuration** | **Declarative / Clicks-Not-Code** | **Accurate.** Salesforce calls this "Declarative Development" or "App Builder Configuration." Styling at this level maps to **Global Styling Hooks** and **Builder Themes**. |
| **Tier 2: Formatting & Layout** | **Slot-Based Composition / Declarative Layouts** | **Accurate.** In Salesforce, inserting components inside container regions uses **Named Slots** (e.g., `slot="actions"`, `slot="title"`) and grid primitives (`<lightning-layout>`). |
| **Tier 3: Skinning** | **Styling Hooks (SLDS 2) & Scoped Component CSS** | **Accurate.** Salesforce specifically uses the term **Styling Hooks** (CSS Custom Properties) for Level 1 skinning. Level 2 maps to **Scoped LWC CSS** enforced by **Lightning Web Security (LWS)** and Shadow DOM rules. |
| **Tier 4: Customization** | **Custom LWC Development** | **Accurate.** This maps to building custom **Lightning Web Components (LWC)** using ES6+ JavaScript, custom HTML templates, and the LWC framework. |
| **Tier 5: Frame Port / Porting** | **Canvas App / iFrame / External Web Component Embed** | **Conceptually Accurate.** In Salesforce lingo, embedding external non-Salesforce UI (like AEM or React apps) is referred to as a **Salesforce Canvas App**, an **iFrame Integration**, or **Lightweight Headless Web Component Embedding**. |

---

### Captured Questions & Decision Points

Here are the specific strategic questions extracted from your ramble:

#### 1. Governance & Boundary Questions

* **Where is the hard boundary for acceptable customization?** At what tier or sub-tier do we draw the line and say *"This exceeds standard project scope / goes too far"*?
* **What defines "Basic", "Expected", and "Exceptional" deliverables?**
* Which tiers fall under **Basic** (default requirement for every delivery)?
* Which tiers fall under **Expected** (standard customization within budget)?
* Which tiers fall under **Exceptional** (requires special architecture approval)?


* **Does the classification depend on the component type or the user experience?** (e.g., Is Tier 3 considered "Basic" for a public-facing portal, but "Exceptional" for an internal back-office record page?)

#### 2. Responsiveness & Adaptability Questions

* **How do we classify Mobile Responsiveness across the Tiers?**
* Is making a layout fluid (using standard `<lightning-layout>` device breakpoints) considered Tier 1/2?
* Is creating a dedicated, form-factor-specific component (using `@salesforce/client/formFactor` or conditional builder visibility) considered Tier 3 or Tier 4?


* **Where does "Fluid Responsiveness" end and "Adaptive Component Redesign" begin?**

#### 3. Architectural Bypass / External Porting Questions

* **What should we officially call Tier 5?** Is *"Frame Port"* or *"External Embed"* the right term for importing non-Salesforce architectures (like AEM or standalone React apps)?
* **Under what circumstances (if any) is Tier 5 permitted**, given that it bypasses the Salesforce design system and governance rules entirely?

* **Does the classification depend on the component type or the user experience?** (e.g., Is Tier 3 considered "Basic" for a public-facing portal, but "Exceptional" for an internal back-office record page?)

#### 2. Responsiveness & Adaptability Questions

* **How do we classify Mobile Responsiveness across the Tiers?**
* Is making a layout fluid (using standard `<lightning-layout>` device breakpoints) considered Tier 1/2?
* Is creating a dedicated, form-factor-specific component (using `@salesforce/client/formFactor` or conditional builder visibility) considered Tier 3 or Tier 4?


* **Where does "Fluid Responsiveness" end and "Adaptive Component Redesign" begin?**

#### 3. Architectural Bypass / External Porting Questions

* **What should we officially call Tier 5?** Is *"Frame Port"* or *"External Embed"* the right term for importing non-Salesforce architectures (like AEM or standalone React apps)?
* **Under what circumstances (if any) is Tier 5 permitted**, given that it bypasses the Salesforce design system and governance rules entirely?



Layout templates:
In Salesforce Lightning Experience, page layouts are configured as **Lightning Page Templates (FlexiPages)**.

Standard Salesforce object page layouts and their component configurations can be represented as structural grid wireframes using the 12-column responsive layout system.

---

### Configuration 1: Header and Right Sidebar (Standard 8 / 4 Split)

This is the default and most widely used layout for standard CRM objects (Accounts, Contacts, Leads, Opportunities). It pairs a wide primary work region (~66%–70%) with a narrow utility and collaboration sidebar (~30%–34%).

| Layout Region | Grid Column Allocation | Typical Components Assigned |
| --- | --- | --- |
| **Top Header** | 12 of 12 Columns (100% width) | Highlights Panel (`<lightning-record-view>` / Compact Layout) with Object Icon, Title, and Action Button Group.

 |
| **Sub-Header** | 12 of 12 Columns (100% width) | Sales Path / Stage Chevron (`<lightning-progress-indicator>`).

 |
| **Main Left Region** | 8 of 12 Columns (~67% width) | Tabset (`<lightning-tabset>`) hosting Dynamic Forms (Details) and Related Lists (`<lightning-datatable>`).

 |
| **Right Sidebar** | 4 of 12 Columns (~33% width) | Single-column cards: Activity Timeline, Log a Call/Tasks, and Chatter Feed.

 |

#### Wireframe Grid Map

| Grid Area | Col 1 to 8 (Main Work Canvas — ~67%) | Col 9 to 12 (Right Sidebar — ~33%) |
| --- | --- | --- |
| **Header (Span 12)** | `[ Highlights Panel: Icon | Title |
| **Process (Span 12)** | `[ Process Path: [Stage 1] ──► [Stage 2] ──► [Stage 3] ──► [Closed] ]` | *(Process spans across both columns)* |
| **Body Row 1** | **Tab 1: Details**<br>

<br>• Dynamic Form: 2-Column Account Info<br>

<br>• Dynamic Form: 2-Column Address Details

 | **Activity Component**<br>

<br>• Action Bar: Log Call, New Task, Email<br>

<br>• Upcoming & Overdue List |
| **Body Row 2** | **Tab 2: Related Lists**<br>

<br>• Related Contacts (`lightning-datatable`)<br>

<br>• Related Opportunities (`lightning-datatable`)

 | **Chatter / Collaboration**<br>

<br>• Post Feed / Updates<br>

<br>• Quick Notes Card

 |

*Mobile Reflow:* The right sidebar (Columns 9–12) collapses and drops directly underneath the main body into a single, vertical 12-column stream.

---

### Configuration 2: Header and Two Equal Regions (6 / 6 Split)

This template provides two equal 50% columns below the header. It is used for operational record comparisons, approval queues, or split operational workflows.

| Layout Region | Grid Column Allocation | Typical Components Assigned |
| --- | --- | --- |
| **Top Header** | 12 of 12 Columns (100% width) | Highlights Panel, Record Actions, Primary Status.

 |
| **Left Region** | 6 of 12 Columns (50% width) | Primary Record Details / Dynamic Forms field sections.

 |
| **Right Region** | 6 of 12 Columns (50% width) | Secondary Record Details, Child Data Tables, or Case Resolution widgets.

 |

#### Wireframe Grid Map

| Grid Area | Col 1 to 6 (Left Column — 50%) | Col 7 to 12 (Right Column — 50%) |
| --- | --- | --- |
| **Header (Span 12)** | `[ Highlights Panel: Object Badge | Record Name |
| **Body Row 1** | **Record Information (Dynamic Forms)**<br>

<br>• Primary Fields (Single-column inputs)<br>

<br>• Financial & Audit Section

 | **Operational Context / Related Records**<br>

<br>• Open Case Items<br>

<br>• SLA Timers & Milestone Counters |
| **Body Row 2** | **Approval History Card**<br>

<br>• Step Approver & Comments List | **Activity & Chatter Tabset**<br>

<br>• Interaction History & Notes

 |

*Mobile Reflow:* Column 1 to 6 renders first, followed by Column 7 to 12 stacked beneath it.

---

### Configuration 3: Header and Three Regions (4 / 4 / 4 Split)

Commonly used for high-density command centers, Case Management hubs, and operational dispatch consoles.

| Layout Region | Grid Column Allocation | Typical Components Assigned |
| --- | --- | --- |
| **Top Header** | 12 of 12 Columns (100% width) | Highlights Panel with status badges and quick action controls.

 |
| **Left Column** | 4 of 12 Columns (~33% width) | Account / Contact Context, Customer Summary, Identity verification.

 |
| **Center Column** | 4 of 12 Columns (~33% width) | Active Workspace, Details Tabset, Dynamic Form sections.

 |
| **Right Column** | 4 of 12 Columns (~33% width) | Knowledge Articles search, AI Agentforce recommendations, Activity stream.

 |

#### Wireframe Grid Map

| Grid Area | Col 1 to 4 (Left Region — ~33%) | Col 5 to 8 (Center Region — ~33%) | Col 9 to 12 (Right Region — ~33%) |
| --- | --- | --- | --- |
| **Header (Span 12)** | `[ Highlights Panel: Case ID | Subject | Priority Badge |
| **Body Row 1** | **Customer Context Card**<br>

<br>• Contact Name & Phone<br>

<br>• Service Tier Badge<br>

<br>• Active Entitlements

 | **Case Details (Dynamic Forms)**<br>

<br>• Description & Issue Category<br>

<br>• Resolution Steps Form

 | **Knowledge & Guidance**<br>

<br>• Recommended Solutions<br>

<br>• Attached KB Articles |
| **Body Row 2** | **Recent Cases List**<br>

<br>• Compact Related List (3 items)

 | **Related Milestone Tracker**<br>

<br>• Resolution Countdown Timer | **Interaction Timeline**<br>

<br>• Phone Call Logs<br>

<br>• Email Correspondence

 |

*Mobile Reflow:* All three regions stack vertically into a single column in sequential order: Left $\rightarrow$ Center $\rightarrow$ Right.

---

### Configuration 4: Header and One Region (100% Full-Width Canvas)

Used for data-heavy administrative pages, wide interactive data grids, and multi-step wizard screens.

| Layout Region | Grid Column Allocation | Typical Components Assigned |
| --- | --- | --- |
| **Top Header** | 12 of 12 Columns (100% width) | Highlights Panel or Page Header with filtering options.

 |
| **Main Canvas** | 12 of 12 Columns (100% width) | Wide `<lightning-datatable>`, Screen Flow wizards, or complex multi-tab workspaces.

 |

#### Wireframe Grid Map

| Grid Area | Col 1 to 12 (Full-Width Canvas — 100%) |
| --- | --- |
| **Header (Span 12)** | `[ Page Header: Title |
| **Main Body (Span 12)** | **Wide Data Table Canvas (`lightning-datatable`)**<br>

<br>• Column 1 (Checkbox Select) | Column 2 (Record Name) | Column 3 (Stage) | Column 4 (Amount) | Column 5 (Close Date) | Column 6 (Owner) | Column 7 (Action Menu)<br>

<br>• Includes column sorting, inline cell editing, and infinite scroll virtualization.

 |

---

### Configuration 5: Pinned Region Console Layout (Service Cloud Workspaces)

Console navigation templates pin specific regions to prevent them from scrolling when a user navigates large record bodies.

| Layout Region | Workspace Mechanics | Typical Components Assigned |
| --- | --- | --- |
| **Pinned Left Region** | Fixed-width panel (non-scrolling, ~25%–30%) | Master Record Details, Customer Profile Card, Identity Verification.

 |
| **Scrolling Center Region** | Fluid width (vertically scrolling, ~45%–50%) | Sub-tab Workspace, Case Feed, Incoming Email Reader.

 |
| **Pinned Right Region** | Fixed-width sidebar (non-scrolling, ~25%) | Knowledge Search, Milestone Timers, Utility Widgets.

 |

#### Wireframe Grid Map

| Grid Area | Left Pinned Panel (~25% Fixed) | Center Scrolling Canvas (~50% Fluid) | Right Pinned Panel (~25% Fixed) |
| --- | --- | --- | --- |
| **Top Nav** | `[ Primary Tab: Account ABC ] ──► [ Sub-Tab: Case #10042 ] ──► [ Sub-Tab: Contact XYZ ]` | *(Console Tabstrip)* | *(Console Tabstrip)* |
| **Workspace Canvas** | **Pinned Customer Card**<br>

<br>• Name: John Doe<br>

<br>• Account: Acme Corp<br>

<br>• SLA: 24/7 Gold Tier<br>

<br>*(Does not scroll)* | **Active Case Feed**<br>

<br>• Email correspondence thread<br>

<br>• Public / Private Agent Comments<br>

<br>• File Attachments<br>

<br>*(Scrolls independently)* | **Service Tools**<br>

<br>• Milestone Tracker (SLA)<br>

<br>• Knowledge Article Suggester<br>

<br>*(Does not scroll)* |

*Platform Limitation:* Pinned region templates are desktop-only and cannot be rendered on the Salesforce Mobile app.

---

### Configuration 6: Macro Display Patterns — Grouped View vs. Full View

Inside any Lightning Record Page template, administrators configure whether the record renders as a **Grouped View** (modular tabs) or **Full View** (linear document stack).

| View Pattern | Layout Structure | Behavioral Trade-offs |
| --- | --- | --- |
| **Grouped View (Default)** | Divides records into tab sets (`[Details]` `[Related]` `[Activity]`).

 | Minimizes vertical page scroll; keeps critical fields above the fold; hides secondary data until clicked.

 |
| **Full View** | Unrolls all field sections, related lists, and activity streams into a continuous vertical stack.

 | Eliminates clicks across tabs; increases page length; requires users to scroll continuously.

 |

#### Wireframe Comparison: Grouped vs. Full View

| Wireframe Layout: Grouped View (Modular Tabs) | Wireframe Layout: Full View (Linear Continuous Stack) |
| --- | --- |
| `[ Highlights Panel (Title | Key Fields) ]`

 |
| `[ Tab: Details ]` | `[ Tab: Related ]` | `[ Tab: Activity ]`<br> | **Section 1: General Information** (2-Column Fields)

 |
| *(Only active tab content is displayed below)*<br> | **Section 2: System Details** (2-Column Fields)

 |
| • Dynamic Forms 2-Column Section

 | **Related List: Contacts** (Datatable)

 |
| • Dynamic Forms Address Details

 | **Related List: Opportunities** (Datatable)

 |
| *(Footer fits within standard desktop viewport height)*<br> | **Activity & History Feed** (Stacked timeline cards)

 |

---

### Configuration 7: Micro Layout — Dynamic Forms Field Sections (1-Col vs 2-Col)

Inside the "Details" tab or canvas, fields are positioned using **Dynamic Forms Field Sections**.

#### Wireframe Grid Map: 2-Column Section Alignment

| Field Section Config | Left Field Column (Span 6) | Right Field Column (Span 6) |
| --- | --- | --- |
| **2-Column Section** | `[ Account Name: Acme Corp ]` | `[ Phone: (555) 019-2834 ]` |
|  | `[ Account Owner: Jane Smith ]` | `[ Rating: Hot ]` |
|  | `[ Industry: Telecommunications ]` | `[ Annual Revenue: $4,500,000 ]` |
| **1-Column Section** | `[ Description: Multi-line rich text field spanning full 12 columns ]` | *(Merged with left column across full width)* |

*Tab Order Traversal Options:*

1. **Left-to-Right:** Keyboard focus moves: Account Name $\rightarrow$ Phone $\rightarrow$ Account Owner $\rightarrow$ Rating.


2. **Top-to-Bottom:** Keyboard focus moves: Account Name $\rightarrow$ Account Owner $\rightarrow$ Industry $\rightarrow$ Phone $\rightarrow$ Rating.