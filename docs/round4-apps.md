# Round 4 apps evidence plan

Local lab only. Scope: Pollr, Forge web and Yappr. No production writes, auth changes, push or deployment.

| Surface | Before | After | Shared state | Expected visible change |
| --- | --- | --- | --- | --- |
| Pollr home | 9b523c83cebdb6a206953de67b4372f2c1156cd7; round3 Pollr home | Final source in r4-s3 report | Public Testnet; 390/1440; light/dark | Honest demo framing, illustrative meetup question, practice records only in archive |
| Pollr poll | Same revision; round3-opus poll breadcrumb | Final source in r4-s3 report | Poll HHFCpWE1km6hYNSG4QAP2cb23jgDCvXaBgASJpXRXdKk | One breadcrumb; no duplicate Back link |
| Forge home and repo | 9c381f700614bc2f60c9a4a2e03152b67473018c; round3 Forge views | Final source in r4-s3 report | Testnet dash-fork-checker; 390/1440; light/dark | Example leads; filtered catalogue; wrapping title/actions/status; one recommended clone command |
| Yappr home, Explore and feed | b2e8bdd96bbd55e586bd752e50f3de1ed6501fbe; round3 Yappr views | Final source in r4-s3 report | Public Testnet sample; 390/1440; light/dark | Conversations before people, no empty trending-led landing, single navigation and footer |
| Three sign-in surfaces | Round3 reviewer sign-in captures | Targeted r4-s3 QA captures | Logged out; no credentials entered | Identity reuse and per-app authorization explained; exact credential format |

Before images are historical reviewer evidence at the revisions above, not a controlled recapture. Live testnet posts, counts, read availability and timestamps may differ. The Pollr example is explicitly illustrative, not chain data; Forge's real mirror and Yappr's posts are read live. Compatibility of key handling and CSP is assessed from unchanged auth logic and checks, not inferred from screenshots.
