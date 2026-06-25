# Working on prepr (agent guide)

Conventions for AI agents (and humans) contributing to this repo. Read this
before pushing or deploying.

## Project shape

- **Frontend** — a Vite + React PWA in `src/` (plus `index.html`, `public/`,
  `vite.config.ts`). Deployed as a static site to **GitHub Pages**
  (`prepr.camlc.dev`).
- **API / sync backend** — a Cloudflare Worker + Durable Object in `server/`.
  Deployed to **Cloudflare Workers** (`prepr-api.camlc.dev`).

## Golden rules

1. **Never commit to `main` directly.** Pushing to `main` deploys to
   production. All work goes through a branch + PR.
2. **One branch + PR per issue.** Keep changes focused.
3. **Gate locally before pushing** — run the exact checks CI runs (below).
4. **`Closes #<n>` in the PR body** so the issue auto-closes on merge.
5. **`server/` changes need a manual deploy** — merging does not ship them.

## The workflow

### 1. Branch off an up-to-date `main`

```bash
git checkout main && git pull --ff-only
git checkout -b <short-feature-branch>
```

### 2. Gate locally — run exactly what CI runs

CI (`.github/workflows/ci.yml`) runs these on every push and PR. All five must
pass; don't push red.

```bash
npm run typecheck
npm run lint
npm run format:check     # if it fails: npm run format, then re-stage
npm test
npm run build
```

### 3. Commit, push, open a PR

```bash
git add -A
git commit -m "<summary>

Closes #<issue>."
git push -u origin <branch>
gh pr create --title "..." --body "..."
```

Wait for the CI check on the PR to go green.

### 4. Merge = deploy (frontend)

`.github/workflows/deploy.yml` runs on every push to `main`: it builds and
publishes to GitHub Pages automatically. **Merging the PR is the frontend
deploy** — there is no separate manual step. Afterwards, resync locally:

```bash
git checkout main && git pull --ff-only
```

### 5. API / server changes need a manual deploy

If the change touches anything in `server/` (sync API, Durable Object, Web
Push, food/AI endpoints), the merge does **not** ship it. After merging:

```bash
cd server
npm run deploy            # wrangler deploy → prepr-api.camlc.dev
```

Needs Cloudflare auth (`wrangler login` or a `CLOUDFLARE_API_TOKEN`). New
secrets go via `wrangler secret put <NAME>` (e.g. the VAPID keys — see
`server/README.md`).

If a frontend change depends on a new endpoint, **deploy the server first** (or
together with the merge) so the live site never calls an endpoint that isn't
there yet.

## Rule of thumb

- Touched only `src/`, `index.html`, `public/`, `vite.config.ts`
  → merge and you're done (Pages auto-deploys).
- Touched `server/`
  → merge **and** `cd server && npm run deploy`.
