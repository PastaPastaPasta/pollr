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
assert.deepEqual(Array.from(selectHomePolls(input, false), r => r.poll.$id), ['real', 'open', 'normal', 'closed', 'test'])
assert.equal(selectHomePolls(input, true).length, 5)
assert.equal(selectHomePolls([input[3]], false).length, 1, 'An all-test archive remains visible')
assert.equal(input[0].poll.$id, 'closed', 'Sorting does not mutate fetched data')
console.log('Poll discovery: all records retained, junk demoted, author names do not suppress questions, open-first sorting, source immutability pass')
