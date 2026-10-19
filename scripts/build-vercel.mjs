import { copyFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const output = resolve(root, 'dist-vercel');
await mkdir(resolve(output, 'media'), { recursive: true });
for (const [source, destination] of [
  ['index.html', 'index.html'], ['app.js', 'app.js'], ['styles.css', 'styles.css'],
  ['assets/pretendard.woff2', 'font.woff2'], ['assets/font-license.txt', 'font-license.txt'],
  ['assets/city.jpg', 'media/city.jpg'], ['assets/markets.jpg', 'media/markets.jpg'], ['assets/desk.jpg', 'media/desk.jpg']
]) await copyFile(resolve(root, 'web', source), resolve(output, destination));
console.log('Built static assets for Vercel; API routes use the shared server handler.');
