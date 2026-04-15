# Pollr

Decentralized polling app built on [Dash Platform](https://dashplatform.readme.io/). Create and vote on polls — fully on-chain, no backend.

## Features

- Create single-choice or multiple-choice polls
- Vote on polls with your Dash Platform identity
- View poll results directly on list pages and individual poll pages
- Double-vote prevention via on-chain unique index
- Dark mode support
- Mobile responsive
- Fully static — deployed on GitHub Pages

## Tech Stack

- **Framework**: Next.js 14 (static export)
- **Language**: TypeScript
- **Blockchain**: Dash Platform via @dashevo/evo-sdk
- **Styling**: Tailwind CSS
- **UI**: Radix UI primitives
- **Animations**: Framer Motion
- **State**: Zustand

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Building

```bash
npx tsc --noEmit  # Type-checks cleanly before a build
npm run build      # Build for root deployment
npm run build:subpath  # Build for /pollr subpath
```

Static output is generated in the `./out` directory.

## Deployment

Deployed automatically to GitHub Pages on push to `master` via GitHub Actions.

## Data Contract

Poll and vote data is stored on Dash Platform via the pollr data contract. See `contracts/pollr-contract.json` for the schema.

## License

MIT
