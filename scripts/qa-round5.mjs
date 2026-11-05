import { chromium } from '../../../lab/node_modules/playwright/index.mjs'
import { installQaGuard } from '../../../lab/qa-guard.mjs'
import { mkdir, writeFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import assert from 'node:assert/strict'

const root = new URL('../../../', import.meta.url).pathname
const output = `${root}shots/r5-s3-journeys`
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ headless: true })
const report = { started: new Date().toISOString(), heads: Object.fromEntries(['pollr', 'forge', 'yappr'].map(site => [site, execFileSync('git', ['-C', `${root}repos/${site}`, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()])), cases: [] }
const base = site => `http://${site}.dashhq.localhost:8787`
const save = async (page, name) => { await page.waitForTimeout(700); await page.screenshot({ path: `${output}/${name}.png`, fullPage: false }) }
try {
  for (const phone of [false, true]) for (const theme of ['light', 'dark']) {
    const tag = `${phone ? 'phone' : 'desktop'}-${theme}`
    const blocked = [], errors = [], priceRequests = []
    const context = await browser.newContext({ viewport: { width: phone ? 390 : 1440, height: phone ? 844 : 900 }, isMobile: phone, hasTouch: phone, colorScheme: theme, deviceScaleFactor: 1, serviceWorkers: 'block', locale: 'en-US', timezoneId: 'UTC' })
    await installQaGuard(context, { onBlocked: value => blocked.push(value) })
    await context.addCookies([{ name: 'dh_theme', value: theme, domain: '.dashhq.localhost', path: '/' }])
    const page = await context.newPage()
    page.on('pageerror', e => errors.push(e.message))
    page.on('request', r => { if (/coinbase|coingecko|ctx\.com/.test(r.url())) priceRequests.push(r.url()) })
    const checkLayout = async site => {
      assert.equal(await page.locator('dashhq-bar').count(), 1, `${site}: one bar`)
      assert.equal(await page.locator('dashhq-footer').count(), 1, `${site}: one footer`)
      assert.equal(await page.locator('html').getAttribute('data-theme'), theme, `${site}: shared theme`)
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${site}: no page overflow`)
      assert.ok(await page.locator('article').evaluateAll(nodes => nodes.every(node => node.getBoundingClientRect().right <= innerWidth + 1)), `${site}: post cards fit the viewport`)
    }
    await page.goto(base('pollr'))
    const example = page.getByRole('region', { name: 'Which day works for our meetup?' })
    await example.getByRole('button', { name: 'Sunday afternoon', exact: true }).click()
    await page.getByText('Your example vote is recorded in this browser.', { exact: false }).waitFor()
    assert.equal(await example.locator('button:disabled').count(), 2)
    await page.reload()
    await page.getByText('Your example vote is recorded in this browser.', { exact: false }).waitFor()
    await example.scrollIntoViewIfNeeded()
    await save(page, `pollr-local-vote-${tag}`)
    await example.getByRole('button', { name: 'Reset browser example' }).click()
    assert.equal(await example.locator('button:disabled').count(), 0)
    await page.getByRole('button', { name: 'Archive', exact: true }).click()
    assert.equal(await page.getByLabel('Include automated and practice records').isChecked(), false)
    await page.getByText('No polls match this view', { exact: false }).waitFor({ timeout: 45000 })
    assert.equal(await page.getByText('yappr-e2e-0.dash', { exact: true }).count(), 0)
    await save(page, `pollr-archive-${tag}`)
    await page.goto(`${base('pollr')}/create/`)
    await page.getByLabel('Question', { exact: true }).fill('Where should our meetup happen?')
    await page.getByRole('textbox', { name: 'Option 1', exact: true }).fill('Community hall')
    await page.getByRole('textbox', { name: 'Option 2', exact: true }).fill('Online')
    assert.equal(await page.getByRole('heading', { name: 'Where should our meetup happen?' }).count(), 1)
    await page.getByLabel('Close time').selectOption('3d')
    await checkLayout('pollr')
    await save(page, `pollr-draft-${tag}`)
    await page.getByRole('button', { name: 'Sign in to publish' }).click()
    await page.getByRole('dialog').waitFor()
    await save(page, `pollr-signin-${tag}`)
    await page.getByRole('button', { name: 'Close', exact: true }).click()
    assert.equal(await page.getByLabel('Question', { exact: true }).inputValue(), 'Where should our meetup happen?')

    await page.goto(base('forge'))
    await page.getByRole('heading', { name: 'A guided look inside' }).waitFor({ timeout: 60000 })
    await checkLayout('forge')
    const repoHref = await page.locator('[data-testid="featured-repos"] a').filter({ hasText: 'dash-fork-checker' }).first().getAttribute('href')
    assert.ok(repoHref)
    await page.goto(`${base('forge')}/explore/`)
    await page.locator('[data-testid="explore-featured"] [data-testid="repo-stars"]').waitFor({ timeout: 60000 })
    assert.equal(await page.locator('[data-testid="explore-recent-repos"] [data-testid="repo-stars"]').count(), 0, 'Featured repo is not repeated')
    await save(page, `forge-explore-${tag}`)
    await page.goto(base('forge') + repoHref)
    await page.locator('#files a').first().waitFor({ timeout: 60000 })
    await page.locator('#readme').scrollIntoViewIfNeeded()
    await save(page, `forge-repo-${tag}`)
    await page.locator('#files a[href*="/repo/blob"]').first().click()
    await page.locator('[data-testid="copy-permalink"]').waitFor({ timeout: 60000 })
    await save(page, `forge-file-${tag}`)
    await page.goto(base('forge') + repoHref)
    await page.getByRole('link', { name: 'Open the issue list →' }).click()
    await page.getByRole('main').waitFor()
    await save(page, `forge-issues-${tag}`)
    await page.locator('dashhq-bar [data-replay="sign-in"]').click()
    await page.getByRole('dialog').waitFor()
    await page.locator('[data-testid="tile-wallet"]').waitFor()
    assert.match(await page.locator('dashhq-signin-help').first().getAttribute('kept-note'), /tDASH/)
    assert.doesNotMatch(await page.getByRole('dialog').innerText(), /\d DASH\b/)
    await save(page, `forge-signin-${tag}`)

    await page.goto(base('yappr'))
    await page.getByRole('heading', { name: 'Latest public conversations' }).waitFor()
    await page.locator('time[datetime]').first().waitFor({ timeout: 60000 })
    const dates = await page.locator('time[datetime]').evaluateAll(nodes => nodes.map(node => ({ time: new Date(node.dateTime).getTime(), text: node.textContent })))
    assert.deepEqual(dates.map(d => d.time), dates.map(d => d.time).sort((a, b) => b - a))
    for (const date of dates) if (new Date(date.time).getUTCFullYear() < new Date().getUTCFullYear()) assert.match(date.text, /\d{4}/)
    for (const name of ['Reply', 'Repost or quote', 'Like', 'Tip with tDASH — choose amount before sending', 'Bookmark', 'Copy post link']) assert.ok(await page.getByRole('button', { name, exact: true }).count(), `Named action ${name}`)
    await checkLayout('yappr')
    await save(page, `yappr-home-${tag}`)
    await page.getByRole('button', { name: 'Tip with tDASH — choose amount before sending' }).first().click()
    // Signed-out tips explain that sign-in is needed before the amount/confirmation flow.
    await page.getByRole('dialog').waitFor()
    await page.getByRole('button', { name: 'Passkey', exact: true }).click()
    assert.equal(await page.getByLabel('Private key (WIF)', { exact: true }).count(), 0)
    await save(page, `yappr-signin-${tag}`)
    assert.ok(await page.getByRole('heading', { name: 'Sign in to Yappr', exact: true }).evaluate(node => node.getBoundingClientRect().top >= node.closest('[role="dialog"]').getBoundingClientRect().top), 'Sign-in title remains visible after switching methods')
    assert.deepEqual(blocked, [])
    assert.deepEqual(errors, [])
    assert.deepEqual(priceRequests, [])
    report.cases.push({ tag, status: 'pass', dates, blocked, errors, priceRequests })
    await context.close()
    console.log(`${tag}: local vote/reload/reset, draft/preview/sign-in, archive, repo guide/files/issues, deduplication, pricing, dates, action names, methods, layout and cross-app theme pass`)
  }
} catch (error) {
  report.error = String(error.stack || error)
  throw error
} finally {
  report.finished = new Date().toISOString()
  await writeFile(`${output}/report.json`, JSON.stringify(report, null, 2))
  await browser.close()
}
