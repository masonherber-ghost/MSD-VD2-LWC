# Tier Adherence — Assessment

Run 2026-10-04 with the `assess-tiers` skill (`.claude/skills/assess-tiers/`) against the working tree. Tiers as defined in `_docs/customisation-tiers.md`. **Counts are measured** by the script and spot-checked by hand: `::part` selectors 16, distinct `lightning-*` tags 38, `--slds-s-*` names 37 — all three matched independent `grep`s. **Classifications and rankings are judgement.**

---

## 1. Headline

* **The product surface is inside the gate in its structure.** No bare SLDS class overrides, no `!important`, no `--_slds-*` private hooks, no undocumented attributes found, and no product component hand-rolls a control that ships. Every page is built from base components and SLDS blueprints.
* **The biggest lift risk is the styling layer, not the components.** It touches **37 `--slds-s-*` hooks**, which the SLDS Linter lists as private, and reassigns **33 global `--slds-g-*` hooks** site-wide. On a real Experience Cloud site the second belongs in the Theme panel, and the first has no supported equivalent at all.
* **Most styled wrappers sit at 3B, none stop at 3A.** That's 14 of 33. Every wrapper with a stylesheet sets at least one real property, mostly layout (flex, gaps, sizes) that SLDS has no utility for.
* **Behaviour is where expected.** 16 of 25 pages are T4 because they load data, which is the job of a page. Of the 12 T4 wrappers, 7 are dev tools.

---

## 2. Counts

### Available vs used

| Thing | Available | Used here |
|---|---|---|
| Base components (`lightning-*`) | 84 | 38 distinct |
| SLDS blueprints | 89 (37 with no component behind them) | 22 |
| SLDS utility classes (Tier 2) | 821 in 11 families | 67 distinct, 805 uses, in 45 of 58 templates |
| Global hooks `--slds-g-*` | 514 | 33 reassigned |
| Component hooks `--slds-c-*` | 275 | 26 set |
| Private hooks `--_slds-*` (+ every `--slds-s-*`) | 102 | 0 `--_slds-*` · **37 `--slds-s-*`** |
| `--dxp-*` (Theme panel stand-in) | — | 20 declared |
| Project tokens `--site-*` | 107 | — |
| `sep-` opt-in classes | — | 23 |
| `::part()` selectors | — | 16 |

### Built here, by highest tier reached

| Tier | Pages | Wrappers | Of which dev tools |
|---|---|---|---|
| T2B structural composition | 9 | 7 | 2 pages (`example/data`, `example/designSystem`) |
| T3A hook skinning | 0 | 0 | — |
| T3B conformant CSS | 0 | 14 | — |
| T4 custom LWC | 16 | 12 | 7 wrappers |
| **Total** | **25** | **33** | |

The full per-component table is in the appendix.

---

## 3. Out of bounds, ranked

| # | Finding | How many / where | Why it is out | Fix |
|---|---|---|---|---|
| 1 | **Private `--slds-s-*` hooks set or read** | 37 names in total: `src/assets/css/design-tokens.css` (31), `src/assets/css/site.css` (8), `src/modules/ui/emailShell/emailShell.css` (6), `src/modules/ui/jobFilterBar/jobFilterBar.css` (4), `src/modules/example/jobs/jobs.css` (4) | SLDS Linter `no-slds-private-var`: *"Private SLDS styling hooks have prefixes --_slds- and --slds-s-."* Unannounced; can change any release | Replace each with the component's `--slds-c-*` hook or a `--dxp-*` hook where one exists. Where none exists, raise it as a gap: it's a decision to accept, not a quiet override. Mostly buttons, inputs, page header, links, labels |
| 2 | **Dead CSS using private hooks** | `src/modules/example/jobs/jobs.css` — `.jobs__page-header` is not used by its template | Same as #1, with no benefit | Delete the rule |
| 3 | **Hand-rolled modal** | `src/modules/ui/dataForm/dataForm.html` — `slds-modal` markup by hand, where `lightning/modal` ships | `rules-lwc-components.md` antipattern: rebuilding a shipped control. **Dev tool only** (`/data`) | Re-base on `LightningModal`, as `ui/realmeLoginModal` already does |
| 4 | **Raw hex outside the token file** | `src/modules/ui/exampleStage/exampleStage.css` (5), `src/modules/ui/kitchenSink/kitchenSink.css` (1) | SLDS Linter `no-hardcoded-values-slds2`. **Dev tools only** | Swap for `--slds-g-color-*` tokens |

