

Document the app logic rules in a specific rules file in .claude

#Claude files:
Review the site structure and libraries. Plan the ideal CLAUDE.md and .claude files such as rules.
Create a CLAUDE.md. This will describe the type of site it is and high level tech stack. It will list different workflows 
create .claude rules. Such as:
- architecture
- DB and DB API approach
- rules for using LWC to build pages from existing components in the library, to not hulucinate and to not create bespoke markup without first pointing out that there is a need for a custom component and asking whether this should be created

#Release toggle:
I want to create a toggle between releases 1.1, 1.2, 1.3, 1.4, 2+
This will set a feature flag for the whole site (so it needs to be part of the session and remain as changing pages etc).
Each page and feature will be able to have a feature flag set so that I can test multiples variants of a component for different releases (depending which release is set)
Create a simple footer bar and put the toggle there


Rules for LWC:
4. Layout Rules: Spacing, Margins, and Density
To match the look of production Salesforce, observe these layout rules:

Vertical Spacing Between Cards: Cards stacked vertically must use slds-m-bottom_small (12px) or slds-m-bottom_medium (16px). Never use arbitrary CSS pixel values (margin-bottom: 25px).   

Canvas Margins: Wrap page views in slds-p-around_small or slds-p-around_medium so elements do not bleed against the browser viewport or the global shell border.   

Negative Margin Compensation: When placing <lightning-layout-item> elements with padding inside a <lightning-layout>, use the pull-to-boundary="small" attribute on the parent layout to keep the exterior edges aligned flush with your cards.   

Styling Hooks Over Hardcoded Colors: In custom CSS, reference SLDS 2 tokens rather than static hex codes (e.g., use var(--slds-g-color-surface-container-1) for card backgrounds or var(--slds-g-spacing-4) for spacing).   

5. Golden Rule for Handoff: The Modular Component Rule
Avoid building your prototype as a single, sprawling LWC that manages the entire page layout.

In production Salesforce, administrators assemble pages inside Lightning App Builder. They expect developers to deliver self-contained widgets that can be dropped into any layout region.   

Antipattern: Building a single component (accountPage.html) containing the highlights panel, tabs, form fields, and sidebars in one 800-line file.

Salesforce Practice: Build modular child components (accountHighlights.html, accountDetailsForm.html, recentCasesCard.html). In your prototype, assemble them using a parent page layout component (pageAccountRecord.html).   

Following this modular approach ensures your prototype looks identical to a production Lightning page, while allowing downstream Salesforce developers to copy each component directly into a Salesforce DX project and expose it to Lightning App Builder without refactoring.

Lightning page using lightning layout:
<template>
  <div class="slds-p-around_small">
    <!-- Top Highlights Panel / Page Header -->
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

    <!-- 2-Column Responsive Body Layout (8 / 4 Grid) -->
    <lightning-layout multiple-rows pull-to-boundary="small">
      <!-- Main Content Column (Left) -->
      <lightning-layout-item size="12" medium-device-size="8" padding="around-small">
        <lightning-tabset variant="default">
          <lightning-tab label="Details">
            <lightning-card>
              <!-- 2-column detail fields -->
              <lightning-layout multiple-rows class="slds-p-around_medium">
                <lightning-layout-item size="6" class="slds-p-around_xx-small">
                  <lightning-input label="Account Name" value="Acme Corporation" readonly></lightning-input>
                </lightning-layout-item>
                <lightning-layout-item size="6" class="slds-p-around_xx-small">
                  <lightning-input label="Phone" value="(555) 019-2834" readonly></lightning-input>
                </lightning-layout-item>
              </lightning-layout>
            </lightning-card>
          </lightning-tab>
          <lightning-tab label="Related Lists">
            <c-related-contacts-list></c-related-contacts-list>
          </lightning-tab>
        </lightning-tabset>
      </lightning-layout-item>

      <!-- Context Sidebar Column (Right) -->
      <lightning-layout-item size="12" medium-device-size="4" padding="around-small">
        <div class="slds-m-bottom_small">
          <c-activity-timeline-card></c-activity-timeline-card>
        </div>
        <c-quick-actions-card></c-quick-actions-card>
      </lightning-layout-item>
    </lightning-layout>
  </div>
</template>