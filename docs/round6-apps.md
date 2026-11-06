# Round 6 — Apps

Local changes only on `lab/unified`. No pushes, deployments, PRs or on-chain writes.

## Review coverage

| Round-5 item | Resolution |
| --- | --- |
| Opus #5 / Sol #6, Pollr arrival | Browser-only example leads. A separate read-only archive loads the original v1 polls and ballots live. The most participated non-placeholder poll leads; Archive expands the genuine records. Current automated-owner records remain behind the existing explicit opt-in. No retired-contract writes are enabled. |
| Opus #5 / Sol #8, Forge arrival | Live root files, source commit and Platform branch-update time accompany the real mirror. The tour now explains pushing, inspecting push evidence and verifying a clone. README/issue/review examples are an explicitly labelled, browser-only illustration. |
| Sol #9, Yappr discovery | Rank genuine public posts by replies, then recency, then likes/reposts. Keep real activity dates and disclose the bounded English-language public sample. No activity is manufactured. |
| Sol #2, sign-in | Keep header Sign in in all three apps. Use identical shared method names, wallet-approval recommendation and explanation where offered, and Advanced: private key disclosures. Pollr still supports keys only; its safest available recommendation is a dedicated Testnet identity and the existing tab-only default. Auth, key storage and scopes are unchanged. |
| Sol #18, Forge searches | Persistent, distinct labels for jumping to a known target and searching repository-name prefixes; short example placeholder fits phones. |
| Opus #7 / Sol #14–15 / Opus #10 | Shared shell adoption covers phone menu deduplication, visible desktop Tools, and the canonical Directory destination. Final shell version is recorded in screenshot reports. |
| Source attribution / fiat | Pollr archive sources, IDs and read time are disclosed away from its prose. Forge distinguishes Platform push time from source-commit time. Yappr names its sample and UTC read time. No fiat is shown or fetched for these Testnet entry flows; tDASH price lookup is explicitly disabled even on forced refresh. Existing store sticker prices remain exact prices. |

## Evidence matrix

These are live public reads, not fixed fixtures; vote totals, read ages, network availability and source data can change. No chain data is synthesized. The Forge illustration is static explanatory content and is explicitly marked as such in the UI.

| Surface | Before revision / evidence | After state / expected delta |
| --- | --- | --- |
| Pollr home/archive | `b863da2a7cedfbb6c396826cc043e5e776f467e4`; `reviews/round5-sol-shots/pollr-desktop.png`, `pollr-archive-phone.png` | `shots/r6-s4/pollr/`; local example plus a readable recorded poll, no empty filter arrival |
| Forge home/repository | `d6d2f31dc9ce09e2544209f46d6fa57443b7ff20`; `reviews/round5-sol-shots/forge-desktop.png`, `forge-repo-phone.png` | `shots/r6-s4/forge/`; real files/source date, recorded push and honest workflow |
| Yappr discovery | `21d1790767a9f198c342904072766c4afa354179`; `reviews/round5-sol-shots/yappr-desktop.png` | `shots/r6-s4/yappr/`; reply-rich genuine content leads with dates intact |
| Phone menus / methods / focused states | Same initial revisions; `reviews/round5-opus-shots/phone-menus-sheet.png`, `reviews/round5-sol-shots/pollr-auth-phone.png` | `shots/r6-s4-journeys/`; phone menus, sign-in disclosures, archive, files, illustration and source handoffs |

Final after hashes, build heads, viewports and request/error evidence are recorded by `lab/shots.mjs` in `shots/r6-s4/report.json`. The focused journey report records its exact heads too. Captures use 390px mobile with touch and 1440px desktop, light and dark, blocked service workers and `lab/qa-guard.mjs`.

The original v1 contract is `7Xye3k1MuVYTpLuTnein5GLwR1NUjmt5gtLLp4pGhhRf`. The default genuine poll is `FC9FQmwVB3HYisioAgk8TuFHBK4thZdYRkGPu9yXCPUN` (What should I ask?). The placeholder A Secondary poll is filtered. Original voting uses 255 padding; out-of-range selections, malformed single-choice ballots and duplicate voters are excluded. An incomplete/failed ballot read yields unavailable totals, never zero.

Forge reads `AxKhmvArbnKqpwbgno7jE7eo2nCQKTm1qpMXs2WmwfaZ` (dash-fork-checker). The source revision contains LICENSE and check.py, with its latest source commit dated 11 July 2019. Those facts are read live, not hard-coded into the home summary.

## Validation and quality gates

- Pollr: lint, typecheck, existing discovery tests and archive decode/tally/failure regressions.
- Yappr: lint, typecheck, discovery, read-retry, post-date and no-tDASH-price regressions.
- Forge: lint/typecheck; full suite initially reports 10,028 passes, two inherited histogram-parity failures, and one wallet-copy assertion subsequently fixed. All 60 focused auth/showcase/clone-command tests pass after restoring the one-approval wording. The two histogram failures match the pre-existing round-5 integration limitation.
- Local builds: `lab/build.sh pollr forge yappr`, sequential and bounded by the lab tooling.
- Browser tests: `node repos/pollr/scripts/qa-round6.mjs`; standard captures: `node lab/shots.mjs --label r6-s4 --sites pollr,forge,yappr`.
- Review-validator: correctness, maintainability, architecture, and auth/input/error handling passes over actual diffs. Missing-repository handling was corrected to avoid an endless loader. Archive tally failure stays unknown. No auth/security or CSP behavior changed.
- Simplifier: reuse the existing browse/proof boundaries and clone-command builder, and narrow the practice-filter input to the fields it needs. Avoid a second auth/discovery framework.

## Limits

The available public content is still old and Testnet is quiet. These changes make real records inspectable; they cannot make a project maintained or create new conversations. Pollr cannot offer wallet/passkey sign-in without auth work, which is outside this task. Read-only QA does not prove signing, publishing, wallet approval, cloning with a local dg install or sending funds.
