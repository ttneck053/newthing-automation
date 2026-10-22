import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const context = vm.createContext({ Uint8Array });
vm.runInContext(readFileSync(new URL('../figma-plugin/code.js', import.meta.url), 'utf8'), context);
const { parseBundle, importBundle, decodeImage } = context;
const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==';
const fixture = () => ({
  format: 'folio-figma', version: 1, title: '한글 카드 테스트', channel: 'editorial', assets: [{ id: 'image-1', data: 'data:image/png;base64,' + png }],
  cards: Array.from({ length: 5 }, (_, i) => ({ name: `${i + 1} · card`, width: 1080, height: 1350, nodes: [
    { type: 'image', x: 0, y: 0, width: 1080, height: 1350, asset: 'image-1', crop: [0.5, 1, 0.25, 0] },
    { type: 'rect', x: 0, y: 0, width: 1080, height: 1350, paint: { type: 'gradient', axis: 'horizontal', stops: [{ position: 0, color: '#000f' }, { position: 1, color: '#0000' }] } },
    { type: 'text', x: 960, y: 100, width: 1000, text: '첫 줄\n둘째 줄', fontSize: 80, weight: 850, lineHeight: 96, align: 'center', paint: { type: 'solid', color: '#fff' } }
  ] }))
});
function mockFigma({ fallback = false, failText = false, failImage = false } = {}) {
  let counter = 0; const loaded = new Set(), all = [];
  const node = type => {
    const n = { type, id: String(++counter), children: [], removed: false, width: 100, height: 100,
      appendChild(child) { if (child.parent) child.parent.children = child.parent.children.filter(n => n !== child); this.children.push(child); child.parent = this; },
      resize(w, h) { assert(w > 0 && h > 0); this.width = w; this.height = h; },
      setPluginData() {},
      remove() { for (const child of [...this.children]) child.remove(); this.removed = true; if (this.parent) this.parent.children = this.parent.children.filter(n => n !== this); }
    };
    if (type === 'TEXT') Object.defineProperty(n, 'characters', { get() { return this.text; }, set(value) {
      assert(loaded.has(this.fontName.family + '/' + this.fontName.style), 'font must load before text');
      if (failText) throw new Error('text failure'); this.text = value; this.width = 420;
    } });
    all.push(n); return n;
  };
  const page = node('PAGE'), existing = node('FRAME'); page.appendChild(existing); page.selection = [existing];
  const create = type => () => { const n = node(type); page.appendChild(n); return n; };
  const api = {
    currentPage: page, viewport: { center: { x: 100, y: 200 }, scrollAndZoomIntoView(nodes) { api.zoomed = nodes; } },
    createFrame: create('FRAME'), createRectangle: create('RECTANGLE'), createText: create('TEXT'), createEllipse: create('ELLIPSE'), createVector: create('VECTOR'),
    async listAvailableFontsAsync() { return ['Regular', 'Medium', 'SemiBold', 'Bold', 'ExtraBold'].map(style => ({ fontName: { family: fallback ? 'Noto Sans KR' : 'Pretendard', style } })); },
    async loadFontAsync(f) { loaded.add(f.family + '/' + f.style); },
    createImage(bytes) { if (failImage) throw new Error('image failure'); assert.deepEqual([...bytes.slice(0, 8)], [137,80,78,71,13,10,26,10]); return { hash: 'image-hash' }; },
    commitUndo() { api.committed = true; }
  };
  return { api, page, existing, all };
}
test('imports real editable text, cropped photos, gradients and PNG export settings', async () => {
  const data = parseBundle(JSON.stringify(fixture())); const { api, page, existing } = mockFigma();
  const result = await importBundle(api, data, 'row');
  assert.equal(result.count, 5); assert.equal(result.fallback, false);
  assert.equal(page.children.length, 2); assert.equal(page.children[0], existing);
  const root = page.children[1], frame = root.children[0], [image, gradient, text] = frame.children;
  assert.equal(frame.width, 1080); assert.equal(frame.height, 1350); assert.equal(frame.exportSettings[0].format, 'PNG');
  assert.equal(text.type, 'TEXT'); assert.equal(text.characters, '첫 줄\n둘째 줄'); assert.equal(text.fontName.style, 'ExtraBold'); assert.equal(text.x, 960 - 210);
  assert.equal(image.fills[0].scaleMode, 'CROP'); assert.equal(image.fills[0].imageTransform[0][2], 0.25);
  assert.equal(gradient.fills[0].type, 'GRADIENT_LINEAR'); assert.equal(gradient.fills[0].gradientStops[1].color.a, 0);
  assert.equal(page.selection[0], root); assert(api.committed);
});
test('arranges all five cards without altering existing content; repeated import adds a new group', async () => {
  const data = fixture(); data.channel = 'brief'; data.cards = Array.from({ length: 5 }, (_, i) => ({ ...structuredClone(data.cards[0]), name: String(i), width: 1080, height: 1350 }));
  const { api, page } = mockFigma();
  await importBundle(api, parseBundle(JSON.stringify(data)), 'grid');
  const root = page.children[1]; assert.equal(root.children.length, 5);
  assert.equal(root.children[3].x, 0); assert.equal(root.children[3].y, 1430);
  await importBundle(api, parseBundle(JSON.stringify(data)), 'column');
  assert.equal(page.children.length, 3); assert.equal(page.children[2].children[4].y, 5720);
});
test('rejects wrong versions, dimensions, invalid geometry, missing photos, invalid base64 and oversized layers', () => {
  for (const mutate of [
    d => { d.version = 2; }, d => { d.cards[0].width = 1920; }, d => { d.cards = []; }, d => { d.cards = d.cards.slice(0, 1); }, d => { d.channel = 'unsupported'; },
    d => { d.cards[0].nodes[0].x = null; }, d => { d.cards[0].nodes[0].crop[0] = 0; },
    d => { d.cards[0].nodes[0].asset = 'missing'; }, d => { d.assets[0].data = 'https://example.com/photo.png'; },
    d => { d.assets[0].data = 'data:image/png;base64,!!!!'; }, d => { d.cards[0].nodes[2].text = 'x'.repeat(5001); },
    d => { d.cards[0].nodes[1].paint.stops[1].position = -1; }, d => { d.cards[0].nodes[2].paint.color = 'red'; }
  ]) { const data = fixture(); mutate(data); assert.throws(() => parseBundle(JSON.stringify(data))); }
  assert.throws(() => parseBundle('not json')); assert.throws(() => parseBundle('null'));
});
test('rolls back every new node and restores selection when layer creation fails', async () => {
  const { api, page, existing, all } = mockFigma({ failText: true });
  await assert.rejects(importBundle(api, fixture()), /text failure/);
  assert.equal(page.children.length, 1); assert.equal(page.children[0], existing); assert.equal(page.selection[0], existing);
  assert(all.filter(n => n !== page && n !== existing).every(n => n.removed));
});
test('a corrupt photo or unavailable fonts fails before creating frames', async () => {
  const { api, page } = mockFigma({ failImage: true });
  await assert.rejects(importBundle(api, fixture()), /image failure/); assert.equal(page.children.length, 1);
  api.listAvailableFontsAsync = async () => [];
  await assert.rejects(importBundle(api, fixture()), /폰트/); assert.equal(page.children.length, 1);
});
test('reports Korean font fallback and prevents page changes during font loading', async () => {
  const { api, page } = mockFigma({ fallback: true });
  const result = await importBundle(api, fixture()); assert.equal(result.fallback, true); assert.equal(result.family, 'Noto Sans KR');
  api.loadFontAsync = async () => { api.currentPage = {}; };
  await assert.rejects(importBundle(api, fixture()), /페이지가 바뀌었어요/); assert.equal(page.children.length, 2);
});
test('decodes embedded image bytes without network access or browser-only globals', () => {
  assert.deepEqual(Buffer.from(decodeImage('data:image/png;base64,' + png)), Buffer.from(png, 'base64'));
  const manifest = JSON.parse(readFileSync(new URL('../figma-plugin/manifest.json', import.meta.url)));
  assert.deepEqual(manifest.networkAccess.allowedDomains, ['none']); assert.equal(manifest.documentAccess, 'dynamic-page');
});
test('plugin request IDs prevent duplicate frames and route import failures back to the caller', async () => {
  const { api, page } = mockFigma(), messages = [];
  api.ui = { postMessage: msg => messages.push(msg) }; api.notify = () => {}; api.showUI = () => {};
  const ctx = vm.createContext({ Uint8Array, figma: api, __html__: '' });
  vm.runInContext(readFileSync(new URL('../figma-plugin/code.js', import.meta.url), 'utf8'), ctx);
  const request = { type: 'import', requestId: 'transfer-1', raw: JSON.stringify(fixture()), arrangement: 'row' };
  const first = api.ui.onmessage(request);
  await api.ui.onmessage(request); await first;
  assert.equal(page.children.length, 2); assert.equal(messages.length, 1);
  await api.ui.onmessage(request);
  assert.equal(page.children.length, 2); assert.equal(messages.at(-1).requestId, 'transfer-1'); assert.equal(messages.at(-1).type, 'success');
  await api.ui.onmessage({ ...request, requestId: 'transfer-2', raw: 'invalid json' });
  assert.equal(messages.at(-1).type, 'error'); assert.equal(messages.at(-1).requestId, 'transfer-2'); assert.equal(page.children.length, 2);
  await api.ui.onmessage({ ...request, requestId: 'transfer-3', targetPageId: 'wrong-page' });
  assert.equal(messages.at(-1).type, 'error'); assert.equal(page.children.length, 2);
});

