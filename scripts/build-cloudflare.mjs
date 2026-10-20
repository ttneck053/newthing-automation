import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { buildStatic } from './build-static.mjs';

const output = await buildStatic('dist-cloudflare');
await writeFile(resolve(output, '_redirects'), '/generate /index.html 200\n/blog /index.html 200\n/research /index.html 200\n');
await writeFile(resolve(output, '_headers'), `/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: no-referrer
  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data: blob:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'
`);
console.log('Built Cloudflare static assets; only /api/* runs on Workers Free.');
