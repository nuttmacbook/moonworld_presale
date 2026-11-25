/*
 * YOUR CODE (off-chain, design). Page motion that survives redraws:
 *   - mouse position → CSS variables --nx/--ny (-1..1) and --mx/--my (px) on <html>, used by the
 *     3D tilt, parallax planets and the mouse light (all in main.css, no redraw needed)
 *   - numbers count up from 0 when they scroll into view: [data-count] (text) and [data-grow] (--p for bars/rings)
 *   - scroll → --scroll (px), --vel (0..1 speed, stretches the stars), --hero (0..1 through the hero),
 *     --progress (0..1 of the page) on <html>, and --v / --va (place in the window) on each [data-depth] section
 *   - [data-reveal] blocks fly in once, in 3D, when they first scroll into view
 * Respects prefers-reduced-motion (no tilt, no scroll motion, everything shown at once).
 */

const DURATION = 1800;
const ease = (p) => 1 - Math.pow(1 - p, 3);
const isCalm = () => window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

/* ------------------------------------ mouse → CSS variables */

function trackPointer() {
    const root = document.documentElement;
    let frame = 0;
    let last = null;
    window.addEventListener("pointermove", (e) => {
        if (e.pointerType !== "mouse" || isCalm()) return;
        last = e;
        if (frame) return;
        frame = requestAnimationFrame(() => {
            frame = 0;
            const w = window.innerWidth || 1;
            const h = window.innerHeight || 1;
            root.style.setProperty("--nx", ((last.clientX / w) * 2 - 1).toFixed(3));
            root.style.setProperty("--ny", ((last.clientY / h) * 2 - 1).toFixed(3));
            root.style.setProperty("--mx", `${last.clientX}px`);
            root.style.setProperty("--my", `${last.clientY}px`);
        });
    }, { passive: true });
}

/* ------------------------------------ count up */

const format = (value, decimals) => Number(value).toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

/** Draws one element at progress p (0..1) */
const draw = (el, p) => {
    if (el.dataset.count !== undefined) {
        const to = Number(el.dataset.count);
        const decimals = Number(el.dataset.decimals ?? 0);
        el.textContent = `${el.dataset.prefix ?? ""}${format(to * p, decimals)}${el.dataset.suffix ?? ""}`;
    }
    if (el.dataset.grow !== undefined) el.style.setProperty("--p", String(Number(el.dataset.grow) * p));
};

