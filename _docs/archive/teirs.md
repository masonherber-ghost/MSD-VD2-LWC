Ready for review
Select text to add comments on the plan
Plan — _docs/customisation-tiers.md
Context
The user wants one reference doc in _docs/, written for a designer who codes HTML/CSS, that lays out the tiers of "how far can we go" on Salesforce Lightning. It should name the gate: the point past which a change stops riding Salesforce's upgrades (three releases a year, plus SLDS/base-component package bumps) and starts needing someone to find and fix it by hand. It should also map each tier to dev effort.

One premise to correct, plainly. LWC is not the no-code layer. LWC is the framework components are written in. The no-code layer is Lightning App Builder, where an admin drags components that are already built into page regions and sets the properties they expose. lightning-* base components are what a developer assembles inside LWC code. This prototype has no App Builder, so tier 0 is described rather than demonstrated.

File and house style
_docs/customisation-tiers.md: lowercase and hyphenated, no frontmatter, matching layouts.md.

From layouts.md: one Title Case H1, then a dense orienting paragraph, then ---; numbered H2 sections split by ---, H3 at most; * **Bold term:** prose bullets; tables for enumerable options; fenced code with a language tag. Deliberate differences: layouts.md addresses developers in an impersonal voice. This doc talks to a designer in plain words and defines each piece of jargon on first use. It answers _docs/to-do.md's open question "What is a hook?" directly. It doesn't repeat layouts.md (page templates, grid); it links there instead.

The gate, as the doc will state it
The gate is the public API. You may use what Salesforce publishes: a component's documented attributes, slots and events; the --slds-g-* / --slds-c-* / --slds-s-* styling hooks; public blueprint classes; and ::part() names a component exposes. Salesforce promises to keep these working, or to announce it when they change. Everything else is internal detail they can change in any release without telling you: private --_slds-* hooks, a component's inner DOM, unscoped overrides of .slds-* classes, attributes that aren't documented.

Its corollary, the key message: effort and the gate are independent. A brand-new custom component (a lot of code) can sit fully inside the gate. A single CSS line can cross it.

Test for any line of CSS, three questions:

Am I setting something Salesforce published, or reaching for something it didn't?
Is my rule on an opt-in class of ours, or does it hit every instance site-wide?
If Salesforce changes the component's insides tomorrow, does my rule still mean the same thing?
Sections
The short answer. The gate, the test, the effort ≠ gate point.

Words you'll meet. Component · base component · LWC · App Builder · blueprint · composition · token · hook (global/shared/component/private) · shadow DOM ("a sealed box your stylesheet can't reach into"; hooks are the slots in its wall) · light DOM · ::part.

The tiers. One H3 each: what it is · what you can touch · real-Salesforce equivalent · example from this repo · effort · gate side, then a summary table.

Tier	Name	Effort	Gate	Repo evidence
0	Configure in App Builder	No code (admin)	Inside	n/a here
1	Use shipped components	Simple coding	Inside	84 lightning-* components, 239 live examples
2	Blueprint markup	Simple (static) → moderate (interactive, you wire JS/state/keyboard/a11y)	Inside	89 blueprints, 37 with no component behind them; 22 used here; slds-page-header
3	Compositions	Moderate	Inside	32 ui/ wrappers; 10 with zero CSS. jobListingPreview: 244 HTML lines, 0 CSS, 8 components
4	Token skinning	CSS only	Inside	514 --slds-g-*; typeface override in design-tokens.css; 107 --site-*
5	Scoped styling	CSS, careful	Inside, on the line	15 sep- classes. Order: hook → property on sep- class → utility. sep-listing-chip is 100% hooks; sep-scoped-notification is all raw props because that blueprint has no hooks. ::part() sits here as the most fragile sanctioned thing (2 wrappers)
—	THE GATE			
6	Unacceptable CSS	Any, often tiny	Outside	Bare .slds-* overrides, --_slds-*, shadow-piercing, !important wars, styling by generated DOM/ids, relative url(). Repo has 0 of each; near-misses: global-header colour (private only), the size attribute on lightning-button-menu
7	Unacceptable customisation	Usually advanced	Outside	Hand-rolling a control that ships (dropdown, modal, tabs, toggle, pill); copying/forking a base component; undocumented attributes
Note on "custom": use "our CSS" / "project CSS" for tier 5 and save "custom component" for the project's specific meaning, which is the custom component gate.

Effort vs. the gate. A grid with effort (configure / simple / moderate / advanced) against inside/outside, with an example in each cell. Advanced work inside the gate = a new component built from shipped parts and public hooks, after asking. It's legitimate, just costly.

Two gates, don't confuse them. The upgrade gate (this doc) vs the custom component gate in rules-lwc-components.md, which is a "stop and ask" checkpoint. Passing the ask doesn't license crossing the upgrade gate.

When the lego runs out. Worked examples from real comments: no hook on scoped notification, no page-header padding hook, no gap utility, global-header colour private, welcome-mat image behind a private hook with a public fallback. In each case: what we did, and what we said instead of crossing.

What it costs to stay inside. What's lost: pixel-perfect mockup match, some brand surfaces (header bar colour), gradients on hooks. What you get: upgrades for free, a component a Salesforce dev can lift as is.

Where to check. /design-system tabs (Components, Blueprints, Compositions, Tokens, Component hooks), plus the grep one-liners. Links to the rules files for developer detail.

Not doing
No code, config or rules-file changes. Doc only. (Noticed: rules-lwc-layout.md says --site-* has 2 tokens; there are 107. Mention it in the hand-off; don't fix it unasked.)

Verification
Recheck every count against the generated data before writing (84, 239, 89/37/22, 32/10, 514, 275, 107, 102, 15 sep-), plus every quoted file:line.
Grep every class/hook the doc says "exists" in the shipped stylesheet.
git status shows only _docs/customisation-tiers.md added.