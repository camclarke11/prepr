# prepr-api

Real-time sync + push-notification backend for prepr — a Cloudflare Worker with
one **Durable Object per household**. The frontend (on GitHub Pages) connects
here to share a shopping list live between devices.

## Architecture

- **`HouseholdDO`** (`src/household.ts`) — one instance per shared household,
  addressed by a secret, unguessable household id. Holds the list/members in
  SQLite, fans out changes over **hibernatable WebSockets**, and (Phase 3) sends
  Web Push to the members who aren't the actor.
- **Worker** (`src/index.ts`) — CORS + routing; forwards to the DO by household
  id. WebSocket upgrades are handled inside the DO.
- **Pairing** — capability-based: whoever holds the household id (shared via an
  invite link) is in. No accounts.

## API

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/household` | Create a household; returns `{ householdId, member, items, members }` |
| POST | `/api/household/:id/join` | Join an existing household (`{ name }`) |
| GET  | `/api/household/:id/state` | Snapshot fallback |
| POST | `/api/household/:id/op` | Apply a mutation over HTTP (`{ op, memberId }`) |
| POST | `/api/household/:id/subscribe` | Register a Web Push subscription (Phase 3) |
| GET  | `/api/household/:id/ws?member=:memberId` | WebSocket (primary path) |

## Develop

```bash
cd server
npm install
npm run dev         # wrangler dev (local Worker + DO via Miniflare)
npm run typecheck
```

## Deploy

Requires Cloudflare auth (`wrangler login` or a `CLOUDFLARE_API_TOKEN`). The
zone `camlc.dev` is on the target account, so the `prepr-api.camlc.dev` custom
domain is provisioned automatically.

```bash
cd server
npm run deploy
```

### Phase 3 secrets (Web Push)

```bash
wrangler secret put VAPID_PUBLIC_KEY
wrangler secret put VAPID_PRIVATE_KEY
wrangler secret put VAPID_SUBJECT     # e.g. mailto:you@example.com
```
