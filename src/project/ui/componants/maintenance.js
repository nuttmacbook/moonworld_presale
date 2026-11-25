/*
 * YOUR CODE (off-chain). Maintenance page (VITE_MAINTENANCE=on): one page, no wallet, no RPC.
 * ?bypass=<VITE_MAINTENANCE_BYPASS> shows the real site in this tab (remembered in sessionStorage).
 * The bypass word is in the public JavaScript: it only keeps ordinary visitors out.
 */

import { settings } from "../../../engine/settings";
import { project } from "../../settings";
import { t } from "../../lang";
import { escapeHtml } from "../../../engine/ui/helpers";

const BYPASS_KEY = "moonworld.bypass";

/** True when the site should show the maintenance page in this tab */
function isMaintenance() {
    if (project.maintenance !== "on") return false;
    const word = new URLSearchParams(window.location.search).get("bypass");
    try {
        if (word && project.maintenanceBypass && word === project.maintenanceBypass) sessionStorage.setItem(BYPASS_KEY, "1");
        if (sessionStorage.getItem(BYPASS_KEY) === "1") return false;
    } catch {}
    return true;
}

/** Draws the maintenance page into #app */
function showMaintenance() {
    const root = document.getElementById("app");
    if (!root) return;
    const message = project.maintenanceMessage || t("The website is being updated. Please check back soon.");
    root.innerHTML = /*html*/`
        <main class="relative z-[2] mx-auto grid min-h-dvh w-full max-w-2xl place-items-center px-4 py-16 text-center sm:px-6">
            <div class="glass flex flex-col items-center gap-5 rounded-3xl p-8 sm:p-12">
                <img src="/brand.webp" alt="${settings.appName}" class="brand-glow h-14 w-auto sm:h-20" width="1000" height="250" />
                <h1 class="font-display text-2xl font-black sm:text-3xl">${t("We are updating {name}", { name: escapeHtml(settings.appName) })}</h1>
                <p class="text-[#c4c0ee]">${escapeHtml(message)}</p>
                <p class="text-sm text-[#a9a4d8]">${t("Your tokens are safe on the blockchain. Nothing changes in your wallet.")}</p>
                <a href="mailto:${project.supportEmail}" class="text-gold-300 hover:text-gold-100">${project.supportEmail}</a>
            </div>
        </main>
    `;
}

export { isMaintenance, showMaintenance };
