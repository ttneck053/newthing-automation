import { copyFile, mkdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
export async function buildStatic(directory) {
if (!['dist-cloudflare', 'dist-vercel'].includes(directory)) throw new Error('Unknown static build directory');
const output = resolve(root, directory);
await rm(output, { recursive: true, force: true });
await mkdir(resolve(output, 'media'), { recursive: true });
await mkdir(resolve(output, 'figma-plugin'), { recursive: true });
for (const name of ['manifest.json', 'code.js', 'ui.html', 'README.md']) await copyFile(resolve(root, 'figma-plugin', name), resolve(output, 'figma-plugin', name));
for (const [source, destination] of [
  ['index.html', 'index.html'], ['app.js', 'app.js'], ['styles.css', 'styles.css'],
  ['figma-export.js', 'figma-export.js'],
  ['figma-client.js', 'figma-client.js'], ['figma-receiver.html', 'figma-receiver.html'], ['figma-receiver.js', 'figma-receiver.js'], ['figma-receiver.css', 'figma-receiver.css'], ['figma-package.js', 'figma-package.js'],
  ['assets/pretendard.woff2', 'font.woff2'], ['assets/font-license.txt', 'font-license.txt'],
  ['assets/city.jpg', 'media/city.jpg'], ['assets/markets.jpg', 'media/markets.jpg'], ['assets/desk.jpg', 'media/desk.jpg']
]) await copyFile(resolve(root, 'web', source), resolve(output, destination));
return output;
}