Raw hex in `design-tokens.css` (41) is **not** a finding: token definitions are the one place a raw value belongs.

---

## 4. On the line

Allowed by this project's rules, but flagged by Salesforce's:

* **33 global hooks reassigned site-wide** in `design-tokens.css`: the font family, the body size and line-height, and 29 colour roles (surface, on-surface, accent, border, error, success, warning, disabled). Lightning Experience reportedly reserves global hooks for theming tools *(unconfirmed)*. **On Experience Cloud, these values belong in the Theme panel** (`--dxp-g-*`: brand, root, colour palettes). A 34th, `--slds-g-sizing-9` in `site.css`, is scoped to one control and is fine.
* **16 `::part()` selectors**: `site.css` (9, the SEP button), `src/modules/ui/siteNav/siteNav.css` (4), `src/modules/example/createJobStep2/createJobStep2.css` (2) and `src/modules/example/login/login.css` (1). Experience Cloud's preapproved parts are `part="dxp-…"`; whether a base component's own parts count as preapproved is **unconfirmed**.
* **6 SLDS classes in scoped selectors** in `site.css`. Five are scoped by our own `sep-` classes (`.sep-page-header .slds-page-header__title`, `.sep-welcome-mat .slds-welcome-mat__content`, …); one is `lightning-badge.slds-badge:empty`. The project rules allow this. The SLDS Linter's `no-slds-class-overrides` probably flags it.
* **26 `--slds-c-*` component hooks.** Endorsed for Experience Cloud, but not yet supported in SLDS 2 inside Lightning Experience. They only matter if a component is reused in the internal org.

---

## 5. Per-tier notes — what the counts hide

* **No wrapper stops at 3A** because SLDS ships no gap utility and no responsive width utility. So almost every styled wrapper writes `display:flex` and a gap, which is 3B by definition. That's honest 3B, not a styling habit.
* **`ui/jobListingPreview` is T4 for one button.** Copy Job ID uses the clipboard. Without it, the component would be T3A.
* **`ui/siteHeader` is T4** because it follows the session, which a header has to do.
* **`ui/accountTabs` is an interactive blueprint at 3B, not T4.** Its active state comes from an `@api` property, so it has no state of its own.
* **The emails** (`ui/emailShell`, `ui/emailPreview`) **are HTML-email mock-ups**, not Lightning pages. Their 3B CSS and their private-hook use are a different medium. Judge them by email rules.
* **Monolithic pages** (`rules-lwc-layout.md` known debt): `src/modules/example/manageOrg/manageOrg.html` (427 lines), `src/modules/example/profile/profile.html` (279), `src/modules/example/jobDetail/jobDetail.html` (235), and two create-job steps over 200. None crosses the gate, but each one blocks lifting as App Builder regions.

---

## 6. Recommendations, in order

1. **Delete the dead `.jobs__page-header` rule** in `src/modules/example/jobs/jobs.css`. Four private-hook uses gone, no visible change.
2. **Map the `--slds-s-*` uses to public hooks**, file by file: `design-tokens.css` first (31 names), then `site.css`, `jobFilterBar.css`, `emailShell.css`. Write down every one with no public equivalent. That list is the honest size of the gap.
3. **Move the 29 colour and font reassignments into the `--dxp` Theme-panel stand-in.** Model them on what the heading styles already do: declare `--dxp-g-brand` and the root, section and colour hooks; have the site read them; remove the global `--slds-g-*` reassignments. On lift they become Theme panel settings.
4. **Confirm `::part` support on Experience Cloud** for `lightning-button`'s `button` part. If it isn't confirmed, treat the 16 selectors as an accepted risk, re-checked each release.
5. **Re-base `ui/dataForm` on `LightningModal`**, and tokenise the hex in the two dev tools. Low priority: these aren't product surface.
6. **Split `manageOrg` and `profile` into region components**, per the debt table, before any App Builder lift.

---

## Appendix — script output (as generated)

## Inventory — what Salesforce makes available (installed versions)

