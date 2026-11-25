/*
 * SETTINGS: what gets deployed, in order. The same list runs on the local test chain (npm run dev, npm test)
 * and on a real chain (npm run deploy:live).
 *
 * Moon World landing page: no contract of its own. The site only reads the existing MWLD token
 * (VITE_TOKEN_ADDRESS in settings/.env). On the local chain, the test token in test-tokens.json stands in for it.
 * A contract added later goes here as ...proxied({ name, init, readBack, check }) (see the README).
 */

export default {
    // Contracts that must already exist on the target chain before deploying (none for this site)
    requiredCode: () => ({}),

    contracts: [],
};
