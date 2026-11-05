# Round 5 apps handoff

Scope: local Pollr, Forge web and Yappr on `lab/unified`. No push, deployment, production write, real credential or funding. Auth, signing and contract rules are retained; the added examples are explicitly browser-only.

## Evidence plan

Before evidence is the independent round-4 reviewer capture, not a controlled recapture. Public Testnet values and read availability can change. Final after captures are in `shots/r5-s3/` and `shots/r5-s3-journeys/` at the lab root. The capture reports record source heads. The example ballot and draft text are disclosed local UI examples, not substituted Platform data.

| Surface | Before revision and evidence | After state | Visible change |
| --- | --- | --- | --- |
| Pollr | `8741f681f8e5cca077143d392c27af81de796216`; `reviews/round4-sol-shots/pollr-desktop.png`, `pollr-archive-focused.png`, `pollr-signin-phone.png` | Same public Testnet; 1440/390; light/dark | Interactive local ballot, public draft/preview, practice opt-in, credential layout and family primary |
| Forge | `289e6e739306002b02e74111d3116f0a7cc295ba`; `reviews/round4-sol-shots/forge-example-repo.png`, `forge-signin.png`; `shots/round4/forge/explore__desktop__dark.png` | Real `dash-fork-checker` mirror, repo `AxKhmvArbnKqpwbgno7jE7eo2nCQKTm1qpMXs2WmwfaZ`; 1440/390; light/dark | One example listing, editorial guide, honest README/issue states, tDASH, method-first sign-in |
| Yappr | `c14c5e0b1179979d66190cfd75241b4cbba654f9`; `reviews/round4-sol-shots/yappr-desktop.png`, `yappr-phone.png`, `yappr-signin-phone.png` | Public English-language Testnet sample; 1440/390; light/dark | Newest substantive conversations, explicit old years, named actions, useful desktop rail, credential choices |

A screenshot does not prove unchanged auth, identity uniqueness on Platform, or successful writes. Those claims are bounded by source inspection and existing tests. The local example explicitly distinguishes its resettable browser state from the real unique poll/voter index.

## Reviewer disposition

- Opus 2; Sol 3: Pollr local ballot and draft/preview implemented; no fake activity. Test debris is hidden in Community and Archive unless explicitly included.
- Opus 2; Sol 17: Forge has a reusable, clearly attributed guide to its real mirror, files, README and issue list. It does not manufacture an issue or a committed README. Maintaining new source content on Testnet remains outside this read-only lab.
- Opus 2; Sol 18: Yappr selects newest substantive public conversations from the latest 50 English-language posts, preserving the full public archive. The selection criterion is stated beside the heading.
- Opus 5: app primaries use the family amber/default height. App brand glyphs remain.
- Opus 22: Yappr home uses the available desktop space for an explanatory right rail; phone cards shrink within the viewport.
- Opus 25: new inline/action links use family link/button classes. No cross-site shell links were forked.
- Sol 1 and 4: method choices precede storage disclosure and action; wallet, Private key (WIF), Recovery phrase and Passkey labels are aligned where supported. Shared sign-in help remains, with actual per-app retention. Shell phone compaction is owned by the shared release.
- Sol 7: Forge display amounts, bounds, deposit copy, costs and errors use tDASH on Testnet and devnet DASH on devnets. Testnet fiat settings show no conversion and contact no price provider, including with a cached rate.
- Sol 9: all six post actions and the post menu have accessible names. Tip is labelled visibly and describes amount selection before sending.

## Review and simplification

Direct four-pass review covers actual diffs: completeness, maintainability, architecture, and reliability/security. Browser examples never call the signing services. Publishing still requires the existing authenticated identity and explicit form submission. All existing auth handlers, storage mechanisms and CSP declarations remain in place. Public discovery filters affect presentation; archives/direct records retain their data.

Safe simplifications: reuse Pollr's existing option rendering; reuse one Forge guide on home and repo; centralize network currency labels; consolidate imports; keep Yappr discovery as one filter plus a date sort. No generic auth abstraction or new provider was added.

Final validation, capture inspection and remaining integration requirements are recorded below after the runs finish.

## Validation and integration

- Pollr: TypeScript, Next lint and `scripts/test-home-polls.cjs` pass.
- Yappr: TypeScript, Next lint and discovery, read-retry and post-date scripts pass. Lint retains inherited warnings. The guarded phone journey caught clipped post cards; the grid now shrinks correctly. Rapid selection during the sign-in scale animation could scroll its header away, so the dialog uses an opacity-only transition.
- Forge: TypeScript and lint pass, with the inherited merge-panel hook warning. 278 focused tests and 158 related wallet/fiat/network tests pass. The full run returned 10,025 passing, 41 skipped and six failures: four stale DASH-label expectations plus the two histogram-parity failures already documented in `lab/ROUND4-INTEGRATION.md`. The stale assertions were corrected; all ten tests in those two files pass on rerun. The parity implementation is unchanged.
- Builds use `bash lab/build.sh pollr forge yappr`, serially. Guarded live browser journeys cover desktop 1440 and phone 390 (`isMobile`), light/dark, cross-origin theme, ballot persistence/reset, draft preservation, archive hiding, real repo files/issues, deduplication, test currency, dates and named actions. Reports retain source heads, request/write guard results and timestamps.
- Shell 1.6.0 documentation landed during verification. All three apps now use the documented `data-dh-accent` attribute and default family primary/control sizing. Compact sign-in help is automatic at narrow dialog widths. Per the stream brief and shell ownership rule, the final integrator must re-vendor 1.6.0; these app commits do not modify shared or vendored shell files. Until that integration, captures show the existing 1.5.3 explanation.
- Review result: **APPROVED WITH SUGGESTIONS**. No remaining app-code correctness/security finding was found in the four-pass direct review. Remaining limits are the inherited parity failures, live Testnet availability/content, shell integration and unexercised authenticated writes. No new auth abstraction or provider was introduced.

Run `node scripts/qa-round5.mjs` from Pollr for the cross-app journey report. Run `node lab/shots.mjs --label r5-s3 --sites pollr,forge,yappr` from the lab root for the standard capture matrix. `shots/r5-s3/report.json` and `shots/r5-s3-journeys/report.json` identify the actual captured heads; evidence is local only. Intermediate journey captures are superseded by the last complete run.
