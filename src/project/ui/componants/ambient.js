/*
 * YOUR CODE (off-chain, design). Space background that sits outside #app, so redrawing the page
 * never restarts it: twinkling stars (move a little with the mouse), shooting stars, a sun flare
 * with slow rays, soft light beams and a light that follows the mouse. Fixed, no pointer events.
 */

const STAR_COUNT = 55;
const TINTS = [ "#ffffff", "#ffffff", "#ffffff", "#cfd8ff", "#ffe7a8" ];

/** Same sky on every load (seeded), so screenshots match */
const seeded = (seed) => () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
};

/** Star spans with random size, place, tint and twinkle speed */
const stars = (count, seed) => {
    const rnd = seeded(seed);
    return Array.from({ length: count }, () => {
        const size = rnd() < 0.85 ? 1 + rnd() * 1.5 : 2.5 + rnd() * 1.5;
        const color = TINTS[Math.floor(rnd() * TINTS.length)];
        return /*html*/`<span class="star" style="left:${(rnd() * 100).toFixed(2)}%;top:${(rnd() * 100).toFixed(2)}%;width:${size.toFixed(1)}px;height:${size.toFixed(1)}px;background:${color};box-shadow:0 0 ${(size * 3).toFixed(0)}px ${color};animation-duration:${(2 + rnd() * 4).toFixed(1)}s;animation-delay:-${(rnd() * 5).toFixed(1)}s"></span>`;
    }).join("");
};

const ambientHtml = /*html*/`
    <div class="ambient-sky"></div>
    <div class="ambient-stars">${stars(STAR_COUNT, 11)}</div>
    <div class="shooting-star top-[12%] right-[-60px]"></div>
    <div class="sun-flare"><div class="sun-rays"></div><div class="sun-core"></div></div>
    <div class="light-beam left-[20%] w-[260px]"></div>
    <div class="light-beam left-[62%] w-[180px] [animation-delay:-7s]"></div>
    <div class="mouse-light"></div>
`;

/** Adds the background once, before the app draws */
function mountAmbient() {
    if (document.getElementById("ambient")) return;
    const layer = document.createElement("div");
    layer.id = "ambient";
    layer.setAttribute("aria-hidden", "true");
    layer.innerHTML = ambientHtml;
    document.body.prepend(layer);
}

/** A small set of stars to place inside a card (absolute, fills the card) */
const miniStars = (seed = 5) => /*html*/`<div class="absolute inset-0 -z-10" aria-hidden="true">${stars(8, seed)}</div>`;

export { mountAmbient, miniStars };
