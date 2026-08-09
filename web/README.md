# agenthooks.directory

The discovery surface for hook packages — browse, inspect, copy an install
command. The hooks analog of `vercel-labs/skills`. v1 runs against mock
data; the server-function boundary in `src/data/server-fns.ts` is where
Supabase + Upstash will land later.

## Develop

```bash
npm install
npm run dev      # vite dev --port 3000
```

The router regenerates `src/routeTree.gen.ts` automatically as you add
route files under `src/routes/`.

## Build

```bash
npm run build    # vite build via Nitro
npm run preview  # preview the production build locally
```

Output lands in `.output/`. The Nitro preset is `node-server` by default —
swap to `vercel`, `cloudflare`, etc. when wiring deploy. See
https://v3.nitro.build/deploy.

## Layout

```
src/
  routes/            TanStack Router file routes
  components/        shared React components
  data/              mock dataset, types, server-function boundary
  lib/               events taxonomy, formatting helpers
  styles/            tokens, base, spine, components (CSS, no Tailwind)
```

Design system lives in `src/styles/tokens.css`. The lifecycle spine
(`src/components/lifecycle-spine.tsx`) is the signature element — change
it deliberately, not by accident.
