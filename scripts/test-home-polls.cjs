const ts = require('typescript')
const fs = require('node:fs')
const vm = require('node:vm')
const assert = require('node:assert/strict')
const path = require('node:path')
const root = path.resolve(__dirname, '..')
function load(file, imports) {
  const source = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText
  const mod = { exports: {} }
  vm.runInNewContext(source, { exports: mod.exports, require: name => imports[name], Date, Number, Set, Map })
  return mod.exports
}
const utils = load('lib/utils.ts', { clsx: { clsx() {} }, 'tailwind-merge': { twMerge() {} } })
const { selectHomePolls } = load('lib/home-polls.ts', { '@/lib/utils': utils })
const row = (id, question, username, endsAt, createdAt) => ({ poll: { $id: id, question, endsAt, $createdAt: createdAt }, ownerUsername: username })
const input = [row('closed', 'Lunch?', 'person.dash', 1, 4), row('real', 'Ship it?', 'e2e-user.dash', undefined, 5), row('normal', 'Contest winners?', 'person.dash', undefined, 2), row('test', 'Smoke test', 'person.dash', undefined, 7), row('open', 'Where next?', 'person.dash', Date.now() + 100000, 3)]
assert.deepEqual(Array.from(selectHomePolls(input, false), r => r.poll.$id), ['open', 'normal', 'closed'])
assert.equal(selectHomePolls(input, true).length, 3)
assert.equal(selectHomePolls([row('placeholder', 'A Secondary poll', 'person.dash', undefined, 1)], false).length, 0)
assert.equal(selectHomePolls([input[3]], false).length, 0, 'An all-test sample is not a community feed')
assert.equal(selectHomePolls([row('hash', 'poll-ac39b08-7317', 'person.dash', undefined, 1)], false).length, 0)
assert.equal(selectHomePolls([row('test-user', 'Meetup?', 'yappr-e2e-0.dash', undefined, 1)], false).length, 0)
assert.equal(selectHomePolls([row('hash-user', 'Meetup?', 'user-ac39b08.dash', undefined, 1)], false).length, 0)
assert.equal(selectHomePolls(input, true, true).length, 5, 'Practice records require an explicit opt in')
assert.equal(input[0].poll.$id, 'closed', 'Filtering does not mutate fetched data')
console.log('Poll discovery: practice-name, automated-owner and hash filters, full archive, open-first ordering and source immutability pass')
