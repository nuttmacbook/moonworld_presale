/*
 * ENGINE (same in every project, do not edit).
 *
 * Test panel in the corner of the page (local chain only). Rendered by src/engine/ui/app.js through devMode.
 * Two sections: common tools (every project) and "This project" (dev/project/devActions.js).
 */

import { meter } from "../../../src/engine/chain/rpcMeter";
import { formNumber, shortAddress, escapeHtml } from "../../../src/engine/ui/helpers";
import { testTokens } from "./devTools";

const OPEN_KEY = "dapp.local.panelOpen";

const isOpen = () => {
    try { return localStorage.getItem(OPEN_KEY) !== "0"; } catch { return true; }
};

if (typeof window !== "undefined") {
    window.devTogglePanel = () => {
        const panel = document.querySelector("[data-dev-panel]");
        const willHide = !panel?.classList.contains("hidden");
        panel?.classList.toggle("hidden", willHide);
        try { localStorage.setItem(OPEN_KEY, willHide ? "0" : "1"); } catch {}
    };
}

const button = (label, onclick, tone = "amber") => /*html*/`
    <button type="button" onclick="${onclick}"
        class="rounded-lg border px-2.5 py-1.5 text-[12px] font-semibold focus-visible:outline-none focus-visible:ring-2
        ${tone === "sky" ? "border-sky-300/20 bg-sky-400/10 text-sky-100 hover:bg-sky-400/20 focus-visible:ring-sky-300" : "border-amber-300/20 bg-amber-400/10 text-amber-100 hover:bg-amber-400/20 focus-visible:ring-amber-300"}">${escapeHtml(label)}</button>
`;

const row = (label, value) => /*html*/`
    <div class="flex justify-between gap-2"><span class="text-slate-400">${escapeHtml(label)}</span><span class="font-mono tabular-nums">${value}</span></div>
`;

const heading = (text) => /*html*/`<p class="mt-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">${escapeHtml(text)}</p>`;

/**
 * @param {object} options
 * @param {object} options.state    { wallet, isDemo, bnb, tokens: { SYMBOL: bigint }, time }
 * @param {object[]} options.common  [{ group, label }] common tools
 * @param {object[]} options.project [{ label }] this project's tools
 */
const testPanel = ({ state = {}, common = [], project = [] } = {}) => {
    const address = state?.wallet?.address;
    const groups = [ ...new Set(common.map((a) => a.group)) ];
    const calls = Object.entries(meter.calls ?? {});
    const time = state?.time ? new Date(state.time * 1000).toISOString().replace("T", " ").slice(0, 16) : "-";

    return /*html*/`
    <div class="pointer-events-none fixed bottom-4 left-4 z-40 flex max-w-[calc(100vw-2rem)] flex-col items-start gap-2">
        <div data-dev-panel class="pointer-events-auto max-h-[75vh] w-80 max-w-full overflow-y-auto rounded-2xl border border-amber-300/20 bg-slate-950/95 p-4 text-[12px] text-slate-200 shadow-2xl ring-1 ring-inset ring-amber-300/10 backdrop-blur ${isOpen() ? "" : "hidden"}">
            <p class="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-300">Local test chain</p>

            <!-- Active wallet -->
            <div class="mt-3 space-y-1">
                ${row("Wallet", `${address ? shortAddress(address) : "none"}${state?.isDemo ? " · demo" : ""}`)}
                ${row("BNB", formNumber(state?.bnb ?? 0n, 18, 4))}
                ${Object.entries(testTokens).map(([ symbol, t ]) => row(symbol, formNumber(state?.tokens?.[symbol] ?? 0n, t?.decimals ?? 0, 2))).join("")}
                ${row("Chain time (UTC)", time)}
            </div>

            <!-- Common tools -->
            ${groups.map((group) => /*html*/`
                ${heading(group)}
                <div class="mt-1.5 flex flex-wrap gap-2">
                    ${common.map((a, i) => (a.group === group ? button(a.label, `devCommon(${i})`) : "")).join("")}
                </div>
            `).join("")}

            <!-- This project's tools -->
            ${project.length ? /*html*/`
                ${heading("This project")}
                <div class="mt-1.5 flex flex-wrap gap-2">
                    ${project.map((a, i) => button(a?.label ?? `Action ${i + 1}`, `devProject(${i})`, "sky")).join("")}
                </div>
            ` : ""}

            <!-- RPC reads of this page -->
            <div class="mt-4 border-t border-white/10 pt-3">
                ${row(`RPC reads (${meter.page || "-"})`, `${meter.total} in ${meter.rounds} round${meter.rounds === 1 ? "" : "s"}`)}
                ${calls.map(([ id, n ]) => /*html*/`<div class="mt-1 flex justify-between gap-2 font-mono text-[11px] text-slate-400"><span class="truncate">${escapeHtml(id)}</span><span>${n}</span></div>`).join("")}
            </div>

            <p class="mt-3 text-[11px] text-slate-500">Rerun npm run dev in dev/ to start over with a fresh chain.</p>
        </div>
        <button type="button" onclick="devTogglePanel()"
            class="pointer-events-auto rounded-full border border-amber-300/30 bg-slate-950/90 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-200 shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300">Test panel</button>
    </div>
    `;
};

export { testPanel };
