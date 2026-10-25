// Hand-written token values: what Figma defines outside its variables (effect styles), and the
// project's deliberate deviations. write-tokens.mjs merges these with the Figma variables and the
// SLDS defaults; an entry here WINS over a Figma variable for the same hook.
//
// Update by hand when a Figma effect style changes (SKILL.md § 3). Labels say where each comes from.

export const handEntries = [
    // Shadow tints — Figma variables shadows/level N/1+2 (ambient + key) and /3 (reverse edge).
    // SLDS has no name for them, so they are --sep-*; only the shadows below read them.
    { hook: "--sep-color-shadow-1", value: "#162c4533", label: "figma \u2014 shadows/level 1/1+2", source: 'figma' },
    { hook: "--sep-color-shadow-1-edge", value: "#162c451a", label: "figma \u2014 shadows/level 1/3", source: 'figma' },
    { hook: "--sep-color-shadow-2", value: "#162c4529", label: "figma \u2014 shadows/level 2/1+2", source: 'figma' },
    { hook: "--sep-color-shadow-2-edge", value: "#162c4517", label: "figma \u2014 shadows/level 2/3", source: 'figma' },
    { hook: "--sep-color-shadow-3", value: "#162c4524", label: "figma \u2014 shadows/level 3/1+2", source: 'figma' },
    { hook: "--sep-color-shadow-3-edge", value: "#162c4514", label: "figma \u2014 shadows/level 3/3", source: 'figma' },
    { hook: "--sep-color-shadow-4", value: "#162c451f", label: "figma \u2014 shadows/level 4/1+2", source: 'figma' },
    { hook: "--sep-color-shadow-4-edge", value: "#162c4512", label: "figma \u2014 shadows/level 4/3", source: 'figma' },
    // Elevation and focus — Figma effect styles. SLDS's geometry, MSD's tint.
    { hook: "--slds-g-shadow-1", value: "0 0 2px 0 var(--sep-color-shadow-1), 0 2px 2px 0 var(--sep-color-shadow-1), 0 -1px 2px 0 var(--sep-color-shadow-1-edge)", label: "figma style \u2014 Elevation/1 - down", source: 'figma' },
    { hook: "--slds-g-shadow-2", value: "0 0 5px 0 var(--sep-color-shadow-2), 0 3px 3px 0 var(--sep-color-shadow-2), 0 -1px 2px 0 var(--sep-color-shadow-2-edge)", label: "figma style \u2014 Elevation/2 - down", source: 'figma' },
    { hook: "--slds-g-shadow-3", value: "0 0 7px 0 var(--sep-color-shadow-3), 0 5px 5px 0 var(--sep-color-shadow-3), 0 -1px 2px 0 var(--sep-color-shadow-3-edge)", label: "figma style \u2014 Elevation/3 - down", source: 'figma' },
    { hook: "--slds-g-shadow-4", value: "0 0 10px 0 var(--sep-color-shadow-4), 0 7px 7px 0 var(--sep-color-shadow-4), 0 -1px 3px 0 var(--sep-color-shadow-4-edge)", label: "figma style \u2014 Elevation/4 - down", source: 'figma' },
    { hook: "--slds-g-shadow-block-start-1", value: "0 0 2px 0 var(--sep-color-shadow-1), 0 -2px 2px 0 var(--sep-color-shadow-1), 0 1px 2px 0 var(--sep-color-shadow-1-edge)", label: "figma style \u2014 Elevation/1 - up", source: 'figma' },
    { hook: "--slds-g-shadow-block-start-2", value: "0 0 5px 0 var(--sep-color-shadow-2), 0 -3px 3px 0 var(--sep-color-shadow-2), 0 1px 2px 0 var(--sep-color-shadow-2-edge)", label: "figma style \u2014 Elevation/2 - up", source: 'figma' },
    { hook: "--slds-g-shadow-block-start-3", value: "0 0 7px 0 var(--sep-color-shadow-3), 0 -5px 5px 0 var(--sep-color-shadow-3), 0 1px 2px 0 var(--sep-color-shadow-3-edge)", label: "figma style \u2014 Elevation/3 - up", source: 'figma' },
    { hook: "--slds-g-shadow-block-start-4", value: "0 0 10px 0 var(--sep-color-shadow-4), 0 -7px 7px 0 var(--sep-color-shadow-4), 0 1px 3px 0 var(--sep-color-shadow-4-edge)", label: "figma style \u2014 Elevation/4 - up", source: 'figma' },
    { hook: "--slds-g-shadow-inline-start-1", value: "0 0 2px 0 var(--sep-color-shadow-1), -2px 0 2px 0 var(--sep-color-shadow-1), 1px 0 2px 0 var(--sep-color-shadow-1-edge)", label: "figma style \u2014 Elevation/1 - left", source: 'figma' },
    { hook: "--slds-g-shadow-inline-start-2", value: "0 0 5px 0 var(--sep-color-shadow-2), -3px 0 3px 0 var(--sep-color-shadow-2), 1px 0 2px 0 var(--sep-color-shadow-2-edge)", label: "figma style \u2014 Elevation/2 - left", source: 'figma' },
    { hook: "--slds-g-shadow-inline-start-3", value: "0 0 7px 0 var(--sep-color-shadow-3), -5px 0 5px 0 var(--sep-color-shadow-3), 1px 0 2px 0 var(--sep-color-shadow-3-edge)", label: "figma style \u2014 Elevation/3 - left", source: 'figma' },
    { hook: "--slds-g-shadow-inline-start-4", value: "0 0 10px 0 var(--sep-color-shadow-4), -7px 0 7px 0 var(--sep-color-shadow-4), 1px 0 3px 0 var(--sep-color-shadow-4-edge)", label: "figma style \u2014 Elevation/4 - left", source: 'figma' },
    { hook: "--slds-g-shadow-inline-end-1", value: "0 0 2px 0 var(--sep-color-shadow-1), 2px 0 2px 0 var(--sep-color-shadow-1), -1px 0 2px 0 var(--sep-color-shadow-1-edge)", label: "figma style \u2014 Elevation/1 - right", source: 'figma' },
    { hook: "--slds-g-shadow-inline-end-2", value: "0 0 5px 0 var(--sep-color-shadow-2), 3px 0 3px 0 var(--sep-color-shadow-2), -1px 0 2px 0 var(--sep-color-shadow-2-edge)", label: "figma style \u2014 Elevation/2 - right", source: 'figma' },
    { hook: "--slds-g-shadow-inline-end-3", value: "0 0 7px 0 var(--sep-color-shadow-3), 5px 0 5px 0 var(--sep-color-shadow-3), -1px 0 2px 0 var(--sep-color-shadow-3-edge)", label: "figma style \u2014 Elevation/3 - right", source: 'figma' },
    { hook: "--slds-g-shadow-inline-end-4", value: "0 0 10px 0 var(--sep-color-shadow-4), 7px 0 7px 0 var(--sep-color-shadow-4), -1px 0 3px 0 var(--sep-color-shadow-4-edge)", label: "figma style \u2014 Elevation/4 - right", source: 'figma' },
    { hook: "--slds-g-shadow-outline-focus-1", value: "0 0 0 2px var(--slds-g-color-accent-1)", label: "figma style \u2014 Focus/Outline", source: 'figma' },
    { hook: "--slds-g-shadow-outset-focus-1", value: "0 0 0 2px var(--slds-g-color-surface-container-1), 0 0 0 4px var(--slds-g-color-on-surface-3)", label: "figma style \u2014 Focus/Outset", source: 'figma' },
    { hook: "--slds-g-shadow-inset-focus-1", value: "0 0 0 2px var(--slds-g-color-on-surface-3) inset", label: "figma style \u2014 Focus/Inset", source: 'figma' },
    { hook: "--slds-g-shadow-inset-inverse-focus-1", value: "0 0 0 2px var(--slds-g-color-on-surface-3) inset, 0 0 0 4px var(--slds-g-color-surface-container-1) inset", label: "figma style \u2014 Focus/Inset-inverse", source: 'figma' },
    // Weight palette 300 / 400 / 500 / 700 (user, 2026-10-23): weight 6 → 500 over Figma's 600.
    { hook: '--slds-g-font-weight-6', value: 'var(--slds-g-font-weight-5)', label: 'msd — figma 600', source: 'msd' },
];
