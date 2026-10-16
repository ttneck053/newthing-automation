import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const root = resolve(import.meta.dirname, '..');
const assets = {};
for (const [name, file, binary] of [
  ['html', 'web/index.html'], ['css', 'web/styles.css'], ['js', 'web/app.js'], ['license', 'web/assets/font-license.txt'],
  ['font', 'web/assets/pretendard.woff2', true], ['city', 'web/assets/city.jpg', true], ['markets', 'web/assets/markets.jpg', true], ['desk', 'web/assets/desk.jpg', true]
]) { const data = await readFile(resolve(root, file)); assets[name] = data.toString(binary ? 'base64' : 'utf8'); }
const server = await readFile(resolve(root, 'worker/server.mjs'), 'utf8');
await writeFile(resolve(root, 'worker/index.js'), `${server}\nconst SITE_ASSETS = ${JSON.stringify(assets)};\n`);
console.log('Compiled application, images, and Korean font into Worker');
