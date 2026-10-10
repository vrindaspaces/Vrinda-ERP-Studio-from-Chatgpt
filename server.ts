import express from 'express';
import path from 'path';
import {fileURLToPath} from 'url';
import {handleApiRequest} from './server/dev-middleware.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// API routes handled by worker & sqlite DB
app.use('/api', (req, res, next) => {
  handleApiRequest(req, res, next);
});

// Serve frontend assets
const distPath = path.resolve(__dirname, 'dist');
app.use(express.static(distPath));

// Fallback to index.html for client-side routing
app.get('*', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`ERP Studio server running at http://0.0.0.0:${PORT}`);
});