| Thing | Available | Used here |
|---|---|---|
| Base components (`lightning-*`) | 84 | 38 distinct tags |
| SLDS blueprints | 89 (37 with no component behind them) | 22 |
| SLDS utility classes | 821 in 11 families | 67 distinct, 805 uses, in 45 of 58 templates |
| Global hooks `--slds-g-*` | 514 | 33 set |
| Component hooks `--slds-c-*` | 275 | 26 set |
| Private hooks `--_slds-*` (+ `--slds-s-*` per the SLDS Linter) | 102 | 37 `--slds-s-*` touched |
| `--dxp-*` hooks (Theme panel stand-in) | — | 20 declared |
| Project tokens `--site-*` | 107 | — |
| `sep-` opt-in classes | — | 23 |
| `::part()` selectors | — | 16 |
| Routes | — | 25 |

## SLDS utility classes by family (Tier 2)

| Family | Available | Used | Uses |
|---|---|---|---|
| spacing | 126 | 31 | 392 |
| text | 29 | 11 | 169 |
| grid | 148 | 6 | 98 |
| borders & theme | 20 | 7 | 93 |
| truncation | 12 | 2 | 25 |
| position | 4 | 1 | 8 |
| alignment | 9 | 3 | 5 |
| sizing | 449 | 2 | 4 |
| visibility | 18 | 2 | 4 |
| assistive | 2 | 1 | 4 |
| scrolling | 4 | 1 | 3 |

## Built here — components by highest tier reached

| Tier | Pages (`example/*`) | Wrappers (`ui/*`) |
|---|---|---|
| T2B | 9 | 7 |
| T3A | 0 | 0 |
| T3B | 0 | 14 |
| T4 | 16 | 12 |
| **Total** | 25 | 33 |

## Per component

| Component | Kind | Tier | Base components | Blueprints | CSS lines | Flags |
|---|---|---|---|---|---|---|
| `example/aboutThisSite` | page | T2B | 0 | — | 0 | — |
| `example/contactUs` | page | T2B | 0 | — | 0 | — |
| `example/data` | page | T2B | 1 | pageHeader | 0 | — |
| `example/designSystem` | page | T2B | 3 | pageHeader | 0 | — |
| `example/helpCentre` | page | T2B | 0 | — | 0 | — |
| `example/howItWorks` | page | T2B | 0 | — | 0 | — |
| `example/requestSupport` | page | T2B | 0 | — | 0 | — |
| `example/supportingEmployees` | page | T2B | 0 | — | 0 | — |
| `example/whyRecruitWithMsd` | page | T2B | 0 | — | 0 | — |
| `example/createJobStep2` | page | T4 | 9 | scopedNotifications | 27 | ::part (2) — on the line |
| `example/createJobStep3` | page | T4 | 5 | form-element, scopedNotifications | 0 | — |
| `example/createJobStep4` | page | T4 | 6 | scopedNotifications | 0 | — |
| `example/createJobStep5` | page | T4 | 4 | form-element | 0 | — |
| `example/createJobStep6` | page | T4 | 6 | scopedNotifications | 0 | — |
| `example/createJobStep7` | page | T4 | 6 | form-element, scopedNotifications | 0 | — |
| `example/emails` | page | T4 | 5 | pageHeader | 4 | — |
| `example/home` | page | T4 | 5 | pageHeader | 27 | — |
| `example/jobDetail` | page | T4 | 13 | — | 15 | — |
| `example/jobs` | page | T4 | 5 | pageHeader | 25 | private --slds-s-* (4) |
| `example/jobs2` | page | T4 | 3 | pageHeader | 0 | — |
| `example/login` | page | T4 | 2 | — | 34 | ::part (1) — on the line |
| `example/manageOrg` | page | T4 | 12 | form-element, pageHeader | 4 | — |
| `example/profile` | page | T4 | 7 | form-element, pageHeader | 4 | — |
| `example/register` | page | T4 | 3 | — | 8 | — |
| `example/vacancies` | page | T4 | 3 | pageHeader | 3 | — |
| `ui/emailSecureInvite` | wrapper | T2B | 0 | — | 0 | — |
| `ui/jobDetailsForm` | wrapper | T2B | 4 | form-element | 0 | — |
| `ui/pagePlaceholder` | wrapper | T2B | 2 | pageHeader | 0 | — |
| `ui/radioBoxGroup` | wrapper | T2B | 1 | form-element | 0 | — |
| `ui/readOnlyNotice` | wrapper | T2B | 1 | scopedNotifications | 0 | — |
| `ui/vacancyEmptyState` | wrapper | T2B | 2 | — | 0 | — |
| `ui/welcomeMat` | wrapper | T2B | 1 | icon, welcomeMat | 0 | — |
| `ui/accountTabs` | wrapper | T3B | 1 | tabs | 9 | — |
| `ui/contentSection` | wrapper | T3B | 0 | — | 5 | — |
| `ui/emailPreview` | wrapper | T3B | 0 | — | 48 | — |
| `ui/emailShell` | wrapper | T3B | 0 | — | 127 | private --slds-s-* (6) |
| `ui/featureCards` | wrapper | T3B | 5 | — | 18 | — |
| `ui/featureSplit` | wrapper | T3B | 3 | — | 7 | — |
| `ui/illustrationPanel` | wrapper | T3B | 1 | — | 13 | — |
| `ui/jobFilterBar` | wrapper | T3B | 4 | — | 61 | private --slds-s-* (4) |
| `ui/jobManageHeader` | wrapper | T3B | 8 | pageHeader | 22 | — |
| `ui/pageHero` | wrapper | T3B | 3 | — | 13 | — |
| `ui/siteNav` | wrapper | T3B | 4 | — | 60 | ::part (4) — on the line |
| `ui/vacancyCard` | wrapper | T3B | 7 | badge, scopedNotifications | 121 | — |
| `ui/vacancyStepper` | wrapper | T3B | 2 | — | 38 | — |
| `ui/vacancySummaryCard` | wrapper | T3B | 1 | — | 6 | — |
| `ui/blueprintBrowser` | wrapper | T4 | 8 | scopedNotifications | 10 | — |
| `ui/compositionBrowser` | wrapper | T4 | 5 | — | 14 | — |
| `ui/dataBrowser` | wrapper | T4 | 5 | modal | 76 | — |
| `ui/dataForm` | wrapper | T4 | 5 | button, buttonIcon, modal | 9 | — |
| `ui/emailWelcome` | wrapper | T4 | 0 | — | 0 | — |
| `ui/exampleStage` | wrapper | T4 | 1 | button | 40 | raw hex (5) |
| `ui/jobListingPreview` | wrapper | T4 | 6 | — | 9 | — |
| `ui/kitchenSink` | wrapper | T4 | 1 | — | 92 | raw hex (1) |
| `ui/realmeLoginModal` | wrapper | T4 | 4 | — | 99 | — |
| `ui/siteFooter` | wrapper | T4 | 3 | — | 21 | — |
| `ui/siteHeader` | wrapper | T4 | 4 | globalHeader | 0 | — |
| `ui/tokenBrowser` | wrapper | T4 | 3 | dataTable | 34 | — |

