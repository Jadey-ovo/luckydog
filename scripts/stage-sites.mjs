// Stage the existing React build and shared Worker for Sites, without changing
// the normal desktop / GitHub Pages / standalone Cloudflare build layout.
import { cp, mkdir, readFile, rm, mkdtemp } from 'node:fs/promises';
import { resolve } from 'node:path';
import { build } from 'esbuild';
const manifest = JSON.parse(await readFile('.openai/hosting.json', 'utf8'));
if (manifest.d1 !== 'DB' || !manifest.project_id) throw new Error('Register this Site and enable its DB binding before staging');
await readFile('dist/index.html'); // Fail rather than restaging an already staged artifact.
await mkdir('.wrangler', { recursive: true });
const scratch = await mkdtemp(resolve('.wrangler/sites-stage-'));
try {
  await cp('dist', scratch, { recursive: true });
  await rm('dist', { recursive: true });
  await mkdir('dist/client', { recursive: true });
  await cp(scratch, 'dist/client', { recursive: true });
  await mkdir('dist/.openai', { recursive: true });
  await cp('.openai/hosting.json', 'dist/.openai/hosting.json');
  await cp('drizzle', 'dist/.openai/drizzle', { recursive: true });
  await build({ entryPoints: ['worker/sites.mjs'], bundle: true, format: 'esm', platform: 'browser', target: 'es2022', outfile: 'dist/server/index.js' });
} finally {
  await rm(scratch, { recursive: true, force: true });
}
console.log('Sites artifact ready: React assets, shared Worker API, D1 migrations');