test('plugin restores connections by studio and Figma user, persists receipts, and follows page changes', async () => {
  const { api, page } = mockFigma(), messages = [], storage = new Map(), events = {};
  api.currentUser = {id:'user-1',name:'테스트'}; api.root = {name:'파일'}; page.name='페이지';
  api.clientStorage = {getAsync:async key=>storage.get(key),setAsync:async(key,value)=>storage.set(key,structuredClone(value))};
  api.ui = {postMessage:msg=>messages.push(msg)}; api.showUI=()=>{}; api.on=(name,fn)=>events[name]=fn;
  vm.runInContext(readFileSync(new URL('../figma-plugin/code.js', import.meta.url),'utf8'),vm.createContext({Uint8Array,figma:api,__html__:''}));
  const origin='https://studio.example', connection={id:'a'.repeat(64),token:'b'.repeat(64)};
  await api.ui.onmessage({type:'save-connection',origin,connection});
  await api.ui.onmessage({type:'save-receipt',origin,jobId:'c'.repeat(64),result:{count:5}});
  await api.ui.onmessage({type:'get-context',origin});
  assert.equal(messages.at(-1).connection.id,connection.id); assert.equal(messages.at(-1).receipts[0].result.count,5);
  assert.equal(messages.at(-1).context.destination.pageId,page.id);
  page.name='새 페이지'; events.currentpagechange(); await new Promise(resolve=>setImmediate(resolve));
  assert.equal(messages.at(-1).context.destination.page,'새 페이지');
  api.currentUser={id:'user-2',name:'다른 계정'};
  await api.ui.onmessage({type:'get-context',origin}); assert.equal(messages.at(-1).connection,null);
  const length=messages.length; await api.ui.onmessage({type:'get-context',origin:'https://other.example'}); assert.equal(messages.length,length);
});