## Global stylesheets

| File | Lines | Sets `--slds-g-*` | Sets `--slds-c-*` | Touches `--slds-s-*` | `--dxp-*` | `::part` | Bare `.slds-*` | SLDS class in selector | `!important` | Raw hex |
|---|---|---|---|---|---|---|---|---|---|---|
| `fonts.css` | 70 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| `design-tokens.css` | 618 | 32 | 14 | 31 | 20 | 0 | 0 | 0 | 0 | 41 |
| `site.css` | 816 | 1 | 6 | 8 | 0 | 9 | 0 | 6 | 0 | 0 |

Global hooks reassigned site-wide (33): `--slds-g-font-family-base`, `--slds-g-font-scale-base`, `--slds-g-font-line-height-base`, `--slds-g-color-surface-1`, `--slds-g-color-surface-2`, `--slds-g-color-surface-3`, `--slds-g-color-surface-container-1`, `--slds-g-color-surface-container-2`, `--slds-g-color-surface-container-3`, `--slds-g-color-on-surface-1`, `--slds-g-color-on-surface-2`, `--slds-g-color-on-surface-3`, `--slds-g-color-accent-1`, `--slds-g-color-accent-2`, `--slds-g-color-accent-3`, `--slds-g-color-accent-container-1`, `--slds-g-color-accent-container-2`, `--slds-g-color-accent-container-3`, `--slds-g-color-on-accent-1`, `--slds-g-color-on-accent-2`, `--slds-g-color-border-1`, `--slds-g-color-border-2`, `--slds-g-color-error-1`, `--slds-g-color-on-error-1`, `--slds-g-color-success-1`, `--slds-g-color-on-success-1`, `--slds-g-color-warning-1`, `--slds-g-color-disabled-1`, `--slds-g-color-on-disabled-1`, `--slds-g-color-on-disabled-2`, `--slds-g-color-disabled-container-1`, `--slds-g-color-disabled-container-2`, `--slds-g-sizing-9`

