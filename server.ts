import 'dotenv/config';
import path from 'node:path';
import express from 'express';
import { pythonBridge } from './server/persistence/PythonBridge.ts';
import { apiRouter } from './server/routes/api.ts';

async function startServer() {
  // Boot and verify the Python 3.10 + SQLite3 CRM microservice
  await pythonBridge.ensureStarted();

  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  const allowedOrigin = process.env.CORS_ALLOWED_ORIGIN || '*';

  // CORS support for decoupled Frontend (Vercel) + Backend (Hugging Face Spaces / Render)
  app.use((req, res, next) => {
    const requestOrigin = req.headers.origin;
    if (allowedOrigin === '*') {
      res.setHeader('Access-Control-Allow-Origin', requestOrigin || '*');
    } else {
      const allowedList = allowedOrigin.split(',').map((o) => o.trim());
      if (requestOrigin && allowedList.includes(requestOrigin)) {
        res.setHeader('Access-Control-Allow-Origin', requestOrigin);
      }
    }
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
    next();
  });

  app.use(express.json({ limit: '2mb' }));

  // Mount API routes strictly before Vite or static middleware
  app.use('/api', apiRouter);

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Aetheris Gateway + Python 3 CRM Engine running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error('Failed to start Aetheris server:', error);
  process.exit(1);
});
