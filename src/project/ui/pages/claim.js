/*
 * YOUR CODE (off-chain). The claim page: one screen with the same details as the old presale page
 * (bought, balance, allocated tokens, referrer reward and bonus, unlocked, claimed) and the Claim button.
 * Desktop: claim panel left, number tiles right, filling the window; phones: one column.
 * The landing page explains the project, so nothing more is written here.
 * `data` comes from getClaimData() in src/project/chain.
 */

import { escapeHtml as escape } from "../../../engine/ui/helpers";
import { t } from "../../lang";
import { icons } from "../componants/icons";
import { planet } from "../componants/planet";
import { grid } from "../componants/decor";
import { miniStars } from "../componants/ambient";

/* ------------------------------------ small helpers */

const fmt = (value, decimals = 2) => Number(value ?? 0).toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

/** BigInt amount → plain number of whole tokens (display only; contract math stays in BigInt) */
const units = (value, decimals) => {
    const base = 10n ** BigInt(Math.max(0, Number(decimals ?? 0)));
    const v = BigInt(value ?? 0n);
    return Number(v / base) + Number(v % base) / Number(base);
};

/** A number that counts up when shown (the final value is in the HTML) */
const counter = (value, { decimals = 2, prefix = "", suffix = "" } = {}) =>
    /*html*/`<span data-count="${value}" data-decimals="${decimals}" data-prefix="${prefix}" data-suffix="${suffix}" class="tabular-nums">${prefix}${fmt(value, decimals)}${suffix}</span>`;

const pct = (part, whole) => (whole > 0n ? Number((part * 10000n) / whole) / 100 : 0);

let revealCount = 0;
const rv = (delay = 0) => `data-reveal="r${++revealCount}" style="--d:${delay}ms"`;

/** One number tile: label, big value + unit, optional badge, optional accent */
const tile = ({ label, value, unit, badge = "", accent = "", delay = 0 }) => /*html*/`
    <div class="lift" ${rv(delay)}><div class="lift-in glass glow relative isolate flex min-h-28 flex-col justify-between gap-2 overflow-hidden rounded-3xl p-5 lg:min-h-0 ${accent}">
        ${grid({ size: 22, reach: 60 })}
        <div class="flex items-center justify-between gap-2"><p class="label">${label}</p>${badge}</div>
        <p class="flex items-baseline gap-2 whitespace-nowrap font-display text-2xl font-black xl:text-[28px] 2xl:text-4xl">${value}<span class="text-xs font-semibold text-[#a9a4d8]">${unit}</span></p>
    </div></div>
`;

/** "Claimed" badge next to the rewards once the wallet has claimed (as on the old presale page) */
const paidBadge = (isOn) => (isOn ? /*html*/`<span class="pill border-emerald-300/50 bg-emerald-400/10 text-emerald-300">${t("Claimed")}</span>` : "");

/* ------------------------------------ claim panel (left) */

