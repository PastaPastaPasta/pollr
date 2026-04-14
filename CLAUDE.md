# CLAUDE.md

This file provides guidance to Claude Code when working with the pollr codebase.

## Development Commands

```bash
npm run dev      # Start development server
npm run build    # Build for production (static export)
npm run lint     # Run linting
```

## Validating Changes

Always validate before committing:

1. `npm run lint` — fix all errors
2. `npm run build` — ensures static export works

## Architecture Overview

Pollr is a decentralized polling app built with Next.js 14 and Dash Platform.

### CRITICAL: Fully Decentralized - No Backend

All code must be compatible with a fully static export (`output: 'export'` in `next.config.js`). The only "backend" is Dash Platform DAPI requests made directly from the client.

**Do NOT introduce:**
- Server-side API routes (`/api/*`)
- Server-side rendering requiring a Node.js server
- Database connections or server-side state
- Dynamic routes (e.g., `[id]`, `[slug]`) — use query parameters instead

### Data Contract

The pollr contract (`contracts/pollr-contract.json`) defines two document types:
- `poll` — question (binary), options (binary JSON), pollType (integer)
- `vote` — pollId, pollOwnerId, selectedOptions (array of indices)

The `vote` document has a unique index on `[pollId, $ownerId]` preventing double-voting.

Binary fields (`question`, `options`) use byte arrays for longer content support:
- `question`: UTF-8 encoded string
- `options`: JSON.stringify'd array of strings, UTF-8 encoded

### Services Layer (`lib/services/`)

Singleton service classes handle all Dash Platform operations:
- `evo-sdk-service.ts` — SDK initialization and connection
- `state-transition-service.ts` — Write operations
- `document-service.ts` — Query operations (BaseDocumentService base class)
- `poll-service.ts` — Poll CRUD
- `vote-service.ts` — Vote operations
- `identity-service.ts` — Identity lookup
- `dpns-service.ts` — Username resolution

### Authentication

- `contexts/auth-context.tsx` manages user sessions
- Private keys stored via secure-storage (sessionStorage/localStorage)
- Documents use `$ownerId` (platform system field), NOT custom fields

### Key Patterns

- State Management: Zustand store in `lib/store.ts`
- Styling: Tailwind CSS with teal pollr-* color tokens
- UI: Radix UI primitives in `components/ui/`
- Animations: Framer Motion
- Routes: Query params only (e.g., `/poll?id=123`)