const animate = (el) => {
    const start = performance.now();
    const step = (now) => {
        const p = Math.min(1, (now - start) / DURATION);
        draw(el, ease(p));
        if (p < 1 && el.isConnected) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
};

function watchNumbers() {
    const app = document.getElementById("app");
    if (!app) return;
    const seen = new WeakSet();
    const observer = typeof IntersectionObserver === "undefined" ? null : new IntersectionObserver((entries) => {
        entries.filter((en) => en.isIntersecting).forEach((en) => {
            observer.unobserve(en.target);
            animate(en.target);
        });
    }, { threshold: 0.2 });

    // New page HTML arrives with final values; set them to 0 before paint, then count when visible
    const scan = () => {
        app.querySelectorAll("[data-count], [data-grow]").forEach((el) => {
            if (seen.has(el)) return;
            seen.add(el);
            if (!observer || isCalm()) return;
            draw(el, 0);
            observer.observe(el);
        });
    };
    new MutationObserver(scan).observe(app, { childList: true, subtree: true });
    scan();
}

/* ------------------------------------ scroll */

function trackScroll() {
    const root = document.documentElement;
    let lastY = window.scrollY;
    let lastT = performance.now();
    let vel = 0;
    let frame = 0;

    const update = () => {
        frame = 0;
        const y = window.scrollY;
        const now = performance.now();
        const speed = Math.abs(y - lastY) / Math.max(16, now - lastT); // px per ms
        vel = vel * 0.8 + Math.min(1, speed / 4) * 0.2;
        lastY = y;
        lastT = now;

        const h = window.innerHeight || 1;
        const hero = document.getElementById("top");
        const heroHeight = hero?.offsetHeight || h;
        const max = Math.max(1, root.scrollHeight - h);
        root.style.setProperty("--scroll", `${y.toFixed(0)}px`);
        root.style.setProperty("--sn", y.toFixed(0));
        root.style.setProperty("--vel", vel.toFixed(3));
        root.style.setProperty("--hero", Math.min(1, y / heroHeight).toFixed(3));
        root.style.setProperty("--progress", Math.min(1, y / max).toFixed(4));

        // Each section bends a little by where it is: above the middle leans one way, below the other
        document.querySelectorAll("[data-depth]").forEach((el) => {
            const box = el.getBoundingClientRect();
            if (box.bottom < -200 || box.top > h + 200) return;
            const v = Math.max(-1, Math.min(1, (box.top + box.height / 2 - h / 2) / h));
            el.style.setProperty("--v", v.toFixed(3));
            el.style.setProperty("--va", Math.abs(v).toFixed(3));
        });

        // Anything the reader has reached or jumped past is shown (fast jumps can skip the observer)
        document.querySelectorAll(".js-reveal [data-reveal]:not(.in)").forEach((el) => {
            if (el.getBoundingClientRect().top < h * 0.94) el.classList.add("in");
        });

        // Keep easing the speed back to 0 after the last scroll event
        if (vel > 0.002) frame = requestAnimationFrame(update);
        else root.style.setProperty("--vel", "0");
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });
    new MutationObserver(schedule).observe(document.getElementById("app") ?? document.body, { childList: true });
    schedule();
}

/* ------------------------------------ reveal */

function watchReveal() {
    const app = document.getElementById("app");
    if (!app || typeof IntersectionObserver === "undefined") return;
    document.documentElement.classList.add("js-reveal");
    const shown = new Set(); // ids already revealed, so a redraw does not replay them
    const observer = new IntersectionObserver((entries) => {
        entries.filter((en) => en.isIntersecting).forEach((en) => {
            shown.add(en.target.dataset.reveal);
            en.target.classList.add("in");
            observer.unobserve(en.target);
        });
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    const scan = () => app.querySelectorAll("[data-reveal]:not(.in)").forEach((el) => {
        if (shown.has(el.dataset.reveal)) el.classList.add("in", "instant");
        else observer.observe(el);
    });
    new MutationObserver(scan).observe(app, { childList: true, subtree: true });
    scan();
}

/* ------------------------------------ light on cards */

/** Moves the border light of the card under the mouse (.glow uses --cx / --cy) */
function trackCardLight() {
    let frame = 0;
    let last = null;
    document.addEventListener("pointermove", (e) => {
        if (e.pointerType !== "mouse") return;
        last = e;
        if (frame) return;
        frame = requestAnimationFrame(() => {
            frame = 0;
            const card = last.target?.closest?.(".glow");
            if (!card) return;
            const box = card.getBoundingClientRect();
            card.style.setProperty("--cx", `${(last.clientX - box.left).toFixed(0)}px`);
            card.style.setProperty("--cy", `${(last.clientY - box.top).toFixed(0)}px`);
            // Tilt toward the mouse (used while the card is hovered)
            const px = (last.clientX - box.left) / (box.width || 1) - 0.5;
            const py = (last.clientY - box.top) / (box.height || 1) - 0.5;
            card.style.setProperty("--ry", `${(px * 14).toFixed(2)}deg`);
            card.style.setProperty("--rx", `${(-py * 12).toFixed(2)}deg`);
        });
    }, { passive: true });
}

/** Starts pointer tracking and number animation once */
function mountEffects() {
    watchNumbers();
    if (isCalm()) return;
    trackPointer();
    trackCardLight();
    trackScroll();
    watchReveal();
}

export { mountEffects };
