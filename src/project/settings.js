/*
 * YOUR CODE (off-chain). This project's own values from settings/.env (the engine reads the common ones).
 * No fallback values: a missing or malformed value is added to the engine's problem list,
 * so the page shows "Setup is not finished" instead of guessing.
 */

import { addProblem } from "../engine/settings";

const env = import.meta.env;
const text = (key) => String(env[key] ?? "").trim();
const isAddress = (value) => /^0x[0-9a-fA-F]{40}$/.test(value);

const project = {
    description: text("VITE_APP_DESCRIPTION"),
    maintenance: text("VITE_MAINTENANCE"),
    maintenanceMessage: text("VITE_MAINTENANCE_MESSAGE"),
    maintenanceBypass: text("VITE_MAINTENANCE_BYPASS"),

    tokenAddress: text("VITE_TOKEN_ADDRESS"),
    claimContract: text("VITE_CLAIM_CONTRACT"),
    presaleContract: text("VITE_PRESALE_CONTRACT"),
    paymentToken: text("VITE_PAYMENT_TOKEN"),

    landingUrl: text("VITE_LANDING_URL"),
    supportEmail: text("VITE_SUPPORT_EMAIL"),
    socials: {
        telegram: text("VITE_TELEGRAM_URL"),
        facebook: text("VITE_FACEBOOK_URL"),
        youtube: text("VITE_YOUTUBE_URL"),
    },
};

/* ------------------------------------ checks */

[ "VITE_APP_DESCRIPTION", "VITE_SITE_URL", "VITE_TOKEN_ADDRESS", "VITE_CLAIM_CONTRACT", "VITE_PRESALE_CONTRACT", "VITE_PAYMENT_TOKEN", "VITE_LANDING_URL", "VITE_SUPPORT_EMAIL" ]
    .filter((key) => !text(key)).forEach((key) => addProblem(`${key} is not set in settings/.env.`));

[ "VITE_TOKEN_ADDRESS", "VITE_CLAIM_CONTRACT", "VITE_PRESALE_CONTRACT", "VITE_PAYMENT_TOKEN" ]
    .filter((key) => text(key) && !isAddress(text(key))).forEach((key) => addProblem(`${key} in settings/.env is not an address.`));

if (![ "on", "off" ].includes(project.maintenance)) addProblem("VITE_MAINTENANCE in settings/.env must be on or off.");

export { project };