const panel = (data, v) => {
    const { isLoading, isConnected, p, sym, claimable, unlockedPct, claimedPct, noAllocation } = v;
    const action = !isConnected
        ? /*html*/`<button type="button" onclick="openWallet()" class="btn-gold w-full">${t("Connect wallet")}${icons.arrow()}</button>`
        : noAllocation
            ? /*html*/`<p class="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-center text-sm text-[#c4c0ee]">${t("This wallet has no presale allocation. Switch to the wallet you bought with.")}</p>`
            : /*html*/`<button type="button" onclick="doClaim()" ${claimable > 0n ? "" : "disabled"} class="btn-gold w-full disabled:cursor-not-allowed disabled:opacity-45 disabled:[animation:none]">
                ${claimable > 0n ? t("Claim {amount} {symbol}", { amount: fmt(units(claimable, v.d)), symbol: sym }) : t("Nothing to claim yet")}
            </button>`;

    return /*html*/`
        <div ${rv(80)} class="glass-gold glow relative isolate flex h-full flex-col overflow-hidden rounded-[2rem]">
            <!-- Space banner -->
            <div class="relative isolate flex h-44 shrink-0 items-center justify-between overflow-hidden border-b border-gold-300/25 bg-[radial-gradient(circle_at_50%_130%,rgb(124_58_237/0.5),transparent_70%)] px-7 xl:h-52">
                ${miniStars(9)}
                ${isConnected ? /*html*/`<button type="button" onclick="refreshPage()" class="absolute right-4 top-3 z-[2] rounded-lg bg-black/40 px-2.5 py-1 text-xs font-semibold text-[#d6d0ff] hover:text-gold-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-300">${t("Refresh")}</button>` : ""}
                <div class="absolute -left-12 -top-16 -z-10 size-44 opacity-80" aria-hidden="true">${planet("gas", { spin: 60 })}</div>
                <div class="absolute -bottom-24 right-24 -z-10 size-44 opacity-80" aria-hidden="true">${planet("pink", { hasRing: true, spin: 45 })}</div>
                <div class="relative flex flex-col gap-2">
                    <p class="eyebrow">${icons.sparkle()}${t("Presale claim")}</p>
                    <h1 class="font-display text-3xl font-black uppercase leading-none [text-shadow:0_0_40px_rgb(124_58_237/0.7)] sm:text-4xl xl:text-5xl">${t("Claim")} <span class="gold-text">$${sym}</span></h1>
                </div>
                <div class="tilt-coin relative size-24 shrink-0 sm:size-32">
                    <div class="orbit-dashed spin-slow absolute -inset-3"></div>
                    <div class="coin-halo"></div>
                    <img src="/coin.webp" alt="${sym}" class="float relative size-full" width="400" height="400" />
                </div>
            </div>

            <div class="relative isolate flex flex-1 flex-col justify-center gap-6 p-6 sm:p-8">
                ${grid({ at: "0% 100%", size: 26, reach: 50 })}
                <div class="flex flex-wrap items-center gap-6 sm:gap-8 lg:flex-nowrap">
                    <div class="claim-ring claim-ring-lg" data-grow="1" style="--p:1; --c:${claimedPct}; --u:${unlockedPct}" role="img" aria-label="${t("{unlocked}% unlocked, {claimed}% claimed", { unlocked: fmt(unlockedPct, 1), claimed: fmt(claimedPct, 1) })}">
                        <div class="donut-hole">
                            <span class="font-display text-2xl font-black text-gold-100 [text-shadow:0_0_16px_rgb(255_196_64/0.6)] sm:text-3xl">${isConnected && p ? counter(unlockedPct, { decimals: 1, suffix: "%" }) : "0%"}</span>
                            <span class="label">${t("Unlocked")}</span>
                        </div>
                    </div>
                    <div class="flex min-w-0 flex-col gap-1.5">
                        <p class="label">${t("Ready to claim")}</p>
                        <p class="whitespace-nowrap font-display text-3xl font-black text-gold-100 [text-shadow:0_0_26px_rgb(255_196_64/0.55)] sm:text-5xl">${isLoading ? "…" : v.tokens(claimable)}</p>
                        <p class="font-display text-base font-bold text-gold-300">$${sym}</p>
                        <div class="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-[#a9a4d8]">
                            <span class="flex items-center gap-2"><i class="swatch-gold"></i>${t("Claimed")}</span>
                            <span class="flex items-center gap-2"><i class="swatch-bright"></i>${t("Ready")}</span>
                            <span class="flex items-center gap-2"><i class="swatch-dim"></i>${t("Locked")}</span>
                        </div>
                    </div>
                </div>
                ${isLoading ? /*html*/`<div class="skeleton h-14 rounded-2xl" aria-busy="true"></div>` : action}
            </div>
        </div>
    `;
};

/* ------------------------------------ number tiles (right) */

