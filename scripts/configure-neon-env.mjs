import { readFile, writeFile } from 'node:fs/promises';
const path = new URL('../.env.local', import.meta.url);
const source = await readFile(path, 'utf8');
const base = source.match(/^NEON_AUTH_BASE_URL=(.+)$/m)?.[1]?.trim();
if (!base) throw new Error('Enable Auth and run neon env pull first.');
const next = source.replace(/^VITE_NEON_AUTH_URL=.*\r?\n?/gm, '').trimEnd();
await writeFile(path, `${next}\nVITE_NEON_AUTH_URL=${base}\n`);
console.log('Public Neon Auth configuration updated. Database credentials remain server-only.');
