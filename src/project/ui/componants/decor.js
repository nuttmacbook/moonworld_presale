/*
 * YOUR CODE (off-chain, design). Background textures for cards: low-poly facets, hex mesh, grid lines.
 * Each sits behind the card's content (-z-10 inside an `isolate` card) and fades out toward the text.
 */

const VIOLET = [ "124 108 255", "169 156 255", "90 70 220" ];
const GOLD = [ "255 214 110", "236 72 153", "124 108 255" ];

// Facets in a 400×240 box, packed into the top-right corner
const FACETS = [
    [ "400,0 300,0 340,60", 0, 0.2 ], [ "300,0 340,60 240,50", 0, 0.08 ], [ "240,50 340,60 290,130", 1, 0.14 ],
    [ "340,60 400,0 400,110", 0, 0.26 ], [ "340,60 400,110 290,130", 2, 0.18 ], [ "290,130 400,110 380,200", 0, 0.1 ],
    [ "240,50 290,130 180,120", 1, 0.07 ], [ "180,120 290,130 230,210", 0, 0.06 ], [ "290,130 380,200 230,210", 1, 0.1 ],
    [ "380,200 400,110 400,240", 0, 0.18 ], [ "230,210 380,200 400,240 260,240", 2, 0.08 ], [ "300,0 240,50 200,0", 1, 0.06 ],
];

/**
 * Low-poly facets.
 * @param {string} cls      position/size classes, e.g. "right-0 top-0 h-full w-2/3"
 * @param {object} options  { tone: "violet" | "gold", flip: mirror to the bottom-left, fade: mask direction }
 */
const poly = (cls, { tone = "violet", flip = false, fade = "to left" } = {}) => {
    const colors = tone === "gold" ? GOLD : VIOLET;
    const stroke = tone === "gold" ? "rgb(255 214 110 / .25)" : "rgb(214 208 255 / .22)";
    const mask = `linear-gradient(${fade}, #000 25%, transparent)`;
    return /*html*/`
        <svg class="pointer-events-none absolute -z-10 ${cls}" viewBox="0 0 400 240" preserveAspectRatio="${flip ? "xMinYMax" : "xMaxYMin"} slice" aria-hidden="true"
            style="-webkit-mask-image: ${mask}; mask-image: ${mask};${flip ? " transform: scale(-1, -1);" : ""}">
            <g stroke="${stroke}" stroke-width="1">
                ${FACETS.map(([ points, c, a ]) => /*html*/`<polygon points="${points}" fill="rgb(${colors[c]} / ${a})"></polygon>`).join("")}
            </g>
        </svg>
    `;
};

/**
 * Hexagon mesh.
 * @param {string} id     unique pattern id on the page
 * @param {object} options { color, mask (CSS mask-image), size }
 */
const hex = (id, { color = "rgb(214 208 255 / .3)", mask = "radial-gradient(circle at 100% 0%, #000 0%, transparent 60%)", size = 48 } = {}) => {
    const h = +(size * 1.7321).toFixed(2);
    const s = size / 2;
    const path = `M${s} 0L${size} ${+(h / 6).toFixed(2)}V${+(h / 2).toFixed(2)}L${s} ${+(h * 2 / 3).toFixed(2)}L0 ${+(h / 2).toFixed(2)}V${+(h / 6).toFixed(2)}Z M${s} ${+(h * 2 / 3).toFixed(2)}V${h}`;
    return /*html*/`
        <svg class="pointer-events-none absolute inset-0 -z-10 size-full" aria-hidden="true" style="-webkit-mask-image: ${mask}; mask-image: ${mask}">
            <defs><pattern id="${id}" width="${size}" height="${h}" patternUnits="userSpaceOnUse"><path d="${path}" fill="none" stroke="${color}" stroke-width="1"></path></pattern></defs>
            <rect width="100%" height="100%" fill="url(#${id})"></rect>
        </svg>
    `;
};

/** Square grid lines, faded with a radial mask at `at` (e.g. "100% 0%") */
const grid = ({ at = "100% 0%", size = 24, color = "169 156 255", reach = 65 } = {}) => /*html*/`
    <div class="pointer-events-none absolute inset-0 -z-10" aria-hidden="true"
        style="background-image: linear-gradient(rgb(${color} / .15) 1px, transparent 1px), linear-gradient(90deg, rgb(${color} / .15) 1px, transparent 1px); background-size: ${size}px ${size}px; -webkit-mask-image: radial-gradient(circle at ${at}, #000 0%, transparent ${reach}%); mask-image: radial-gradient(circle at ${at}, #000 0%, transparent ${reach}%)"></div>
`;

export { poly, hex, grid };
