/*
 * YOUR CODE (off-chain, design). A planet drawn with CSS layers: surface that turns (.planet-turn),
 * clouds turning faster, day/night shading, a highlight, an atmosphere rim and an optional ring.
 * Fills its parent box, so the parent sets the size.
 */

const bands = (c) => `radial-gradient(ellipse 9% 6% at 30% 62%, ${c[5]}, transparent), radial-gradient(ellipse 5% 3% at 78% 34%, ${c[5]}, transparent), repeating-linear-gradient(176deg, ${c[0]} 0%, ${c[1]} 5%, ${c[2]} 10%, ${c[3]} 14%, ${c[1]} 19%, ${c[4]} 25%, ${c[0]} 31%, ${c[2]} 38%, ${c[3]} 43%, ${c[0]} 50%)`;
const SWIRL = "radial-gradient(ellipse 14% 5% at 20% 30%, rgb(255 255 255 / .55), transparent), radial-gradient(ellipse 18% 4% at 62% 58%, rgb(255 255 255 / .45), transparent), radial-gradient(ellipse 10% 3% at 85% 22%, rgb(255 255 255 / .5), transparent), radial-gradient(ellipse 12% 4% at 40% 80%, rgb(255 255 255 / .4), transparent)";
const crater = (x, y, r, a) => `radial-gradient(circle at ${x}% ${y}%, rgb(60 64 80 / ${a}) 0 ${r}%, rgb(235 238 245 / .55) ${r + 0.6}%, transparent ${r + 1.6}%)`;

const KINDS = {
    gas: { base: "#4f46e5", tex: bands([ "#c7d2fe", "#818cf8", "#4338ca", "#e0e7ff", "#312e81", "rgb(255 214 170 / .9)" ]), clouds: SWIRL, cloudOpacity: 0.25, glow: "rgb(129 140 248 / .75)", rim: "rgb(165 180 252 / .9)", ring: "199 210 254" },
    pink: { base: "#9333ea", tex: bands([ "#fbcfe8", "#f472b6", "#7e22ce", "#fce7f3", "#581c87", "rgb(255 240 220 / .9)" ]), clouds: SWIRL, cloudOpacity: 0.2, glow: "rgb(236 72 153 / .7)", rim: "rgb(249 168 212 / .9)", ring: "251 207 232" },
    gold: { base: "#b7791f", tex: bands([ "#fff3c4", "#f5b52e", "#a16207", "#fde68a", "#78350f", "rgb(255 255 255 / .8)" ]), clouds: SWIRL, cloudOpacity: 0.18, glow: "rgb(255 196 64 / .75)", rim: "rgb(255 231 168 / .95)", ring: "255 226 150" },
    ocean: { base: "#1e40af", tex: "radial-gradient(ellipse 12% 18% at 18% 40%, #16a34a 0 60%, transparent), radial-gradient(ellipse 8% 10% at 26% 62%, #15803d 0 60%, transparent), radial-gradient(ellipse 14% 12% at 62% 30%, #22c55e 0 55%, transparent), radial-gradient(ellipse 6% 14% at 70% 66%, #a16207 0 55%, transparent), radial-gradient(ellipse 30% 8% at 50% 4%, #f8fafc 0 60%, transparent), radial-gradient(ellipse 30% 8% at 50% 98%, #f8fafc 0 60%, transparent), linear-gradient(180deg, #1d4ed8, #2563eb 50%, #1e3a8a)", clouds: SWIRL, cloudOpacity: 0.85, glow: "rgb(56 189 248 / .75)", rim: "rgb(125 211 252 / .95)", ring: "186 230 253" },
    ice: { base: "#0ea5e9", tex: "repeating-linear-gradient(120deg, transparent 0 6%, rgb(255 255 255 / .35) 6% 6.6%, transparent 6.6% 13%), repeating-linear-gradient(40deg, transparent 0 9%, rgb(8 90 120 / .45) 9% 9.8%, transparent 9.8% 17%), linear-gradient(180deg, #f0f9ff, #7dd3fc 45%, #0369a1)", clouds: SWIRL, cloudOpacity: 0.3, glow: "rgb(125 211 252 / .7)", rim: "rgb(224 242 254 / .95)", ring: "224 242 254" },
    moon: { base: "#94a3b8", tex: [ crater(14, 30, 6, 0.55), crater(36, 64, 9, 0.5), crater(58, 26, 4, 0.6), crater(72, 58, 7, 0.45), crater(88, 36, 3, 0.6), crater(46, 44, 2.5, 0.6), crater(24, 80, 4, 0.5), "radial-gradient(ellipse 20% 16% at 62% 70%, rgb(80 90 110 / .45), transparent)", "linear-gradient(180deg, #e2e8f0, #cbd5e1 50%, #94a3b8)" ].join(", "), clouds: "none", cloudOpacity: 0, glow: "rgb(226 232 240 / .45)", rim: "rgb(241 245 249 / .85)", ring: "226 232 240" },
    lava: { base: "#1c0f0a", tex: "radial-gradient(ellipse 10% 6% at 20% 30%, #facc15 0 25%, #f97316 50%, transparent), radial-gradient(ellipse 14% 5% at 55% 60%, #fde047 0 20%, #ea580c 50%, transparent), radial-gradient(ellipse 6% 9% at 80% 24%, #fb923c 0 30%, transparent), radial-gradient(ellipse 9% 4% at 36% 78%, #f97316 0 30%, transparent), repeating-linear-gradient(150deg, transparent 0 5%, rgb(249 115 22 / .5) 5% 5.4%, transparent 5.4% 11%), linear-gradient(180deg, #3b1d12, #1c0f0a)", clouds: "radial-gradient(ellipse 20% 8% at 30% 40%, rgb(120 60 40 / .6), transparent), radial-gradient(ellipse 16% 6% at 75% 70%, rgb(120 60 40 / .5), transparent)", cloudOpacity: 0.6, glow: "rgb(249 115 22 / .7)", rim: "rgb(253 186 116 / .9)", ring: "253 186 116" },
};

