/*
 * YOUR CODE (off-chain). The website in one place:
 *   1. which pages exist
 *   2. what each button does
 * Blockchain work comes from src/project/chain (imported, never written here).
 * Drawing, wallet changes, loading and transactions are handled by src/engine/ui/app.js. Settings live in settings/.env.
 */

import "./main.css";
import { startApp, openWallet } from "../../engine/ui/app";
import { getClaimData, claimTokens } from "../chain";
import { setLang, t } from "../lang";
import { header } from "./componants/header";
import { footer } from "./componants/footer";
import { notify } from "./componants/toast";
import { mountAmbient } from "./componants/ambient";
import { mountEffects } from "./componants/effects";
import { isMaintenance, showMaintenance } from "./componants/maintenance";
import { claimPage, claimLoading, claimError } from "./pages/claim";

/* ------------------------------------ 1. pages (the first one opens by default; others at #/name) */

// The engine joins `loading` and `footer` as plain text. Objects with toString() do not survive the production build
// (the minifier turned `{ toString: footer }` into `{}` → "[object Object]"), so pass strings and draw the footer in its own box.
const pages = {
    claim: { load: getClaimData, view: claimPage, loading: claimLoading(), error: claimError },
};

mountAmbient();
const isClosed = isMaintenance();
if (isClosed) showMaintenance();
/** The footer lives right after #app (not inside it), so a language change can redraw it on its own */
const drawFooter = () => {
    let box = document.getElementById("site-footer");
    if (!box) {
        box = document.createElement("div");
        box.id = "site-footer";
        document.getElementById("app")?.after(box);
    }
    box.innerHTML = footer();
};

drawFooter();
const app = isClosed ? null : startApp({ pages, header, footer: "", notify });
if (app) mountEffects();

/* ------------------------------------ 2. buttons (called from onclick="..." in the pages) */

window.openWallet = openWallet;
window.refreshPage = () => app?.refresh({ fresh: true });

window.doClaim = () => app?.runTx(claimTokens, {
    title: t("Tokens claimed"),
    desc: t("Your unlocked MWLD are in your wallet. More unlocks every day."),
});

window.setLanguage = (code) => {
    setLang(code);
    drawFooter();
    document.querySelectorAll("details.lang-menu").forEach((el) => el.removeAttribute("open"));
    if (app) app.refresh({ quiet: true });
    else showMaintenance();
};

// Close the language menu when clicking anywhere else
document.addEventListener("click", (e) => {
    document.querySelectorAll("details.lang-menu[open]").forEach((menu) => {
        if (!menu.contains(e.target)) menu.removeAttribute("open");
    });
});
