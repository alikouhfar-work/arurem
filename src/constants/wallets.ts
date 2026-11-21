/**
 * Sentinel for "no wallet" in a Select.
 *
 * Radix Select requires a non-empty string value, so an entry without a wallet
 * needs a token that cannot collide with a real id. Wallet ids are UUIDs, which
 * can never contain an underscore, so this is unambiguous by construction.
 */
export const NO_WALLET = '__none__';
