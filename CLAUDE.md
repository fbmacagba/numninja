# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start local dev server (Next.js on localhost:3000)
npm run build    # Production build
npm run lint     # Run ESLint
```

Lockfile must be regenerated with npm 10 (not npm 11), because Cloudflare Pages uses npm 10.9.2 and npm 11 produces placeholder `{dev: true}` entries that crash `npm ci`:
```bash
npx npm@10 install
```

## Architecture

NumNinja is a **number guessing game** (1–100) built with Next.js 14.2.4 App Router, deployed to Cloudflare Pages.

**Game flow:** alias login → guessing loop → leaderboard. All game state lives in `app/page.tsx` as React state. Scoring: 1000 base − 50×guesses − time penalty (1pt/10s), floor 100. Hint (odd/even) unlocks at attempt 5.

**Score persistence:** `app/api/scores/route.ts` is an Edge runtime route that writes/reads from a Cloudflare D1 database via the `DB` binding. The game falls back to localStorage if the API is unavailable.

**Key dependency tension:** `app/api/scores/route.ts` imports `getRequestContext` from `@cloudflare/next-on-pages`, but that package was removed from `package.json` in a recent commit. The API route will fail to build until this is resolved — either by re-adding `@cloudflare/next-on-pages` as a dev dependency or rewriting the route to use the [Cloudflare Pages native bindings approach](https://developers.cloudflare.com/pages/framework-guides/nextjs/).

**wrangler.toml** is currently configured for Workers (not Pages) and Cloudflare skips it with a warning. The D1 database binding (`DB`, id: `ded53b32-4b3d-473e-aecb-b570c2f5c043`) needs to be set in the Cloudflare Pages dashboard under Settings → Functions → D1 bindings.

## Deployment

- Platform: Cloudflare Pages (`https://numninja.pages.dev`)
- Build command: `next build`
- D1 database: `numninja-db` (binding name `DB`)
- The `wrangler.toml` at root is not valid for Pages and is ignored by Cloudflare
