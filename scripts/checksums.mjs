import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
const directory = process.argv[2] || 'release';
const names = (await readdir(directory)).filter(name => /\.(exe|dmg|zip)$/.test(name)).sort();
if (names.length === 0) throw new Error('No installers to checksum');
const rows = await Promise.all(names.map(async name => `${createHash('sha256').update(await readFile(join(directory, name))).digest('hex')}  ${name}`));
await writeFile(join(directory, 'SHA256SUMS.txt'), rows.join('\n') + '\n');