test('shared card renderer emits the expected editable scene for every visual channel and palette', () => {
  const app = readFileSync(new URL('../web/app.js', import.meta.url), 'utf8');
  const drawing = app.slice(app.indexOf('function wrap('), app.indexOf('async function renderOne('));
  const ctx = vm.createContext({});
  vm.runInContext(readFileSync(new URL('../web/figma-export.js', import.meta.url), 'utf8'), ctx);
  vm.runInContext(`const CHANNELS = { editorial: ['에디토리얼', 'EDITORIAL'], contrast: ['콘트라스트', 'CONTRAST'], brief: ['브리프', 'BRIEF'] }; ${drawing}`, ctx);
  const measure = { measureText(text) { return { width: [...text].length * Number(this.font.match(/([\d.]+)px/)[1]) * 0.6 }; } };
  const image = { width: 1600, height: 1000 }, imageIds = new Map([[image, 'image-1']]);
  for (const channel of ['editorial', 'contrast', 'brief']) for (const palette of ['white', 'cream', 'dark']) {
    const state = { palette, content: { hook: '카드 제목\n두 번째 줄', body1: '첫 번째 본문입니다.', body2: '두 번째 본문입니다.', phrase: 'Follow the money', meaning: '돈의 흐름', cta: '저장해 주세요', hashtags: ['#테스트'] }, cards: Array.from({length: 5}, () => ({ pos: 20, align: 'right', size1: 110, size2: 100, color1: '#ffffff', color2: '#ffe455', highlight1: true })) };
    const cards = Array.from({ length: 5 }, (_, i) => {
      const canvas = {}, context = new ctx.FolioFigma.SceneContext(measure, imageIds);
      ctx.drawCard(canvas, i, image, { state, channel, context });
      assert(context.nodes.some(n => n.type === 'text')); assert.equal(context.nodes.filter(n => n.type === 'image').length, 1);
      if (i === 0) assert(context.nodes.some(n => n.type === 'rect' && n.paint.color === '#ffe14d'));
      return { name: String(i), width: canvas.width, height: canvas.height, nodes: context.nodes };
    });
    assert.doesNotThrow(() => parseBundle(JSON.stringify({ ...fixture(), channel, cards })));
  }
});
