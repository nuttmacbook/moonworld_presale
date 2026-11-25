/*
 * ENGINE (same in every project, do not edit).
 *
 * Entry that src/engine/ui/app.js loads only while VITE_CHAIN=local (import.meta.glob on /dev/engine/web/devMode.js).
 * Builds the test panel from two lists:
 *   - common tools, here (every project): gas, each test token, demo wallet, time
 *   - project tools, from dev/project/devActions.js (only this project)
 * Never part of a production build.
 */

import { setLatency } from "../../../src/engine/chain/rpcMeter";
import { LOCAL_RPC } from "../../../src/engine/chain/connect";
import * as tools from "./devTools";
import { testPanel } from "./testPanel";
import { devActions } from "../../project/devActions";

const DEMO_ON_KEY = "dapp.local.demoOn";
const HOUR = 3600;

/** Called by src/engine/ui/app.js; returns the hooks it uses */
export function install({ refresh, notify, invalidateReads }) {
    // A local node answers in a millisecond; this makes pages load like on a public RPC
    setLatency(String(import.meta.env.VITE_RPC_LATENCY).split("-").map(Number));

    let isDemo = false;
    try { isDemo = localStorage.getItem(DEMO_ON_KEY) === "1"; } catch {}
    let current;
    let panelState = {};

    /** Reads the active wallet's balances and the chain time for the panel (not counted in the page's RPC reads) */
    const loadPanelState = async () => {
        const [ money, time ] = await Promise.all([
            tools.balances(current?.address).catch(() => ({ bnb: 0n, tokens: {} })),
            tools.chainTime().catch(() => 0),
        ]);
        panelState = { wallet: current, isDemo: Boolean(current?.isDemo), ...money, time };
    };

    /** Runs a local-chain action with a progress toast, then reloads the panel and the page */
    const run = async (label, action) => {
        try {
            notify.progress({ title: label, desc: "Sending to the local chain…" });
            await action((desc) => notify.progress({ title: label, desc }));
            invalidateReads();
            await loadPanelState();
            await refresh({ quiet: true });
            notify.success({ title: label, desc: "Done on the local chain." });
        } catch (err) {
            console.error(err);
            notify.error(err);
        }
    };

    const setDemo = async (on) => {
        isDemo = Boolean(on);
        try { localStorage.setItem(DEMO_ON_KEY, isDemo ? "1" : "0"); } catch {}
        await refresh();
    };

    /* ------------------------------------ common tools (every project) */

    const commonActions = [
        { group: "Wallet", label: isDemo ? "Demo wallet: on" : "Demo wallet: off", run: () => setDemo(!isDemo), isInstant: true },
        { group: "Wallet", label: "New demo wallet", run: async () => { tools.resetDemoWallet(); await setDemo(true); }, isInstant: true },
        { group: "Money", label: `+${import.meta.env.VITE_DEV_FUND_GAS} BNB (gas)`, run: () => tools.fundGas(current?.address) },
        ...Object.keys(tools.testTokens).map((symbol) => ({
            group: "Money",
            label: `+${import.meta.env.VITE_DEV_FUND_AMOUNT} ${symbol}`,
            run: () => tools.fundToken(current?.address, symbol),
        })),
        { group: "Time", label: "+1 hour", run: () => tools.skipTime(HOUR) },
        { group: "Time", label: "+1 day", run: () => tools.skipTime(24 * HOUR) },
        { group: "Time", label: "+7 days", run: () => tools.skipTime(7 * 24 * HOUR) },
    ];

    // Labels that depend on state are rebuilt on every paint
    const common = () => commonActions.map((a, i) => (i === 0 ? { ...a, label: isDemo ? "Demo wallet: on" : "Demo wallet: off" } : a));

    window.devCommon = (index) => {
        const action = commonActions[index];
        if (!action) return;
        if (action.isInstant) return action.run();
        run(action.label, () => action.run());
    };

    /* ------------------------------------ project tools (dev/project/devActions.js) */

    window.devProject = (index) => {
        const action = devActions?.[index];
        if (action) run(action.label, (progress) => action.run({ ...tools, wallet: current }, progress));
    };

    return {
        // A connected wallet always wins; the demo wallet (a local key that signs real transactions) fills in otherwise
        wallet: (connected) => {
            const next = connected?.address ? connected : isDemo ? tools.demoWallet() : connected;
            if (next?.address !== current?.address) {
                current = next;
                loadPanelState().then(() => refresh({ quiet: true }));
            }
            current = next;
            return current;
        },
        panel: () => testPanel({ state: panelState, common: common(), project: devActions ?? [] }),
        downMessage: async () => ((await tools.isChainUp()) ? null : `The local chain at ${LOCAL_RPC} is not running. Start it from dev/ with npm run dev.`),
    };
}
