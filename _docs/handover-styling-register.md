# Handover: styling register

**Generated** by `.claude/skills/component-from-design/styling-register.mjs` from the site bundle's sources (`src/assets/css/site/`) and the wrappers' own stylesheets (`src/modules/`), 2026-10-25. Do not edit by hand; re-run it after any skin change.

**Readers: the Salesforce developer taking these components into an org.** This prototype matches the MSD design with levers that work here but are **not all supported in production**. By decision (2026-10-20), component hooks, re-pointed globals and deprecated hooks are **prototype-only**: each one is listed below so you can decide, per line, to keep it, replace it, or accept the component's default.

Salesforce's position (SLDS 2 Best Practices, and the SLDS Linter):

- Component-level `--slds-c-*` hooks in SLDS 2 are a **developer preview**: "Don't implement functionality in production with these."
- "Don't assign direct values to global styling hooks, as value assignment is reserved for theming tools."
- The `--sds-*` namespace was the beta name for styling hooks, replaced by `--slds-*` at GA (Spring '22); the linter's `enforce-sds-to-slds-hooks` rule converts it.
- The newest global hooks are **not supported on Experience Cloud sites**.

Every line was measured working in this prototype (headless Chrome, `lightning-base-components` 1.28.19-alpha, SLDS 2 Cosmos). None has been tested in an org.

## Summary

| Lever | Status | Lines |
|---|---|---:|
| Private hook (`--slds-s-*`, `--_slds-*`) | Never supported. Remove or rebuild | 0 |
| `::part()` | Documented part, but styles the internals directly. Tier 3, signed off | 16 |
| Legacy `--sds-c-*` hook | Not supported. `--sds-` was the beta namespace, renamed `--slds-` at GA (Spring '22). The names used here are the component's internal variables, never published. May stop working in any release | 1 |
| Component hook the SLDS 2 linter does not recognise | Read by this build of the component; not published for SLDS 2 | 22 |
| Component hook (`--slds-c-*`) | SLDS 2 developer preview — not for production | 19 |
| Global hook re-pointed on one component | Salesforce reserves global assignment for theming tools | 16 |
| Property on the host | Supported: plain CSS on the host element. It reaches inside the component only where the property inherits | 11 |
| **Total** | | **85** |


## `::part()`

Documented part, but styles the internals directly. Tier 3, signed off.

| File:line | Component | Selector | Property | Value |
|---|---|---|---|---|
| components/button-icon.css:9 | lightning-button-icon | `lightning-button-icon::part(button)` | `font-family` | `inherit` |
| components/button.css:72 | lightning-button | `lightning-button::part(button)` | `font-family` | `inherit` |
| components/button.css:112 | lightning-button | `lightning-button::part(button)` | `border-width` | `var(--slds-g-sizing-border-2, 2px)` |
| components/button.css:113 | lightning-button | `lightning-button::part(button)` | `padding-block` | `calc(var(--slds-g-spacing-3, 0.75rem) - var(--slds-g-sizing-border-2, 2px))` |
| components/button.css:114 | lightning-button | `lightning-button::part(button)` | `padding-inline` | `calc(var(--slds-g-spacing-5, 1.5rem) - var(--slds-g-sizing-border-2, 2px))` |
| components/button.css:115 | lightning-button | `lightning-button::part(button)` | `line-height` | `var(--slds-g-font-line-height-3, 1.375)` |
| components/button.css:118 | lightning-button | `lightning-button[variant='base']::part(button)` | `padding-inline` | `calc(var(--slds-g-spacing-1, 0.25rem) - var(--slds-g-sizing-border-2, 2px))` |
| components/combobox.css:20 | lightning-combobox | `lightning-combobox::part(label)` | `font-weight` | `var(--slds-g-font-weight-6, 600)` |
| example/createJobStep2/createJobStep2.css:15 | lightning-accordion-section | `.create-job-step2__licences lightning-accordion-section::part(button)` | `justify-content` | `flex-start` |
| example/createJobStep2/createJobStep2.css:16 | lightning-accordion-section | `.create-job-step2__licences lightning-accordion-section::part(button)` | `inline-size` | `100%` |
| example/createJobStep2/createJobStep2.css:17 | lightning-accordion-section | `.create-job-step2__licences lightning-accordion-section::part(button)` | `padding` | `var(--slds-g-spacing-3, 0.75rem) var(--slds-g-spacing-4, 1rem)` |
| example/createJobStep2/createJobStep2.css:18 | lightning-accordion-section | `.create-job-step2__licences lightning-accordion-section::part(button)` | `border-radius` | `var(--slds-g-radius-border-4, 1rem)` |
| example/createJobStep2/createJobStep2.css:19 | lightning-accordion-section | `.create-job-step2__licences lightning-accordion-section::part(button)` | `background` | `var(--slds-g-color-accent-container-1, #0b5cab)` |
| example/createJobStep2/createJobStep2.css:20 | lightning-accordion-section | `.create-job-step2__licences lightning-accordion-section::part(button)` | `color` | `var(--slds-g-color-on-accent-1, #ffffff)` |
| example/createJobStep2/createJobStep2.css:26 | lightning-accordion-section | `.create-job-step2__licences lightning-accordion-section::part(accordion-section)` | `--slds-c-accordion-section-color-border` | `transparent` |
| example/createJobStep2/createJobStep2.css:27 | lightning-accordion-section | `.create-job-step2__licences lightning-accordion-section::part(accordion-section)` | `--slds-c-accordion-section-spacing-block-end` | `var(--slds-g-spacing-3, 0.75rem)` |

## Legacy `--sds-c-*` hook

Not supported. `--sds-` was the beta namespace, renamed `--slds-` at GA (Spring '22). The names used here are the component's internal variables, never published. May stop working in any release.

| File:line | Component | Selector | Property | Value |
|---|---|---|---|---|
| components/button.css:130 | lightning-button | `lightning-button[variant='brand'], lightning-button[variant='neutral']` | `--sds-c-button-shadow-hover` | `0 8px 16px 0 var(--sep-color-shadow-1)` |

## Component hook the SLDS 2 linter does not recognise

Read by this build of the component; not published for SLDS 2.

| File:line | Component | Selector | Property | Value | Linter |
|---|---|---|---|---|---|
| components/button.css:138 | lightning-button | `lightning-button[variant='brand'], lightning-button[variant='neutral']` | `--slds-c-button-neutral-shadow` | `0 4px 8px 0 var(--sep-color-shadow-1)` | no-slds-namespace-for-custom-hooks |
| components/button.css:148 | lightning-button | `lightning-button[variant='brand'], lightning-button[variant='destructive'], lightning-button[variant='destructive-text'], lightning-button[variant='success'], lightning-button[variant='inverse']` | `--slds-c-button-neutral-shadow-focus` | `var(--slds-g-shadow-inset-inverse-focus-1, 0 0 0 2px #0b5cab inset, 0 0 0 4px #ffffff inset)` | no-slds-namespace-for-custom-hooks |
| components/button.css:151 | lightning-button | `lightning-button[variant='neutral']` | `--slds-c-button-neutral-shadow-focus` | `var(--slds-g-shadow-inset-focus-1, 0 0 0 2px #ffffff inset, 0 0 0 4px #0b5cab inset)` | no-slds-namespace-for-custom-hooks |
| components/button.css:157 | lightning-button | `lightning-button[variant='brand']` | `--slds-c-button-brand-color-border-active` | `var(--slds-g-color-accent-container-2, #014486)` | no-slds-namespace-for-custom-hooks, no-unsupported-hooks-slds2 |
| components/button.css:158 | lightning-button | `lightning-button[variant='brand']` | `--slds-c-button-brand-color-background-focus` | `var(--slds-g-color-accent-container-1, #0b5cab)` | no-slds-namespace-for-custom-hooks |
| components/button.css:159 | lightning-button | `lightning-button[variant='brand']` | `--slds-c-button-brand-color-border-focus` | `var(--slds-g-color-accent-container-1, #0b5cab)` | no-slds-namespace-for-custom-hooks |
| components/button.css:167 | lightning-button | `lightning-button[variant='neutral']` | `--slds-c-button-neutral-text-color` | `var(--slds-g-color-on-surface-2, #2e2e2e)` | no-slds-namespace-for-custom-hooks |
| components/button.css:168 | lightning-button | `lightning-button[variant='neutral']` | `--slds-c-button-neutral-text-color-hover` | `var(--slds-g-color-on-surface-3, #181818)` | no-slds-namespace-for-custom-hooks |
| components/button.css:169 | lightning-button | `lightning-button[variant='neutral']` | `--slds-c-button-neutral-text-color-focus` | `var(--slds-g-color-accent-2, #0b5cab)` | no-slds-namespace-for-custom-hooks |
| components/button.css:170 | lightning-button | `lightning-button[variant='neutral']` | `--slds-c-button-neutral-color-background-focus` | `var(--slds-g-color-surface-container-1, #ffffff)` | no-slds-namespace-for-custom-hooks |
| components/button.css:175 | lightning-button | `lightning-button[variant='base']` | `--slds-c-button-neutral-text-color-focus` | `var(--slds-g-color-accent-2, #0b5cab)` | no-slds-namespace-for-custom-hooks |
| components/button.css:176 | lightning-button | `lightning-button[variant='base']` | `--slds-c-button-neutral-shadow-focus` | `var(--slds-g-shadow-outline-focus-1, 0 0 0 2px #0b5cab)` | no-slds-namespace-for-custom-hooks |
| components/button.css:183 | lightning-button | `lightning-button[variant='destructive-text']` | `--slds-c-button-neutral-color-background-focus` | `var(--slds-g-color-surface-container-1, #ffffff)` | no-slds-namespace-for-custom-hooks |
| components/checkbox-group.css:18 | lightning-checkbox-group, lightning-input | `lightning-checkbox-group, lightning-input[type='checkbox']` | `--slds-c-checkbox-mark-color-foreground` | `var(--slds-g-color-on-accent-2, #ffffff)` | no-slds-namespace-for-custom-hooks, no-unsupported-hooks-slds2 |
| components/dual-listbox.css:14 | lightning-dual-listbox | `lightning-dual-listbox` | `--slds-c-listbox-option-color` | `var(--slds-g-color-on-surface-3, #181818)` | no-slds-namespace-for-custom-hooks, no-unsupported-hooks-slds2 |
| components/dual-listbox.css:15 | lightning-dual-listbox | `lightning-dual-listbox` | `--slds-c-listbox-option-color-background-hover` | `var(--slds-g-color-brand-base-95, #edf4ff)` | no-slds-namespace-for-custom-hooks, no-unsupported-hooks-slds2 |
| components/input.css:45 | lightning-input | `lightning-input` | `--slds-c-input-font-size` | `var(--slds-g-font-scale-1, 0.875rem)` | no-slds-namespace-for-custom-hooks |
| components/input.css:46 | lightning-input | `lightning-input` | `--slds-c-input-sizing-height` | `calc(var(--slds-g-spacing-4, 1rem) * 2 + var(--slds-g-sizing-6, 1.25rem))` | no-slds-namespace-for-custom-hooks |
| components/input.css:47 | lightning-input | `lightning-input` | `--slds-c-inputtext-text-color-placeholder` | `var(--slds-g-color-on-surface-2, #2e2e2e)` | no-slds-namespace-for-custom-hooks |
| components/radio-group.css:16 | lightning-radio-group | `lightning-radio-group` | `--slds-c-radio-color-border-checked` | `var(--slds-g-color-border-accent-2, #0b5cab)` | no-slds-namespace-for-custom-hooks, no-unsupported-hooks-slds2 |
| components/radio-group.css:17 | lightning-radio-group | `lightning-radio-group` | `--slds-c-radio-mark-color-foreground` | `var(--slds-g-color-on-accent-1, #ffffff)` | no-slds-namespace-for-custom-hooks, no-unsupported-hooks-slds2 |
| components/textarea.css:20 | lightning-textarea | `lightning-textarea` | `--slds-c-textarea-color-border-focus` | `var(--slds-g-color-border-accent-1, #0176d3)` | no-slds-namespace-for-custom-hooks, no-unsupported-hooks-slds2 |

## Component hook (`--slds-c-*`)

SLDS 2 developer preview — not for production.

| File:line | Component | Selector | Property | Value |
|---|---|---|---|---|
| components/button.css:156 | lightning-button | `lightning-button[variant='brand']` | `--slds-c-button-brand-color-border-hover` | `var(--slds-g-color-accent-container-2, #014486)` |
| components/button.css:164 | lightning-button | `lightning-button[variant='neutral']` | `--slds-c-button-neutral-color-border` | `var(--slds-g-color-border-accent-1, #0176d3)` |
| components/button.css:165 | lightning-button | `lightning-button[variant='neutral']` | `--slds-c-button-neutral-color-border-hover` | `var(--slds-g-color-border-accent-3, #014486)` |
| components/button.css:166 | lightning-button | `lightning-button[variant='neutral']` | `--slds-c-button-neutral-color-border-active` | `var(--slds-g-color-border-accent-3, #014486)` |
| components/button.css:182 | lightning-button | `lightning-button[variant='destructive-text']` | `--slds-c-button-neutral-color-border` | `var(--slds-g-color-border-error-1, #ba0517)` |
| components/checkbox-group.css:15 | lightning-checkbox-group, lightning-input | `lightning-checkbox-group, lightning-input[type='checkbox']` | `--slds-c-checkbox-color-border` | `var(--slds-g-color-border-1, #e5e5e5)` |
| components/checkbox-group.css:16 | lightning-checkbox-group, lightning-input | `lightning-checkbox-group, lightning-input[type='checkbox']` | `--slds-c-checkbox-color-background-checked` | `var(--slds-g-color-accent-container-1, #0b5cab)` |
| components/checkbox-group.css:17 | lightning-checkbox-group, lightning-input | `lightning-checkbox-group, lightning-input[type='checkbox']` | `--slds-c-checkbox-color-border-checked` | `var(--slds-g-color-border-accent-1, #0176d3)` |
| components/checkbox-group.css:21 | lightning-checkbox-group, lightning-input | `lightning-checkbox-group, lightning-input[type='checkbox']` | `--slds-c-checkbox-radius-border` | `var(--slds-g-radius-border-1, 0.125rem)` |
| components/input.css:43 | lightning-input | `lightning-input` | `--slds-c-input-color-border` | `var(--slds-g-color-border-1, #e5e5e5)` |
| components/input.css:44 | lightning-input | `lightning-input` | `--slds-c-input-text-color` | `var(--slds-g-color-on-surface-2, #2e2e2e)` |
| components/radio-group.css:14 | lightning-radio-group | `lightning-radio-group` | `--slds-c-radio-color-border` | `var(--slds-g-color-border-1, #e5e5e5)` |
| components/radio-group.css:15 | lightning-radio-group | `lightning-radio-group` | `--slds-c-radio-color-background-checked` | `var(--slds-g-color-accent-container-1, #0b5cab)` |
| components/textarea.css:18 | lightning-textarea | `lightning-textarea` | `--slds-c-textarea-radius-border` | `var(--slds-g-radius-border-2, 0.25rem)` |
| components/textarea.css:19 | lightning-textarea | `lightning-textarea` | `--slds-c-textarea-text-color` | `var(--slds-g-color-on-surface-2, #2e2e2e)` |
| components/textarea.css:21 | lightning-textarea | `lightning-textarea` | `--slds-c-textarea-spacing-block-start` | `var(--slds-g-spacing-4, 1rem)` |
| components/textarea.css:22 | lightning-textarea | `lightning-textarea` | `--slds-c-textarea-spacing-block-end` | `var(--slds-g-spacing-4, 1rem)` |
| components/textarea.css:23 | lightning-textarea | `lightning-textarea` | `--slds-c-textarea-spacing-inline-start` | `var(--slds-g-spacing-4, 1rem)` |
| components/textarea.css:24 | lightning-textarea | `lightning-textarea` | `--slds-c-textarea-spacing-inline-end` | `var(--slds-g-spacing-4, 1rem)` |

## Global hook re-pointed on one component

Salesforce reserves global assignment for theming tools.

| File:line | Component | Selector | Property | Value |
|---|---|---|---|---|
| components/button.css:193 | lightning-button | `lightning-button[variant='destructive']` | `--slds-g-color-error-container-1` | `var(--slds-g-color-error-base-50)` |
| components/button.css:194 | lightning-button | `lightning-button[variant='destructive']` | `--slds-g-color-error-container-2` | `var(--slds-g-color-error-base-40)` |
| components/button.css:195 | lightning-button | `lightning-button[variant='destructive']` | `--slds-g-color-border-error-1` | `var(--slds-g-color-error-base-50)` |
| components/button.css:196 | lightning-button | `lightning-button[variant='destructive']` | `--slds-g-color-border-error-2` | `var(--slds-g-color-error-base-40)` |
| components/button.css:197 | lightning-button | `lightning-button[variant='destructive']` | `--slds-g-color-on-error-1` | `var(--slds-g-color-neutral-base-100)` |
| components/button.css:200 | lightning-button | `lightning-button[variant='success']` | `--slds-g-color-success-container-1` | `var(--slds-g-color-success-base-50)` |
| components/button.css:201 | lightning-button | `lightning-button[variant='success']` | `--slds-g-color-success-container-2` | `var(--slds-g-color-success-base-40)` |
| components/button.css:202 | lightning-button | `lightning-button[variant='success']` | `--slds-g-color-border-success-1` | `var(--slds-g-color-success-base-50)` |
| components/button.css:203 | lightning-button | `lightning-button[variant='success']` | `--slds-g-color-border-success-2` | `var(--slds-g-color-success-base-40)` |
| components/button.css:204 | lightning-button | `lightning-button[variant='success']` | `--slds-g-color-on-success-1` | `var(--slds-g-color-neutral-base-100)` |
| components/button.css:213 | lightning-button | `lightning-button[variant='brand'], lightning-button[variant='destructive'], lightning-button[variant='success']` | `--slds-g-color-disabled-container-2` | `var(--slds-g-color-disabled-container-1, #ffffff)` |
| components/button.css:214 | lightning-button | `lightning-button[variant='brand'], lightning-button[variant='destructive'], lightning-button[variant='success']` | `--slds-g-color-on-disabled-2` | `var(--slds-g-color-on-disabled-1, #c9c9c9)` |
| components/button.css:215 | lightning-button | `lightning-button[variant='brand'], lightning-button[variant='destructive'], lightning-button[variant='success']` | `--slds-g-color-border-disabled-1` | `var(--slds-g-color-disabled-container-1, #ffffff)` |
| components/dual-listbox.css:13 | lightning-dual-listbox | `lightning-dual-listbox` | `--slds-g-color-border-1` | `var(--slds-g-color-border-2, #747474)` |
| components/dual-listbox.css:19 | lightning-dual-listbox | `lightning-dual-listbox` | `--slds-g-color-accent-container-2` | `var(--slds-g-color-accent-container-1, #0b5cab)` |
| components/textarea.css:17 | lightning-textarea | `lightning-textarea` | `--slds-g-color-border-2` | `var(--slds-g-color-border-1, #e5e5e5)` |

## Property on the host

Supported: plain CSS on the host element. It reaches inside the component only where the property inherits.

| File:line | Component | Selector | Property | Value |
|---|---|---|---|---|
| components/button.css:79 | lightning-button | `lightning-button` | `font-size` | `var(--slds-g-font-scale-1, 0.875rem)` |
| components/button.css:80 | lightning-button | `lightning-button` | `font-weight` | `var(--slds-g-font-weight-5, 500)` |
| components/card.css:9 | lightning-card | `lightning-card` | `display` | `block` |
| components/checkbox-group.css:23 | lightning-checkbox-group, lightning-input | `lightning-checkbox-group, lightning-input[type='checkbox']` | `font-weight` | `var(--slds-g-font-weight-5, 500)` |
| components/dual-listbox.css:10 | lightning-dual-listbox | `lightning-dual-listbox` | `font-size` | `var(--slds-g-font-scale-1, 0.875rem)` |
| components/radio-group.css:19 | lightning-radio-group | `lightning-radio-group` | `font-weight` | `var(--slds-g-font-weight-5, 500)` |
| components/textarea.css:16 | lightning-textarea | `lightning-textarea` | `font-size` | `var(--slds-g-font-scale-1, 0.875rem)` |
| ui/dataForm/dataForm.css:9 | lightning-textarea | `.data-form__field:has(lightning-textarea)` | `grid-column` | `1 / -1` |
| ui/jobFilterBar/jobFilterBar.css:58 | lightning-input | `.job-filter-bar__search lightning-input` | `flex` | `1 1 auto` |
| ui/jobFilterBar/jobFilterBar.css:59 | lightning-input | `.job-filter-bar__search lightning-input` | `min-width` | `0` |
| ui/siteFooter/siteFooter.css:22 | lightning-radio-group | `.site-footer__toggle lightning-radio-group` | `display` | `inline-block` |
