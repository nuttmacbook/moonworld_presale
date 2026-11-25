/*
 * YOUR CODE (off-chain). Small footer: link back to the main site, support email, social icons (only those set).
 */

import { settings } from "../../../engine/settings";
import { project } from "../../settings";
import { t } from "../../lang";
import { icons } from "./icons";

const SOCIALS = [
    [ "telegram", "Telegram" ],
    [ "facebook", "Facebook" ],
    [ "youtube", "YouTube" ],
];

const socialLinks = () => SOCIALS
    .filter(([ key ]) => project.socials?.[key])
    .map(([ key, label ]) => /*html*/`<a href="${project.socials[key]}" target="_blank" rel="noopener" aria-label="${label}" class="glass grid size-10 place-items-center rounded-xl text-[#d6d0ff] hover:text-gold-200">${icons[key]("size-4")}</a>`)
    .join("");

// Built on each paint so the language can change
const footer = () => /*html*/`
    <footer class="relative z-[2] border-t border-[#a096ff]/15 bg-[#050516]/75">
        <div class="mx-auto flex w-full max-w-[1400px] flex-wrap 2xl:max-w-[1680px] items-center justify-between gap-4 px-4 py-5 text-xs text-[#a9a4d8] sm:px-6 lg:px-10">
            <a href="${project.landingUrl}" class="text-[#d6d0ff] hover:text-gold-200">${t("Back to {name}", { name: settings.appName })}</a>
            <div class="flex gap-2">${socialLinks()}</div>
            <a href="mailto:${project.supportEmail}" class="text-gold-300 hover:text-gold-100">${project.supportEmail}</a>
        </div>
    </footer>
`;

export { footer };
