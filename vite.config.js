import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'

console.log("=== VITE STARTUP DIAGNOSTICS ===");
console.log("VITE_SUPABASE_URL:", process.env.VITE_SUPABASE_URL);
console.log("VITE_SUPABASE_ANON_KEY:", process.env.VITE_SUPABASE_ANON_KEY ? "DEFINED" : "UNDEFINED");
console.log("================================");

const apiMiddlewarePlugin = () => ({
  name: 'api-middleware',
  configureServer(server) {
    server.middlewares.use(async (req, res, next) => {
      if (req.url.startsWith('/api/')) {
        const urlPath = req.url.split('?')[0];
        const apiName = urlPath.replace('/api/', '');
        const fs = await import('node:fs');
        const path = await import('node:path');
        const filePath = path.resolve(process.cwd(), 'api', `${apiName}.js`);
        
        if (fs.existsSync(filePath)) {
          try {
            // Read body if POST/PUT
            if (req.method === 'POST' || req.method === 'PUT') {
              let bodyStr = '';
              for await (const chunk of req) {
                bodyStr += chunk;
              }
              try {
                req.body = bodyStr ? JSON.parse(bodyStr) : {};
              } catch {
                req.body = bodyStr;
              }
            }

            // Mock Vercel response helper
            res.status = (code) => {
              res.statusCode = code;
              return res;
            };
            res.json = (data) => {
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(data));
              return res;
            };

            const mod = await import(`file://${filePath}?t=${Date.now()}`);
            return await mod.default(req, res);
          } catch (err) {
            console.error('[API Middleware Error]:', err);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify({ error: err.message }));
          }
        }
      }
      next();
    });
  }
});

export default defineConfig({
  plugins: [react(), apiMiddlewarePlugin()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});

