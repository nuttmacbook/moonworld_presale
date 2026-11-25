/*
 * YOUR CODE (off-chain, design). Inline SVG icons drawn for this site (space theme), no emoji or icon font.
 * Each takes a CSS class so size and color come from Tailwind (stroke/fill = currentColor).
 */

const svg = (cls, body, { fill = "none", stroke = "currentColor", width = 2, box = "0 0 24 24" } = {}) =>
    /*html*/`<svg class="${cls}" viewBox="${box}" fill="${fill}" stroke="${stroke}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

const icons = {
    sparkle: (cls = "size-3.5") => svg(cls, `<path d="M12 0C13 7 17 11 24 12C17 13 13 17 12 24C11 17 7 13 0 12C7 11 11 7 12 0Z"/>`, { fill: "currentColor", stroke: "none" }),
    arrow: (cls = "size-4") => svg(cls, `<path d="M5 12h14M13 6l6 6-6 6"/>`, { width: 2.4 }),
    external: (cls = "size-3.5") => svg(cls, `<path d="M7 17L17 7M9 7h8v8"/>`, { width: 2.4 }),
    check: (cls = "size-4") => svg(cls, `<path d="M5 12l5 5L20 7"/>`, { width: 2.6 }),
    shield: (cls = "size-5") => svg(cls, `<path d="M12 2l8 3v6c0 5-3.4 9.2-8 11-4.6-1.8-8-6-8-11V5z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>`),
    mail: (cls = "size-5") => svg(cls, `<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>`, { width: 2.2 }),
    bridge: (cls = "h-6 w-13") => svg(cls, `<path d="M4 8h46M44 3l6 5-6 5M52 18H6M12 13l-6 5 6 5"/>`, { box: "0 0 56 24" }),
    globe: (cls = "size-4") => svg(cls, `<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18"/>`, { width: 1.8 }),
    // Planet with a ring and two arrows: swap
    swap: (cls = "size-7") => svg(cls, `<circle cx="16" cy="16" r="5.5"/><ellipse cx="16" cy="16" rx="13" ry="5" transform="rotate(-24 16 16)"/><path d="M24.5 6.5l3 .5-.5 3"/><path d="M7.5 25.5l-3-.5.5-3"/><circle cx="16" cy="16" r="1.6" fill="currentColor" stroke="none"/>`, { width: 1.8, box: "0 0 32 32" }),
    // Radar screen with a price line: chart
    radar: (cls = "size-7") => svg(cls, `<circle cx="16" cy="16" r="13"/><circle cx="16" cy="16" r="7.5" stroke-opacity="0.5"/><path d="M4 20l6-5 5 3 6-8 7 4"/><circle cx="21" cy="10" r="1.8" fill="currentColor" stroke="none"/>`, { width: 1.8, box: "0 0 32 32" }),
    // Magnifier with a star inside: explorer
    scope: (cls = "size-7") => svg(cls, `<circle cx="13" cy="13" r="9"/><path d="M20 20l8 8"/><path d="M13 7.5c.5 3 2 4.5 5 5-3 .5-4.5 2-5 5-.5-3-2-4.5-5-5 3-.5 4.5-2 5-5z" fill="currentColor" stroke="none"/>`, { width: 1.8, box: "0 0 32 32" }),
    telegram: (cls = "size-5") => svg(cls, `<path d="M21 4L3 11l6 2 2 6 3-4 5 4z"/>`, { width: 1.8 }),
    facebook: (cls = "size-5") => svg(cls, `<path d="M14 8h3V4h-3a4 4 0 0 0-4 4v3H7v4h3v6h4v-6h3l1-4h-4V8z"/>`, { width: 1.8 }),
    youtube: (cls = "size-5") => svg(cls, `<rect x="3" y="6" width="18" height="12" rx="4"/><path d="M10 9.5l4.5 2.5-4.5 2.5z"/>`, { width: 1.8 }),
};

export { icons };