const ringLayer = (rgb, isFront) => /*html*/`<div class="planet-ring" style="background: radial-gradient(closest-side, transparent 60%, rgb(${rgb} / .85) 62%, rgb(${rgb} / .3) 70%, rgb(${rgb} / .75) 76%, rgb(${rgb} / .2) 84%, rgb(${rgb} / .6) 90%, transparent 94%); z-index: ${isFront ? 2 : 0};${isFront ? " clip-path: inset(50% 0 0 0);" : ""}"></div>`;

/**
 * A planet that fills its parent.
 *
 * @param {string} kind  gas | pink | gold | ocean | ice | moon | lava
 * @param {object} options  { hasRing, spin } spin = seconds for one turn of the surface
 */
const planet = (kind, { hasRing = false, spin = 40 } = {}) => {
    const k = KINDS[kind] ?? KINDS.gas;
    return /*html*/`
        <div class="relative size-full" aria-hidden="true">
            ${hasRing ? ringLayer(k.ring, false) : ""}
            <div class="absolute inset-0 z-[1] overflow-hidden rounded-full" style="background: ${k.base}; box-shadow: 0 0 46px ${k.glow}">
                <div class="planet-turn blur-[1.2px]" style="background-image: ${k.tex}; animation-duration: ${spin}s"></div>
                <div class="planet-turn -inset-[2%] blur-[1.5px]" style="background-image: ${k.clouds}; opacity: ${k.cloudOpacity}; animation-duration: ${(spin * 0.6).toFixed(1)}s"></div>
                <div class="planet-shade"></div>
                <div class="planet-shine"></div>
                <div class="absolute inset-0 rounded-full" style="box-shadow: inset 6px 5px 16px ${k.rim}, inset -2px -2px 6px rgb(0 0 0 / .6)"></div>
            </div>
            ${hasRing ? ringLayer(k.ring, true) : ""}
        </div>
    `;
};

export { planet };
