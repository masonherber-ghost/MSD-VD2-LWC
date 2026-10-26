# Icon map review — Salesforce names → SEP icons

*2026-10-26 · draft for review · source: `src/icons/icon-map.json`*

Every icon on the site is now drawn from the SEP icon set (Figma: *SEP – Foundations UI Library →
Iconography → Small icons*, 110 icons). Pages and Salesforce's own components still ask for icons
by their **Salesforce name** (`utility:search`), so a map decides which SEP icon each name draws.
This is the draft of that map. Please confirm, change or fill each row marked for review.

Anything **not** in the map draws a placeholder (a dotted square). By decision, every
`standard:*` icon — Salesforce's coloured object tiles — is a placeholder too.

Every SEP icon can also be used directly by its own name, e.g. `utility:sep_match_partial`,
whether or not a Salesforce name maps to it.

## Please review

| Salesforce name | Where it appears | Drafted as | Question |
|---|---|---|---|
| `utility:close` | Close buttons — modals, pills, notices, *Close job* | **Delete** (×) | The SEP icon named *Delete* is an ×. Is that its intended use, or should *Delete* mean remove and something else mean close? |
| `utility:delete` | Remove actions | **Delete** (×) | Salesforce draws a bin here; SEP has no bin. × for both close and delete — acceptable? |
| `utility:error` | Field and form errors | **Warning circle** (!) | SEP has one alert icon. Same glyph for error and warning — acceptable? |
| `utility:warning` | Warning notices | **Warning circle** (!) | As above; Salesforce uses a triangle |
| `utility:upload` | File upload | **Share** (tray, arrow up) | *Share* looks like upload. Rename in Figma, or is there a separate share icon intended? |
| `utility:groups`, `utility:people` | Team, applicants | **User** | No multi-person icon. *Information Desk* has two figures but reads as a desk |
| `utility:moneybag` | Pay on a vacancy | **Money** ($ in circle) | Or *Pigbank*? |
| `utility:down` | Dropdown buttons (button menus) | **Chevron down small** | Small for button menus, regular *Chevron down* for comboboxes and accordions — right split? |
| `utility:switch` | Accordion / section expand | **Chevron down** | |
| `utility:clear` | Clear button inside search inputs | **Circle cancel** (⊗) | Or plain × (*Delete*)? |
| `utility:checkin`, `utility:location` | Locations | **Pin** | *Map* is a folded map with a pin — preferred for any of these? |
| `utility:send` | Send | **Navigation** (paper plane) | |
| `utility:hourglass` | Waiting states | **Waiting** | |
| `utility:rows`, `utility:list` | List views | **Menu** (≡) | |

## Has no SEP icon — draws the placeholder

| Salesforce name | Where | Needs |
|---|---|---|
| `utility:apps` | Release-preview footer toggle | An "apps" / grid icon, or use another |
| `utility:database` | `/data` screen nav | |
| `utility:palette` | `/design-system` nav | |
| `utility:offline` | (our code) | |
| `utility:threedots` | Overflow menus inside Salesforce components (tabs, breadcrumbs) | A "more" (⋯) icon — likely needed |
| `utility:steps` | Inside a Salesforce component | Low priority |
| every `standard:*` (25 used) | Card and header object icons, avatars | Placeholder by decision |

## Confident — no question

`add` → Add · `arrowdown/up` → Arrow down/up · `attach` → Paperclip · `back` → Arrow left ·
`ban` → Circle block · `bookmark` → Bookmark · `call` → Telephone · `chat` → Chat bubble 1 ·
`check` → Check · `chevrondown/left/right/up` → Chevron down/left/right/up · `clock` → Clock ·
`company` → Employer · `contract`, `description`, `file` → Text file · `copy` → Copy ·
`dash` → Subtract · `dayview` → Calendar blank · `download` → Download · `edit`, `edit_form` → Edit ·
`email` → Mail · `event` → Calendar · `favorite` → Star · `filter`, `filterList` → Filter ·
`forward` → Arrow right · `help`, `question` → Question circle · `hide` → Eye closed · `home` → Home ·
`image`, `photo` → Photo · `info` → Info · `left/right` → Chevron left/right · `like` → Heart ·
`lock` → Padlock closed · `logout` → Logout · `money` → Money · `new` → Circle add ·
`new_window` → External · `notification` → Bell · `pause` → Pause · `phone_portrait` → Mobile ·
`pin` → Pin · `play` → Play · `preview` → Eye open · `profile_alt`, `user` → User ·
`refresh`, `sync` → Rotate · `search` → Search · `settings` → Settings · `share`, `socialshare` → Share ·
`sort` → Verical arrows · `spinner` → Loading · `success` → Circle check · `target` → Target ·
`unlock` → Padlock open · `up` → Chevron up small · `video` → Webcam · `world` → Earth

## Figma clean-up spotted on import

- **Circle arrow right** has a 1px stroke on its arrow that its three siblings do not. Dropped on
  import, so it matches them; worth removing in Figma.
- Two names carry typos that become code names: **Hapy face** (`utility:sep_hapy_face`) and
  **Verical arrows** (`utility:sep_verical_arrows`). Fixing them in Figma and re-importing renames
  both.
