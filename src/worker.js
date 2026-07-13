const QUOTA_TTL_SECONDS = 172800;
const ASSET_MAX_AGE = 31536000; // 1 year

const CSP_HEADER = {
  'content-security-policy':
    "default-src 'none'; " +
    "script-src 'self' https://challenges.cloudflare.com https://widget-cloudflare-cf-turnstile.com https://challenges.cloudflare.com/cdn-cgi/scripts/95c7ed41/cloudflare-static/turnstile-embed.js; " +
    "style-src 'self' https://challenges.cloudflare.com https://widget-cloudflare-cf-turnstile.com; " +
    "font-src 'self' data:; " +
    "img-src 'self' data:; " +
    "connect-src 'self' https://visitors.ornzora.workers.dev https://text-to-speech.ornzora.workers.dev https://challenges.cloudflare.com; " +
    "frame-src https://challenges.cloudflare.com; " +
    "media-src 'self' blob:;",
  'x-content-type-options': 'nosniff',
};

function getJakartaParts() {
  const jakarta = new Date(Date.now() + 7 * 60 * 60 * 1000);
  return {
    dateKey: jakarta.toISOString().slice(0, 10),
    weekday: jakarta.getUTCDay(),
  };
}

function quotaForWeekday(weekday) {
  if (weekday === 0) return 5000;
  if (weekday === 6) return 3000;
  return 2000;
}

function hasPremiumKey(key, env) {
  if (!key) return false;
  let validKeys = [];
  try {
    validKeys = JSON.parse(env.PREMIUM_KEYS || '[]');
  } catch {}
  return validKeys.includes(key);
}

async function checkQuota(request, env, charCount) {
  const customKey = request.headers.get('x-custom-key');
  if (customKey) {
    if (hasPremiumKey(customKey, env)) return { allowed: true, bypass: true };
    return { allowed: false, error: 'Invalid API key.' };
  }

  const ip = request.headers.get('cf-connecting-ip') || 'unknown';
  const { dateKey, weekday } = getJakartaParts();
  const quota = quotaForWeekday(weekday);
  const kvKey = `usage:${dateKey}:${ip}`;

  const currentRaw = env.USAGE_KV ? await env.USAGE_KV.get(kvKey) : null;
  const current = currentRaw ? Number(currentRaw) : 0;

  if (current + charCount > quota) {
    return {
      allowed: false,
      error: `Daily character limit reached (${quota} characters). Try again tomorrow, or use a custom API key for unlimited access.`,
    };
  }

  return {
    allowed: true,
    bypass: false,
    commit: () => env.USAGE_KV?.put(kvKey, String(current + charCount), { expirationTtl: QUOTA_TTL_SECONDS }),
  };
}

async function verifyTurnstile(token, ip, env) {
  if (!env.TURNSTILE_SECRET_KEY) return true;
  if (!token) return false;

  const formData = new FormData();
  formData.append('secret', env.TURNSTILE_SECRET_KEY);
  formData.append('response', token);
  if (ip) formData.append('remoteip', ip);

  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: formData,
    });
    const data = await res.json();
    return data.success === true;
  } catch {
    return false;
  }
}

function jsonResponse(data, status = 200) {
  const headers = new Headers(CSP_HEADER);
  headers.set('content-type', 'application/json; charset=utf-8');
  return new Response(JSON.stringify(data), {
    status,
    headers,
  });
}

async function proxyToBackend(request, env, path) {
  const upstreamUrl = new URL(path, 'https://text-to-speech.ornzora.workers.dev');
  const upstreamRequest = new Request(upstreamUrl, request);
  upstreamRequest.headers.set('x-api-key', env.TTS_API_KEY);

  return env.TTS_API.fetch(upstreamRequest);
}

