import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { test } from 'node:test';
import assert from 'node:assert/strict';
const source = readFileSync(new URL('../public/retirement.js', import.meta.url), 'utf8');
for (const [url, expected] of [
  ['https://pollr.dashhq.org/', '/polls?network=testnet'],
  ['https://pollr.dashhq.org/create/', '/polls/new?network=testnet'],
  ['https://pollr.dashhq.org/my-polls/', '/polls?seg=mine&network=testnet'],
  ['https://pollr.dashhq.org/poll/?id=GBCR8JqtXNMZa4B16ZAYm3RkNHrPcU3D36jcAoYWvr8E#answers', '/polls/GBCR8JqtXNMZa4B16ZAYm3RkNHrPcU3D36jcAoYWvr8E?network=testnet#answers'],
  ['https://pollr.dashhq.org/poll/?id=GBCR8JqtXNMZa4B16ZAYm3RkNHrPcU3D36jcAoYWvr8E&archive=1&network=mainnet', '/polls/GBCR8JqtXNMZa4B16ZAYm3RkNHrPcU3D36jcAoYWvr8E?archive=1&network=testnet'],
]) test(url, () => {
  let actual;
  vm.runInNewContext(source, { URL, URLSearchParams, location: new URL(url), document: { documentElement: { dataset: {} }, querySelector: () => ({ setAttribute: (_, value) => { actual = value; } }) } });
  assert.equal(actual, expected);
});
test('forwarding exports use strict CSP and the shared moved element', () => {
  const build = readFileSync(new URL('build-retirement.mjs', import.meta.url), 'utf8');
  assert.match(build, /<dashhq-moved product="pollr" to="gov"/);
  assert.doesNotMatch(build, /unsafe-|phone-nav="tabs"|pollr-logo|Example: not on Platform/);
});
