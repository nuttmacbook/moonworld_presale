/*
 * YOUR CODE (off-chain). Top bar: brand (links home to the landing page), language menu and the wallet button.
 * Section links scroll with goTo() instead of #anchors, because #/name is the app's page router.
 */

import { settings } from "../../../engine/settings";
import { shortAddress } from "../../../engine/ui/helpers";
import { project } from "../../settings";
import { t, LANGUAGES, lang } from "../../lang";
import { icons } from "./icons";

const languageMenu = () => /*html*/`
    <details class="lang-menu relative">
        <summary class="flex min-h-11 cursor-pointer list-none items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 text-xs font-semibold text-[#d6d0ff] hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-300" aria-label="${t("Language")}">
            ${icons.globe()}<span>${lang().short}</span>
        </summary>
        <div class="glass absolute right-0 z-40 mt-2 min-w-36 rounded-xl p-1.5">
            ${LANGUAGES.map((l) => /*html*/`
                <button type="button" onclick="setLanguage('${l.code}')" class="block w-full rounded-lg px-3 py-2 text-left text-sm ${l.code === lang().code ? "bg-white/10 text-gold-200" : "text-[#d6d0ff] hover:bg-white/5"}">${l.label}</button>
            `).join("")}
        </div>
    </details>
`;

/** Connect button, or the short address once connected (opens the wallet menu) */
const walletButton = (data) => {
    const address = data?.wallet?.address;
    const isDemo = Boolean(data?.wallet?.isDemo);
    return /*html*/`
        <button type="button" onclick="openWallet()" class="${address ? "btn-ghost-sm" : "btn-gold-sm"}" aria-label="${address ? t("Wallet menu") : t("Connect wallet")}">
            ${address ? /*html*/`<span class="size-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#4ade80]"></span><span class="font-mono normal-case tracking-normal">${shortAddress(address)}${isDemo ? " · demo" : ""}</span>` : t("Connect wallet")}
        </button>
    `;
};

const header = (data) => /*html*/`
    <header class="sticky top-0 z-30 border-b border-[#a096ff]/20 bg-[#080820]/60 backdrop-blur-xl">
        <div class="scroll-bar" aria-hidden="true"></div>
        <div class="mx-auto flex w-full max-w-[1400px] flex-wrap 2xl:max-w-[1680px] items-center justify-between gap-3 px-4 py-2.5 sm:px-6 lg:px-10">
            <a href="${project.landingUrl}" class="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-300" aria-label="${t("{name} home", { name: settings.appName })}">
                <img src="/brand.webp" alt="${settings.appName}" class="brand-glow h-10 w-auto sm:h-14" width="1000" height="250" />
            </a>
            <div class="flex items-center gap-2">
                ${languageMenu()}
                ${walletButton(data)}
            </div>
        </div>
    </header>
`;

export { header };
