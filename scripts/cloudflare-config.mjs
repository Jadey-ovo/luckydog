// Generate a gitignored deployment config; local dev never needs credentials.
import { readFileSync, writeFileSync } from 'node:fs';
const databaseId = process.env.CLOUDFLARE_D1_DATABASE_ID;
if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(databaseId || '') || databaseId === '00000000-0000-0000-0000-000000000000') {
  throw new Error('请先设置 GitHub Variable CLOUDFLARE_D1_DATABASE_ID（D1 数据库 UUID）');
}
const config = JSON.parse(readFileSync(new URL('../wrangler.json', import.meta.url), 'utf8'));
config.d1_databases[0].database_id = databaseId;
writeFileSync(new URL('../wrangler.deploy.json', import.meta.url), JSON.stringify(config, null, 2) + '\n');
