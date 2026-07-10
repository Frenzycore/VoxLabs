// Dev-only proxy for /api routes that normally live in the Cloudflare Worker.
// Active only under `astro dev`/`astro preview` via a Vite plugin; never
// bundled into the static build. Mirrors src/worker.js handleVisitors().

const UPSTREAMS = {
  visitors: 'https://visitors.ornzora.workers.dev/@voxlabs',
};

function devProxyPlugin() {
  return {
    name: 'vox-labs-dev-proxy',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url, 'http://localhost');
        if (url.pathname !== '/api/visitors') return next();
        try {
          const upstream = await fetch(UPSTREAMS.visitors);
          const text = await upstream.text();
          res.statusCode = upstream.status;
          res.setHeader('content-type', 'application/json');
          res.end(text);
        } catch {
          res.statusCode = 200;
          res.setHeader('content-type', 'application/json');
          res.end(JSON.stringify({ visitors: null }));
        }
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url, 'http://localhost');
        if (url.pathname !== '/api/visitors') return next();
        try {
          const upstream = await fetch(UPSTREAMS.visitors);
          const text = await upstream.text();
          res.statusCode = upstream.status;
          res.setHeader('content-type', 'application/json');
          res.end(text);
        } catch {
          res.statusCode = 200;
          res.setHeader('content-type', 'application/json');
          res.end(JSON.stringify({ visitors: null }));
        }
      });
    },
  };
}

export function devProxy() {
  return {
    name: 'vox-labs-dev-proxy-integration',
    hooks: {
      'astro:config:setup'({ updateConfig, command }) {
        if (command === 'dev' || command === 'preview') {
          updateConfig({
            vite: { plugins: [devProxyPlugin()] },
          });
        }
      },
    },
  };
}
