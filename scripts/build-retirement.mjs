import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';

const base = (process.env.BASE_PATH ?? '').replace(/\/$/, '');
if (base && !/^\/[a-zA-Z0-9/_-]+$/.test(base)) throw Error('Invalid BASE_PATH');
const sri = async file => `sha384-${createHash('sha384').update(await fs.readFile(`public/${file}`)).digest('base64')}`;
const script = async (file, defer = false) => `<script src="${base}/${file}" integrity="${await sri(file)}" crossorigin="anonymous"${defer ? ' defer' : ''}></script>`;
const style = async file => `<link rel="stylesheet" href="${base}/${file}" integrity="${await sri(file)}" crossorigin="anonymous">`;
const routes = { '': '/polls', create: '/polls/new', poll: '/polls', 'my-polls': '/polls?seg=mine', login: '/polls', archive: '/polls/archive' };
await fs.rm('out', { recursive: true, force: true });
await fs.mkdir('out', { recursive: true });
await fs.cp('public/dashhq', 'out/dashhq', { recursive: true });
await fs.copyFile('public/retirement.js', 'out/retirement.js');
await fs.copyFile('public/retired.css', 'out/retired.css');
const scripts = await script('dashhq/dashhq-shell.js') + '\n' + await script('retirement.js', true);
const styles = await Promise.all(['dashhq/dashhq-tokens.css', 'dashhq/dashhq-shell.css', 'dashhq/dashhq-components.css', 'retired.css'].map(style));
for (const [route, destination] of Object.entries(routes)) {
  const query = destination.includes('?') ? '&amp;' : '?';
  const html = `<!doctype html>
<html lang="en" data-base="${base}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self'; font-src 'self'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; object-src 'none'; form-action 'none'">
<title>Polls moved to Governance · dashhq</title><meta name="description" content="Pollr is now Polls in Governance. Your poll links still work.">
${scripts}
${styles.join('\n')}
</head><body class="dh-fill"><a class="skip" href="#main">Skip to content</a><dashhq-bar product="pollr" network="testnet" sticky></dashhq-bar>
<main id="main" class="dh-container dh-page"><div class="dh-narrow"><dashhq-moved product="pollr" to="gov" path="${destination.replaceAll('&', '&amp;')}" heading="Polls moved to Governance" lede="Ask and answer questions beside proposals and name contests, with one Governance sign-in. Your old poll links still work." label="Open Polls">
<h1 class="dh-page-header__title">Polls moved to Governance</h1><p>Pollr is now Polls in Governance.</p><p><a class="dh-btn dh-btn--primary" href="https://gov.dashhq.org${destination.replaceAll('&', '&amp;')}${query}network=testnet&amp;moved-from=pollr">Open Polls →</a></p></dashhq-moved>
<noscript><p>JavaScript is off. Open Polls above; for an old poll link, add its id to gov.dashhq.org/polls/.</p></noscript></div></main>
<dashhq-footer product="pollr" source="https://github.com/PastaPastaPasta/pollr"></dashhq-footer></body></html>`;
  const dir = path.join('out', route);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, 'index.html'), html);
  if (!route) await fs.writeFile('out/404.html', html);
}
