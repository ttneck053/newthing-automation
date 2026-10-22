import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const root = resolve(import.meta.dirname, '..');
const assets = {};
for (const [name, file, binary] of [
  ['html', 'web/index.html'], ['css', 'web/styles.css'], ['js', 'web/app.js'], ['license', 'web/assets/font-license.txt'],
  ['figmaExport', 'web/figma-export.js'], ['pluginManifest', 'figma-plugin/manifest.json'], ['pluginCode', 'figma-plugin/code.js'], ['pluginUI', 'figma-plugin/ui.html'], ['pluginReadme', 'figma-plugin/README.md'],
  ['figmaClient', 'web/figma-client.js'], ['figmaReceiver', 'web/figma-receiver.html'], ['figmaReceiverJs', 'web/figma-receiver.js'], ['figmaReceiverCss', 'web/figma-receiver.css'], ['figmaPackage', 'web/figma-package.js'],
  ['font', 'web/assets/pretendard.woff2', true], ['city', 'web/assets/city.jpg', true], ['markets', 'web/assets/markets.jpg', true], ['desk', 'web/assets/desk.jpg', true]
]) { const data = await readFile(resolve(root, file)); assets[name] = data.toString(binary ? 'base64' : 'utf8'); }
const relay = (await readFile(resolve(root, 'worker/figma-relay.mjs'), 'utf8')).replaceAll('export function ', 'function ').replaceAll('export async function ', 'async function ');
const server = relay + '\n' + (await readFile(resolve(root, 'worker/server.mjs'), 'utf8')).replace("import { createFigmaRelay, createD1RelayStore, cleanFigmaRelay } from './figma-relay.mjs';", '');
await writeFile(resolve(root, 'worker/index.js'), `${server}\nconst SITE_ASSETS = ${JSON.stringify(assets)};\n`);
console.log('Compiled application, images, and Korean font into Worker');
