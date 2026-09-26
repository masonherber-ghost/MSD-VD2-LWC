---
name: build-from-wireframe
description: Translate a wireframe, mockup, screenshot or Figma design into screens for this project using only shipped Salesforce components. Use whenever a visual design is supplied — an attached image, a pasted screenshot, a Figma link or frame, or a description of a layout to match. Also use for "build this", "make it look like this", "match this design".
---

# Build from a wireframe

A wireframe is a **statement of intent, not a specification of markup**. The job is to find the
Salesforce components that already produce that intent and assemble them — not to reproduce the
picture pixel by pixel.

> Build it out of the Salesforce lego. If a brick does not exist, get as close as the set allows and
> say what you could not match. Do not mould a new brick.

Read `.claude/rules/rules-lwc-components.md` and `.claude/rules/rules-lwc-layout.md` before
writing anything. This skill sits on top of them and does not replace them.

---

## The hard constraints

These are not preferences. Breaking one means the output cannot be lifted into a real DX project,
which is the whole point of the prototype.

1. **No new custom components.** Compose from `lightning-*` and, where the library has no component,
   SLDS blueprint markup. Extracting a *region of a page* into `src/modules/ui/` is composition and
   is fine — inventing a control is not. If the design needs a control that does not ship, stop and
   ask (`rules-lwc-components.md` § *The custom component gate*).
2. **No customisations.** Do not restyle a component to look like the mockup. Styling hooks, SLDS
   utilities and exposed parts are the only levers. If the design cannot be reached with those,
   that is **the customisation gate** — stop and ask. See below.
3. **Layout comes from `lightning-layout` and SLDS grid**, the way a FlexiPage region does. There is
   no FlexiPage component to use, so write what App Builder compiles down to.
4. **Never invent a tag, attribute or SLDS class.** Verify each one ships — the two commands are in
   `rules-lwc-components.md`.
5. **Never invent data.** Every value on screen comes from the database or is explicitly labelled
   placeholder copy.

---

## The customisation gate

**If the design can only be reached by customising, you have hit a gate. Stop and ask.**

This is the sibling of the custom component gate in `rules-lwc-components.md`. That one is about
building a control that does not ship; this one is about *bending* one that does. Both are the
user's decision, not yours.

Crossing it without asking is the failure mode this whole skill exists to prevent: a component bent
to match a picture is a component that breaks on the next package upgrade and cannot be lifted into
a DX project.

### What the lego is

Everything in this list is available. Reach for it in this order.

| Tier | What | Where it comes from |
|---|---|---|
| 1 | **Shipped components** | `lightning-*` — the catalog is the authority |
| 2 | **SLDS blueprint markup** | `slds-*` classes, for structures with no component |
| 3 | **Layout** | `lightning-layout` / `lightning-layout-item`, SLDS grid, responsive visibility utilities |
| 4 | **Public component hooks** | `--slds-c-<component>-*` — colour, border, radius, text, sizing, per component |
| 5 | **Global design tokens** | `--slds-g-color-*`, `-spacing-*`, `-sizing-*`, `-font-*`, `-radius-*`, `-shadow-*`, `-duration-*`, `-ratio-*` |
| 6 | **Exposed parts** | `::part(name)` — only the parts a component actually declares |
| 7 | **Our own markup** | Anything in `src/modules/` that we wrote, and its classes |

### What is NOT available — this is the gate

| Off limits | Why |
|---|---|
| **Private hooks** — anything `--_slds-*` | The leading underscore is the contract: internal, unannounced, changes without notice |
| **Reaching past an exposed part** into a component's shadow DOM | `::part(x) > .thing` does not match, and would be unsupported if it did |
| **Overriding a component's internal SLDS classes** | You are fighting the stylesheet; the next version moves the class |
| **Replacing or re-rendering what a component draws** | At that point it is a new component — that is the other gate |
| **Raw colour, pixel or font values in place of a token** | See `rules-lwc-layout.md` § *Styling hooks, not hex* |

### Find out before you ask

**Start at `/design-system` → Tokens** (`npm run dev`). It lists every global token with its
resolved value, every component hook grouped by component, and the private hooks by name — all
generated from the installed package, so it is the fastest honest answer to "what can I change?".

Never report "it cannot be done" without checking. The answer is often tier 4 or 6. For a name you
want to paste into a script or a diff, use the shell:

