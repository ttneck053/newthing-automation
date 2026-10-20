import { buildStatic } from './build-static.mjs';
await buildStatic('dist-vercel');
console.log('Built static assets for Vercel; API routes use the shared server handler.');
