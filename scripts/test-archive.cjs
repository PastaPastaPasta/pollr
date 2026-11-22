const ts = require('typescript')
const fs = require('node:fs')
const vm = require('node:vm')
const assert = require('node:assert/strict')
const path = require('node:path')
const root = path.resolve(__dirname, '..')
const source = ts.transpileModule(fs.readFileSync(path.join(root, 'lib/services/archive-service.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText
const mod = { exports: {} }
let failVotes = false
const id = 'p'.repeat(44), owner = 'o'.repeat(44)
const doc = { $id: id, $ownerId: owner, $createdAt: 1, pollType: 0, question: new TextEncoder().encode('Where should we meet?'), options: new TextEncoder().encode('["Here","There"]') }
const votes = [
  { pollId: id, $ownerId: owner, selectedOptions: Uint8Array.of(1, 255, 255) },
  { pollId: id, $ownerId: owner, selectedOptions: Uint8Array.of(0) },
  { pollId: id, $ownerId: 'other', selectedOptions: Uint8Array.of(0, 1) },
  { pollId: id, $ownerId: 'invalid', selectedOptions: Uint8Array.of(4) },
  { pollId: 'another-poll', $ownerId: 'unrelated', selectedOptions: Uint8Array.of(0) },
]
const sdk = { documents: { query: async args => {
  if (args.documentTypeName === 'vote' && failVotes) throw Error('offline')
  return args.documentTypeName === 'poll' ? [doc] : votes
} } }
const imports = {
  '@/lib/constants': { LEGACY_POLLR_CONTRACT_IDS: ['original'] },
  './evo-sdk-service': { getEvoSdk: async () => sdk },
  './sdk-helpers': { identifierToBase58: x => typeof x === 'string' ? x : null, normalizeSDKResponse: x => x, toUint8Array: x => x instanceof Uint8Array ? x : null },
  '@/lib/home-polls': { isPracticePoll: () => false },
}
vm.runInNewContext(source, { exports: mod.exports, require: name => imports[name], TextDecoder, Uint8Array, Set, Number, Promise, Array, JSON })
const { decodeArchivedPoll, archiveTally, readArchivedPolls } = mod.exports
const poll = decodeArchivedPoll(doc)
assert.equal(poll.question, 'Where should we meet?')
assert.equal(decodeArchivedPoll({ ...doc, options: new TextEncoder().encode('{"bad":1}') }), null)
assert.equal(decodeArchivedPoll({ ...doc, question: Uint8Array.of(255) }), null)
assert.deepEqual(Array.from(archiveTally(poll, votes).counts), [0, 1], 'Ignore duplicate voters, invalid choices, multi-choice single ballots and other polls')
assert.equal(archiveTally(poll, votes).ballots, 1)
assert.deepEqual(Array.from(archiveTally({ ...poll, multiChoice: true }, votes).counts), [1, 2])
;(async () => {
  assert.equal((await readArchivedPolls())[0].ballots, 1)
  failVotes = true
  const failed = (await readArchivedPolls())[0]
  assert.equal(failed.counts, null, 'A failed vote read is never a zero tally')
  assert.equal(failed.ballots, null)
  console.log('Archive: UTF-8/schema validation, ballot validation, deduplication and unavailable totals pass')
})().catch(error => { console.error(error); process.exitCode = 1 })
