// Contract IDs
export const POLLR_CONTRACT_ID = 'GBCR8JqtXNMZa4B16ZAYm3RkNHrPcU3D36jcAoYWvr8E' // Testnet (v3 schema)

/**
 * Superseded Pollr contracts, abandoned in place. The app no longer reads or writes them; the
 * IDs are kept so they are never reused and a read-only archive view could still surface the
 * old polls.
 *
 * v1 stored the question and options as JSON inside byte arrays, with one vote document per
 * voter. v2 introduced count trees but had a single `vote` doctype unique on
 * (pollId, $ownerId, choice) — a rule that could not enforce single-choice ballots.
 */
export const LEGACY_POLLR_CONTRACT_IDS = [
  '7Xye3k1MuVYTpLuTnein5GLwR1NUjmt5gtLLp4pGhhRf', // v1
  '8R4SgHyxrEZCb5yBb6p4gtT3g1CSRv5GAM4Rehc1vQJq', // v2
] as const

export const DPNS_CONTRACT_ID = 'GWRSAVFMjXx8HpQFaNJMqBV7MBgMK4br5UESsB4S31Ec' // Testnet

// App URL
export const APP_URL = 'https://pollr.app' // Placeholder

// Network configuration
export const DEFAULT_NETWORK = 'testnet'

// DPNS document type
export const DPNS_DOCUMENT_TYPE = 'domain'

/**
 * Document types.
 *
 * `VOTE` and `MULTI_VOTE` are the two ballot doctypes. A poll's immutable `multiChoice` flag
 * picks which one holds its ballots, and each carries the uniqueness rule that mode needs:
 * `vote` is unique per (poll, voter), so Platform rejects a second single-choice selection;
 * `multiVote` is unique per (poll, voter, choice). Documents written to the doctype a poll
 * does not use are never read, so they cannot reach a tally.
 */
export const DOCUMENT_TYPES = {
  POLL: 'poll',
  VOTE: 'vote',
  MULTI_VOTE: 'multiVote',
} as const

/** The doctype holding a poll's ballots, chosen by its `multiChoice` flag. */
export function voteDocType(multiChoice: boolean): string {
  return multiChoice ? DOCUMENT_TYPES.MULTI_VOTE : DOCUMENT_TYPES.VOTE
}

// Poll schema limits, mirroring contracts/pollr-contract-v3.json
export const MIN_POLL_OPTIONS = 2
export const MAX_POLL_OPTIONS = 10
export const MAX_QUESTION_LENGTH = 512
export const MAX_OPTION_LENGTH = 100
