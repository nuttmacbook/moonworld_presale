/*
 * YOUR CODE (off-chain). Languages. English is written in the code through t("English", { vars });
 * other languages are dictionaries keyed by that English text. A missing translation shows English.
 * Add a language = one row in LANGUAGES + one file.
 */

import { TH } from "./th";

const LANGUAGES = [
    { code: "en", label: "English", short: "EN", dict: {}, locale: "en-US" },
    { code: "th", label: "ไทย", short: "TH", dict: TH, locale: "th-TH-u-ca-gregory" },
];
const STORAGE_KEY = "moonworld.lang";

const find = (code) => LANGUAGES.find((l) => l.code === code) ?? LANGUAGES[0];

let current = (() => {
    try { return find(localStorage.getItem(STORAGE_KEY)); } catch { return LANGUAGES[0]; }
})();
if (typeof document !== "undefined") document.documentElement.lang = current.code;

/** Translated text with {name} placeholders filled from vars */
const t = (english, vars = {}) => {
    const text = current.dict?.[english] ?? english;
    return text.replace(/\{(\w+)\}/g, (_, key) => String(vars?.[key] ?? `{${key}}`));
};

/** Switches language and remembers it in this browser */
const setLang = (code) => {
    current = find(code);
    try { localStorage.setItem(STORAGE_KEY, current.code); } catch {}
    document.documentElement.lang = current.code;
};

const lang = () => current;

export { LANGUAGES, t, setLang, lang };