async function handleTts(request, env, ctx) {
  const body = await request.clone().json().catch(() => null);
  const text = typeof body?.text === 'string' ? body.text : '';
  const ip = request.headers.get('cf-connecting-ip') || 'unknown';

  const verified = await verifyTurnstile(body?.turnstileToken, ip, env);
  if (!verified) {
    return jsonResponse({ error: 'Verification failed. Please try again.' }, 403);
  }

  const quota = await checkQuota(request, env, text.length);
  if (!quota.allowed) {
    return jsonResponse({ error: quota.error }, quota.error === 'Invalid API key.' ? 401 : 429);
  }

  const response = await proxyToBackend(request, env, '/tts');
  if (response.ok && quota.commit) {
    ctx.waitUntil(quota.commit());
  }
  return response;
}

async function handleQuota(request, env) {
  const customKey = request.headers.get('x-custom-key');
  if (customKey && hasPremiumKey(customKey, env)) {
    return jsonResponse({ unlimited: true });
  }

  const ip = request.headers.get('cf-connecting-ip') || 'unknown';
  const { dateKey, weekday } = getJakartaParts();
  const limit = quotaForWeekday(weekday);
  const kvKey = `usage:${dateKey}:${ip}`;
  const currentRaw = env.USAGE_KV ? await env.USAGE_KV.get(kvKey) : null;
  const used = currentRaw ? Number(currentRaw) : 0;

  return jsonResponse({ used, limit, remaining: Math.max(0, limit - used) });
}

function handleConfig(env) {
  const siteKey = env.TURNSTILE_SITE_KEY;
  const isPlaceholder = !siteKey || siteKey.startsWith('REPLACE_WITH_');
  return jsonResponse({ turnstileSiteKey: isPlaceholder ? null : siteKey });
}

async function handleVisitors(env) {
  try {
    const upstreamRequest = new Request('https://visitors.ornzora.workers.dev/@voxlabs');
    const res = await env.VISITORS_API.fetch(upstreamRequest);
    const headers = new Headers(CSP_HEADER);
    headers.set('content-type', 'application/json; charset=utf-8');
    return new Response(res.body, {
      status: res.status,
      headers,
    });
  } catch {
    return jsonResponse({ visitors: null });
  }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === '/api/voices') {
      return proxyToBackend(request, env, '/voices');
    }

    if (url.pathname === '/api/tts') {
      return handleTts(request, env, ctx);
    }

    if (url.pathname === '/api/quota') {
      return handleQuota(request, env);
    }

    if (url.pathname === '/api/config') {
      return handleConfig(env);
    }

    if (url.pathname === '/api/visitors') {
      return handleVisitors(env);
    }

    // Static assets — add cache-control + CSP
    const assetRes = await env.ASSETS.fetch(request);
    const headers = new Headers(assetRes.headers);
    headers.set('x-content-type-options', 'nosniff');

    if (assetRes.status === 200) {
      const ext = url.pathname.split('.').pop().toLowerCase();
      if (ext === 'html' || ext === 'htm') {
        headers.set('cache-control', 'no-cache');
        headers.set('content-type', 'text/html; charset=utf-8');
      } else if (ext === 'js') {
        headers.set('cache-control', `public, max-age=${ASSET_MAX_AGE}, immutable`);
        headers.set('content-type', 'application/javascript; charset=utf-8');
      } else if (ext === 'css') {
        headers.set('cache-control', `public, max-age=${ASSET_MAX_AGE}, immutable`);
        headers.set('content-type', 'text/css; charset=utf-8');
      } else if (ext === 'woff2' || ext === 'woff' || ext === 'ttf' || ext === 'eot') {
        headers.set('cache-control', `public, max-age=${ASSET_MAX_AGE}, immutable`);
      } else if (ext === 'svg' || ext === 'png' || ext === 'jpg' || ext === 'jpeg' || ext === 'ico' || ext === 'webp') {
        headers.set('cache-control', `public, max-age=${ASSET_MAX_AGE}, immutable`);
      } else {
        headers.set('cache-control', `public, max-age=${ASSET_MAX_AGE}`);
      }
    }

    for (const [k, v] of Object.entries(CSP_HEADER)) {
      headers.set(k, v);
    }

    return new Response(assetRes.body, {
      status: assetRes.status,
      headers,
    });
  },
};   