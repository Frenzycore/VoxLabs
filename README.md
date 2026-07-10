# Vox Labs

Frontend text-to-speech (Astro + Tailwind), calling the API at
`https://text-to-speech.ornzora.workers.dev` through a same-origin proxy
worker to avoid CORS and keep the API key server-side.

## Features

- Text-to-speech generation with selectable voice and language
- Voice preview playback before generating
- Optional reverb effect on generated audio
- Daily character quota per IP, with an optional premium key to bypass it
- Optional Turnstile bot protection
- Light and dark theme, persisted locally
- Downloadable and shareable audio output
- Live visitor counter

## Tech stack

Astro, Tailwind CSS, and a Cloudflare Worker for the API proxy, quota, and
static asset serving.

## Project structure

```
vox-labs/
├── public/
│   ├── apple-touch-icon.png
│   ├── favicon.ico
│   ├── favicon.svg
│   └── fonts/
├── src/
│   ├── components/
│   │   ├── Footer.astro
│   │   └── Navbar.astro
│   ├── layouts/
│   │   └── Layout.astro
│   ├── pages/
│   │   └── index.astro
│   ├── scripts/
│   │   ├── theme-toggle.js
│   │   ├── tts-app.js
│   │   └── visitor-count.js
│   ├── styles/
│   │   ├── fonts.css
│   │   └── global.css
│   ├── env.d.ts
│   └── worker.js
├── astro.config.mjs
├── tailwind.config.mjs
└── wrangler.toml
```

## Setup

```bash
npm install
```

## One-time Cloudflare setup

Create the KV namespace used for the daily character-quota counter:

```bash
npx wrangler kv namespace create USAGE_KV
```

Copy the `id` it prints into `wrangler.toml`, replacing
`REPLACE_WITH_YOUR_KV_NAMESPACE_ID`.

Set the premium-key allowlist (JSON array of keys sold to users who want to
bypass the daily limit — leave as `[]` if you don't sell any yet):

```bash
npx wrangler secret put PREMIUM_KEYS
```

For local dev, mirror the same secret in `.dev.vars`:

```bash
echo 'TTS_API_KEY=core' > .dev.vars
echo 'PREMIUM_KEYS=[]' >> .dev.vars
```

## Dev locally (through the Worker, not Vite)

```bash
npm run build && npx wrangler dev
```

`astro dev` alone isn't enough here since `/api/*` routes only exist when
served by the worker script.

## Deploy to Cloudflare Workers

```bash
npx wrangler login                    # once
npx wrangler secret put TTS_API_KEY    # value: core
npx wrangler secret put PREMIUM_KEYS   # value: [] or ["key1","key2"]
npm run deploy                        # astro build then wrangler deploy
```

## Turnstile (bot protection, optional)

Register a widget at the Cloudflare dashboard → Turnstile, then:

```bash
npx wrangler secret put TURNSTILE_SECRET_KEY
```

Put the site key (public, safe to expose) in `wrangler.toml` under `[vars]`,
replacing `REPLACE_WITH_YOUR_TURNSTILE_SITE_KEY`. If left as the placeholder,
Turnstile is skipped entirely and the site works without it.

## Daily character limit

Enforced server-side per IP address, based on Jakarta time (UTC+7):

| Day | Limit |
|---|---|
| Monday–Friday | 2,000 characters |
| Saturday | 3,000 characters |
| Sunday | 5,000 characters |

Users with a key listed in `PREMIUM_KEYS` bypass this limit entirely by
entering it in the "Have an API key?" field on the page.

## License

MIT — see [LICENSE](./LICENSE).