const tiles = (data, v) => {
    const { p, sym, paySym, hasClaimed } = v;
    const gold = "border-gold-300/45";
    return /*html*/`
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:h-full lg:grid-rows-4">
            ${tile({ label: t("Bought"), value: v.dollars(data?.buyer?.bought), unit: paySym, delay: 120 })}
            ${tile({ label: t("Balance"), value: v.dollars(data?.paymentBalance), unit: paySym, delay: 180 })}
            ${tile({ label: t("Your allocated tokens"), value: v.tokens(p?.supply ?? 0n), unit: sym, accent: gold, delay: 240 })}
            ${tile({ label: t("Still locked"), value: v.tokens(p?.locked ?? 0n), unit: sym, delay: 300 })}
            ${tile({ label: t("Total unlocked"), value: v.tokens(p?.unlocked ?? 0n), unit: sym, delay: 360 })}
            ${tile({ label: t("Total claimed"), value: v.tokens(p?.claimed ?? 0n), unit: sym, accent: gold, delay: 420 })}
            ${tile({ label: t("Referrer reward"), value: v.dollars(p?.refReward), unit: paySym, badge: paidBadge(hasClaimed && (p?.refReward ?? 0n) > 0n), delay: 480 })}
            ${tile({ label: t("Referrer bonus"), value: v.dollars(p?.kolReward), unit: paySym, badge: paidBadge(hasClaimed && (p?.kolReward ?? 0n) > 0n), delay: 540 })}
        </div>
    `;
};

/* ------------------------------------ page */

/** Values both halves use */
const viewOf = (data) => {
    const isConnected = Boolean(data?.isConnected);
    const p = data?.personal ?? null;
    const d = data?.token?.decimals ?? 18;
    const pd = data?.payment?.decimals ?? 18;
    return {
        isLoading: Boolean(data?.isLoading),
        isConnected, p, d,
        sym: escape(data?.token?.symbol || "MWLD"),
        paySym: escape(data?.payment?.symbol || "USDT"),
        claimable: p?.claimable ?? 0n,
        unlockedPct: p ? pct(p.unlocked, p.supply) : 0,
        claimedPct: p ? pct(p.claimed, p.supply) : 0,
        hasClaimed: (p?.claimed ?? 0n) > 0n,
        noAllocation: Boolean(isConnected && p && p.supply <= 0n),
        tokens: (value) => (isConnected && p ? counter(units(value, d)) : "0.00"),
        dollars: (value) => (isConnected && value !== null && value !== undefined ? counter(units(value, pd), { prefix: "$" }) : "$0.00"),
    };
};

/**
 * The claim page.
 *
 * @param {object|null} data  getClaimData() result, or { isLoading: true } while loading
 * @param {object} options    { notice } html shown above the panels
 */
const claimPage = (data, { notice = "" } = {}) => {
    revealCount = 0;
    const v = viewOf(data);
    return /*html*/`
        <main class="relative overflow-x-clip">
            <section id="claim" class="relative z-[2] mx-auto flex w-full max-w-[1400px] flex-col justify-center 2xl:max-w-[1680px] gap-5 px-4 py-8 sm:px-6 lg:h-[calc(100dvh-8.5rem)] lg:min-h-[600px] lg:px-10 lg:py-6">
                ${notice}
                <div class="grid grid-cols-1 gap-5 lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] xl:gap-6">
                    <div class="relative [perspective:1100px] lg:min-h-0">${panel(data, v)}</div>
                    <div class="lg:min-h-0">${tiles(data, v)}</div>
                </div>
            </section>
            <div class="grid-floor" aria-hidden="true"><div></div></div>
        </main>
    `;
};

const claimLoading = () => claimPage({ isLoading: true });

const claimError = (message) => claimPage(null, {
    notice: /*html*/`
        <div class="w-full" role="alert">
            <div class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                <span>${t("Your claim data could not load.")} ${escape(message)}</span>
                <button type="button" onclick="refreshPage()" class="rounded-lg bg-white/10 px-3 py-2 text-[13px] font-semibold hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300">${t("Try again")}</button>
            </div>
        </div>
    `,
});

export { claimPage, claimLoading, claimError };