```bash
C=node_modules/@salesforce-ux/design-system-2/dist/css/bundled/slds2.lightning-blue.css

# 4. Public hooks for a component — the things you ARE allowed to set
grep -rho -- "--slds-c-<name>-[a-z-]*" node_modules/lightning-base-components/src/lightning/<name>/ $C | sort -u

# 4b. Private ones, so you can name what is off limits
grep -o -- "--_slds-c-<name>-[a-z-]*" $C | sort -u

# 5. Global tokens in a family
grep -o -- "--slds-g-color-[a-z0-9-]*" $C | sort -u

# 6. Exposed parts. Check both: a dynamic `part={...}` binding will not match the first grep
grep -oh 'part="[^"]*"' node_modules/lightning-base-components/src/lightning/<name>/<name>.html
grep -n 'part={'        node_modules/lightning-base-components/src/lightning/<name>/<name>.html
```

A component with no public hook and no useful part is a genuine gate. A component with fourteen
hooks is not — use them.

### What to report when you hit the gate

Give a decision, not a problem. Always all five:

1. **What the design asks for** — one line.
2. **The component involved**, and what it renders by default.
3. **What CAN be changed** with the lego — name the actual hooks, tokens or parts you found, not
   "some styling is possible".
4. **What CANNOT**, and which constraint from the table above is in play.
5. **The options**, each with its cost — typically: supply a different asset, accept the gap, or
   sanction the customisation knowingly.

Then stop and wait.

> **Worked example.** A wireframe shows a navy global header carrying a logo whose wordmark is
> white. Report: the bar is `slds-global-header`; SLDS 2 exposes **no** public
> `--slds-c-globalheader-*` hook, only private `--_slds-c-globalheader-color-background`; so the
> navy cannot be set with the lego, and on the default white bar the supplied logo's wordmark is
> invisible. Options: (a) supply a dark-on-light logo — no rule broken; (b) leave the header white
> and accept the brand gap; (c) sanction overriding a private hook, knowing it is unsupported and
> may break on upgrade. **Ask. Do not pick (c) quietly.**

---

## The workflow

### 1. Read the wireframe out loud, in regions

Write down what you see before you touch an editor — top to bottom, region by region. For each:
what it *is* (a global header, a filter bar, a card grid, a field form), not what it looks like.

### 2. Map each region to something that ships

Produce this table and put it in your reply. It is the deliverable that shows the design was
translated rather than traced.

| Wireframe region | Shipped thing | Gap |
|---|---|---|

Fill the **Gap** column honestly. "Wireframe shows separated pills, `lightning-radio-group
type="button"` renders a joined segmented control" is a useful answer. Blank is only right when it
is genuinely blank.

### 3. Decide what you are NOT copying, and say so

Wireframes usually carry brand styling that SLDS will not produce: custom colours, logos, typefaces,
rounded shapes, bespoke iconography. **These are the customisations rule 2 forbids.** Match the
*structure, labels, order, states and behaviour*; leave the skin as Lightning ships it.

Call this out in one short paragraph. Do not silently drop it and do not silently build it.

If matching it would need anything from the *NOT available* table, that is the customisation gate —
stop and report in the five-part form above.

### 4. Check the data supports it

A wireframe can show a count, a badge or a conditional label that nothing in the schema can produce.
Check `server/schema/*.sql` and the API response before building the region. If the data is not
there, say so rather than filling the space.

### 5. Build, composing modularly

Follow `rules-lwc-layout.md` § *The modular component rule*. A region that reads as a named widget
becomes a component under `src/modules/ui/`; the page fetches and passes down.

### 6. Verify in a browser at more than one width

A wireframe is one width. The build has to hold at the others. Drive the page, read the console, and
check at least 390px and a desktop width. Then `npm run build` must exit 0.

---

## Reporting back

Lead with the region → component table. Then state, briefly:

- what you matched
- what you could not match and why (the rule-2 list)
- anything the wireframe implies that the data cannot support

Never claim a wireframe was matched exactly. It never is, and the gaps are the useful part.

---

## Antipatterns

| Tempting | Why not |
|---|---|
| Hand-rolling a nav bar / chip / drawer / tab strip to match the picture | Every one of those ships. See the antipattern list in `rules-lwc-components.md` |
| Restyling `lightning-*` internals to hit the mockup's colours | That is a customisation, and it breaks on the next package upgrade |
| Copying exact pixel values off the image | Use SLDS spacing utilities and styling hooks — `rules-lwc-layout.md` § *Spacing* |
| Building a new component because the shipped one is "close but not right" | Close is the target. Say what is off and move on |
| Inventing a status, count or label to fill a slot the design shows | `rules-app-logic.md` § *Never invent data* |
