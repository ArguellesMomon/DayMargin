import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { applyLocalEnvironment } from './local-environment.js';
// Run the same Vercel handlers locally so `npm run dev` has real accounts and sync.
export function localApi(environment) {
    const attach = server => {
      applyLocalEnvironment(environment);
      server.middlewares.use(async (req, res, next) => {
        const path = new URL(req.url, 'http://localhost').pathname;
        const name = path.startsWith('/api/auth/') ? 'auth/[...path]' : ({ '/api/records': 'records', '/api/push': 'push', '/api/finn': 'finn', '/api/apply': 'apply', '/api/account': 'account' })[path];
        if (!name) return next();
        res.status = code => { res.statusCode = code; return res; };
        res.json = body => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(body)); };
        res.send = body => res.end(body);
        try {
          let body = ''; for await (const chunk of req) { body += chunk; if (Buffer.byteLength(body) > 100000) { res.status(413).json({ error: 'This request is too long.' }); return; } }
          req.body = body;
          const { default: handler } = await import(pathToFileURL(resolve(process.cwd(), 'api', `${name}.js`)).href);
          await handler(req, res);
        } catch { if (!res.writableEnded) res.status(503).json({ error: 'The service is temporarily unavailable. Please retry.' }); }
      });
    };
  return { name: 'daymargin-local-api', apply: 'serve', configureServer: attach, configurePreviewServer: attach };
}
