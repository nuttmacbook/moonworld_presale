/*
 * ENGINE (same in every project, do not edit).
 *
 * Building blocks for dev/settings/deploy.config.mjs, so each contract is one short entry however many there are:
 *
 *   ...proxied({ name: "Staking", init: (ctx) => [ ctx.owner, ... ] })   logic + BaseProxyUsed, initialized in one tx
 *   plain({ name: "Helper", args: (ctx) => [ ... ] })                    a contract without a proxy
 *
 * The same list runs on the local test chain (dev/engine/local-chain.mjs) and on a real chain (deploy-live.mjs).
 */

const same = (a, b) => String(a ?? "").toLowerCase() === String(b ?? "").toLowerCase();

/**
 * A logic contract behind BaseProxyUsed. Gives two steps: "<name>Implementation" (the logic) and "<name>" (the proxy,
 * which users and the website talk to). The proxy's admin ends up as ctx.owner.
 *
 * @param {object} options
 * @param {string} options.name          contract name (also the key in addresses.json)
 * @param {string} options.logic         compiled contract to deploy as logic (default: name)
 * @param {string} options.initializer   function run inside the proxy's constructor (default "initialize")
 * @param {Function} options.init        (ctx) => arguments for the initializer
 * @param {Function} options.readBack    async (contract, ctx) => extra values to record (contract = logic ABI at the proxy)
 * @param {Function} options.check       (state, ctx) => true, or a message when something is wrong
 * @returns {object[]} two steps
 */
function proxied({ name, logic = name, initializer = "initialize", init = () => [], readBack = async () => ({}), check = () => true }) {
    const implementation = `${name}Implementation`;
    return [
        // Logic only: holds no state of its own and is never called directly
        { key: implementation, contract: logic, args: () => [] },

        {
            key: name,
            contract: "BaseProxyUsed",
            abi: logic,
            implementation,
            args: async (ctx) => [ ctx.addresses[implementation], ctx.encode(logic, initializer, await init(ctx)) ],
            // The deployer is the proxy admin after the constructor; the owner holds that role
            setup: (contract, ctx) => (same(ctx.owner, ctx.deployer) ? null : ctx.at("BaseProxyUsed", contract.target).transferAdmin(ctx.owner)),
            readBack: async (contract, ctx) => {
                const proxy = ctx.at("BaseProxyUsed", contract.target);
                return { admin: await proxy.admin(), implementation: await proxy.implementation(), ...(await readBack(contract, ctx)) };
            },
            verify: (state, ctx) => {
                if (!same(state.admin, ctx.owner)) return `Proxy admin of ${name} is ${state.admin}, expected ${ctx.owner}.`;
                if (!same(state.implementation, ctx.addresses[implementation])) return `${name} points at the wrong logic.`;
                return check(state, ctx);
            },
        },
    ];
}

/**
 * A contract deployed as is (no proxy, cannot be upgraded).
 *
 * @param {object} options
 * @param {string} options.name       key in addresses.json
 * @param {string} options.contract   compiled contract (default: name)
 * @param {Function} options.args     (ctx) => constructor arguments
 * @param {Function} options.setup    (contract, ctx) => transaction sent right after, or null
 * @param {Function} options.readBack async (contract, ctx) => values to record
 * @param {Function} options.check    (state, ctx) => true, or a message
 * @returns {object} one step
 */
function plain({ name, contract = name, args = () => [], setup = null, readBack = async () => ({}), check = () => true }) {
    return { key: name, contract, args, setup, readBack, verify: check };
}

/** Fills in defaults so every step has key, contract and abi */
const normalizeSteps = (config) => (config?.contracts ?? []).flat().map((step) => ({
    ...step,
    contract: step.contract ?? step.key,
    abi: step.abi ?? step.contract ?? step.key,
}));

/** requiredCode can be an object or (settings) => object */
const requiredCodeOf = (config, settings) => (typeof config?.requiredCode === "function" ? config.requiredCode(settings) : config?.requiredCode ?? {});

export { proxied, plain, normalizeSteps, requiredCodeOf };
