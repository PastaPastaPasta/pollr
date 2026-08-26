// Contract IDs
export const POLLR_CONTRACT_ID = '8R4SgHyxrEZCb5yBb6p4gtT3g1CSRv5GAM4Rehc1vQJq' // Testnet (v2 schema)

/**
 * The original v1 Pollr contract.
 *
 * v1 polls stored the question and options as JSON inside byte arrays and recorded one vote
 * document per voter. The app no longer reads or writes it: that data is abandoned in place.
 * The ID is kept so a future read-only archive view could surface the old polls.
 */
export const LEGACY_POLLR_CONTRACT_ID = '7Xye3k1MuVYTpLuTnein5GLwR1NUjmt5gtLLp4pGhhRf' // Testnet (v1 schema)

export const DPNS_CONTRACT_ID = 'GWRSAVFMjXx8HpQFaNJMqBV7MBgMK4br5UESsB4S31Ec' // Testnet

// App URL
export const APP_URL = 'https://pollr.app' // Placeholder

// Network configuration
export const DEFAULT_NETWORK = 'testnet'

// DPNS document type
export const DPNS_DOCUMENT_TYPE = 'domain'

// Document types
export const DOCUMENT_TYPES = {
  POLL: 'poll',
  VOTE: 'vote',
} as const
