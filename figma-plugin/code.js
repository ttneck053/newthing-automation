/* Classic Figma plugin. Receives editable designs directly from the embedded studio. */
'use strict';
const MAX_FILE_SIZE = 48_000_000;
function check(condition, message) { if (!condition) throw new Error(message || '카드 파일의 형식이 올바르지 않아요. 웹앱에서 다시 내보내 주세요.'); }
const finite = (v, min = -10000, max = 10000) => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
const hex = value => typeof value === 'string' && /^#(?:[\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/i.test(value);
function validatePaint(paint) {
  check(paint && typeof paint === 'object');
  if (paint.type === 'solid') check(hex(paint.color));
  else {
    check(paint.type === 'gradient' && ['horizontal', 'vertical'].includes(paint.axis));
    check(Array.isArray(paint.stops) && paint.stops.length >= 2 && paint.stops.length <= 10);
    let last = -1;
    for (const stop of paint.stops) { check(finite(stop.position, 0, 1) && stop.position >= last && hex(stop.color)); last = stop.position; }
  }
}
function parseBundle(raw) {
  check(typeof raw === 'string' && raw.length <= MAX_FILE_SIZE, '48MB 이하의 AX Figma 파일을 선택해 주세요.');
  let data; try { data = JSON.parse(raw); } catch { throw new Error('JSON 파일을 읽을 수 없어요. 웹앱에서 Figma 파일을 다시 저장해 주세요.'); }
  check(data && data.format === 'ax-contents-figma' && data.version === 1, '지원하는 AX Figma 파일이 아니에요. 웹앱에서 다시 내보내 주세요.');
  check(typeof data.title === 'string' && data.title.length <= 500);
  check(['awesome', 'economic', 'won', 'youtube'].includes(data.channel));
  check(Array.isArray(data.cards) && data.cards.length === (data.channel === 'youtube' ? 1 : 5));
  check(Array.isArray(data.assets) && data.assets.length <= 5);
  const assets = new Set();
  for (const asset of data.assets) {
    check(asset && typeof asset.id === 'string' && /^image-[1-5]$/.test(asset.id) && !assets.has(asset.id));
    check(typeof asset.data === 'string' && asset.data.startsWith('data:image/png;base64,') && asset.data.length <= 32_000_000);
    const base64 = asset.data.slice(22);
    check(base64.length > 0 && base64.length % 4 === 0 && /^[A-Za-z0-9+/]+={0,2}$/.test(base64));
    assets.add(asset.id);
  }
  for (const card of data.cards) {
    check(typeof card.name === 'string' && card.name.length <= 100);
    check(card.width === (data.channel === 'youtube' ? 1920 : 1080) && card.height === (data.channel === 'youtube' ? 1080 : 1350));
    check(Array.isArray(card.nodes) && card.nodes.length > 0 && card.nodes.length <= 150);
    for (const node of card.nodes) {
      check(node && ['text', 'rect', 'ellipse', 'polygon', 'image'].includes(node.type));
      if (node.type === 'polygon') {
        check(Array.isArray(node.points) && node.points.length >= 3 && node.points.length <= 20);
        check(node.points.every(p => Array.isArray(p) && p.length === 2 && p.every(v => finite(v))));
      } else {
        check(finite(node.x) && finite(node.y) && finite(node.width, 0, 5000));
        if (node.type !== 'text') check(finite(node.height, 0.1, 5000) && node.width > 0);
      }
      if (node.type === 'image') {
        check(assets.has(node.asset), '카드에 필요한 사진이 빠져 있어요. 다시 내보내 주세요.');
        check(Array.isArray(node.crop) && node.crop.length === 4 && node.crop.every(v => finite(v, 0, 1)) && node.crop[0] > 0 && node.crop[1] > 0);
        check(node.crop[0] + node.crop[2] <= 1.001 && node.crop[1] + node.crop[3] <= 1.001);
      } else validatePaint(node.paint);
      if (node.type === 'text') {
        check(typeof node.text === 'string' && node.text.length <= 5000);
        check(finite(node.fontSize, 8, 300) && finite(node.lineHeight, 8, 600) && finite(node.weight, 100, 900));
        check(['left', 'center', 'right'].includes(node.align) && node.paint.type === 'solid');
      }
    }
  }
  return data;
}
function rgba(color) {
  let h = color.slice(1); if (h.length < 5) h = [...h].map(c => c + c).join('');
  return { r: parseInt(h.slice(0, 2), 16) / 255, g: parseInt(h.slice(2, 4), 16) / 255, b: parseInt(h.slice(4, 6), 16) / 255, a: h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1 };
}
function toPaint(paint) {
  if (paint.type === 'solid') { const { r, g, b, a } = rgba(paint.color); return { type: 'SOLID', color: { r, g, b }, opacity: a }; }
  return { type: 'GRADIENT_LINEAR', gradientTransform: paint.axis === 'horizontal' ? [[1, 0, 0], [0, 1, 0]] : [[0, 1, 0], [-1, 0, 1]], gradientStops: paint.stops.map(s => ({ position: s.position, color: rgba(s.color) })) };
}
function decodeImage(data) {
  const source = data.slice(22), alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const padding = source.endsWith('==') ? 2 : source.endsWith('=') ? 1 : 0;
  const result = new Uint8Array(source.length / 4 * 3 - padding); let offset = 0;
  for (let i = 0; i < source.length; i += 4) {
    const value = (alphabet.indexOf(source[i]) << 18) | (alphabet.indexOf(source[i + 1]) << 12) | ((alphabet.indexOf(source[i + 2]) & 63) << 6) | (alphabet.indexOf(source[i + 3]) & 63);
    for (const shift of [16, 8, 0]) if (offset < result.length) result[offset++] = (value >> shift) & 255;
  }
  return result;
}
function fontWeight(style) {
  const value = style.toLowerCase().replace(/[\s_-]/g, '');
  if (value.includes('extrabold') || value.includes('ultrabold')) return 800;
  if (value.includes('semibold') || value.includes('demibold')) return 600;
  if (value.includes('black') || value.includes('heavy')) return 900;
  if (value.includes('bold')) return 700;
  if (value.includes('medium')) return 500;
  if (value.includes('thin')) return 100;
  if (value.includes('extralight')) return 200;
  if (value.includes('light')) return 300;
  return 400;
}
async function prepareFonts(api, data) {
  const available = (await api.listAvailableFontsAsync()).map(f => f.fontName).filter(f => !/italic|oblique/i.test(f.style));
  const family = ['Pretendard', 'Pretendard Variable', 'Noto Sans KR', 'Noto Sans CJK KR', 'Inter'].find(name => available.some(f => f.family === name));
  check(family, '사용 가능한 폰트를 찾지 못했어요. Pretendard를 설치하고 Figma를 다시 열어 주세요.');
  const weights = [...new Set(data.cards.flatMap(c => c.nodes.filter(n => n.type === 'text' && n.text).map(n => n.weight)))];
  const fonts = new Map(), loaded = new Set();
  for (const weight of weights) {
    const candidates = available.filter(f => f.family === family).sort((a, b) => Math.abs(fontWeight(a.style) - weight) - Math.abs(fontWeight(b.style) - weight));
    const selected = candidates[0], key = selected.family + '/' + selected.style;
    if (!loaded.has(key)) { await api.loadFontAsync(selected); loaded.add(key); }
    fonts.set(weight, selected);
  }
  return { fonts, family };
}
function makeLayer(api, spec, frame, fonts, images) {
  if (spec.type === 'text' && !spec.text) return;
  let node;
  if (spec.type === 'text') node = api.createText();
  else if (spec.type === 'ellipse') node = api.createEllipse();
  else if (spec.type === 'polygon') node = api.createVector();
  else node = api.createRectangle();
  // Append immediately so a failed import can remove every newly created layer.
  frame.appendChild(node);
  if (spec.type === 'polygon') {
    const minX = Math.min(...spec.points.map(p => p[0])), minY = Math.min(...spec.points.map(p => p[1]));
    node.vectorPaths = [{ windingRule: 'NONZERO', data: spec.points.map((p, i) => `${i ? 'L' : 'M'} ${p[0] - minX} ${p[1] - minY}`).join(' ') + ' Z' }];
    node.x = minX; node.y = minY; node.name = '브랜드 심볼';
  } else {
    if (spec.type === 'text') {
      node.fontName = fonts.get(spec.weight); node.fontSize = spec.fontSize;
      node.lineHeight = { unit: 'PIXELS', value: spec.lineHeight };
      node.textAutoResize = 'WIDTH_AND_HEIGHT'; node.textAlignHorizontal = spec.align.toUpperCase();
      node.characters = spec.text;
      node.name = spec.text.replace(/\n/g, ' ').slice(0, 60);
      node.x = spec.x - (spec.align === 'center' ? node.width / 2 : spec.align === 'right' ? node.width : 0);
    } else { node.resize(spec.width, spec.height); node.x = spec.x; node.name = spec.type === 'image' ? '사진 · 자르기 편집 가능' : spec.type === 'ellipse' ? '페이지 표시' : spec.paint.type === 'gradient' ? '사진 그라데이션' : '배경 / 강조'; }
    node.y = spec.y;
  }
  node.strokes = [];
  if (spec.type === 'image') {
    const [sx, sy, tx, ty] = spec.crop;
    node.fills = [{ type: 'IMAGE', imageHash: images.get(spec.asset), scaleMode: 'CROP', imageTransform: [[sx, 0, tx], [0, sy, ty]] }];
  } else node.fills = [toPaint(spec.paint)];
}
async function importBundle(api, data, arrangement = 'row') {
  check(['row', 'column', 'grid'].includes(arrangement));
  const page = api.currentPage, previousSelection = [...page.selection];
  const { fonts, family } = await prepareFonts(api, data);
  check(api.currentPage === page, '페이지가 바뀌었어요. 가져올 페이지에서 다시 실행해 주세요.');
  const images = new Map();
  for (const asset of data.assets) images.set(asset.id, api.createImage(decodeImage(asset.data)).hash);
  const columns = arrangement === 'column' ? 1 : arrangement === 'grid' ? Math.min(3, data.cards.length) : data.cards.length;
  const gap = 80, width = data.cards[0].width, height = data.cards[0].height;
  let root;
  try {
    root = api.createFrame(); page.appendChild(root);
    root.name = `AX · ${data.title || '카드뉴스'}${data.sample ? ' · 샘플' : ''}`;
    root.fills = []; root.clipsContent = false;
    root.resize(columns * width + (columns - 1) * gap, Math.ceil(data.cards.length / columns) * (height + gap) - gap);
    root.x = Math.round(api.viewport.center.x - root.width / 2); root.y = Math.round(api.viewport.center.y - root.height / 2);
    root.setPluginData('axFormat', '1');
    for (let i = 0; i < data.cards.length; i++) {
      const card = data.cards[i], frame = api.createFrame(); root.appendChild(frame);
      frame.name = card.name; frame.resize(card.width, card.height); frame.fills = []; frame.clipsContent = true;
      frame.x = (i % columns) * (width + gap); frame.y = Math.floor(i / columns) * (height + gap);
      frame.exportSettings = [{ format: 'PNG', constraint: { type: 'SCALE', value: 1 } }];
      for (const node of card.nodes) makeLayer(api, node, frame, fonts, images);
    }
    page.selection = [root]; api.viewport.scrollAndZoomIntoView([root]);
    api.commitUndo();
    return { count: data.cards.length, family, fallback: !family.startsWith('Pretendard') };
  } catch (error) {
    if (root && !root.removed) root.remove();
    page.selection = previousSelection.filter(n => !n.removed);
    throw error;
  }
}
if (typeof figma !== 'undefined') {
  figma.showUI(__html__, { width: 450, height: 620, themeColors: true });
  let importing = false;
  let activeRequestId = '';
  const completed = new Map();
  let studioOrigin = '';
  const storageKey = () => 'ax-figma:' + studioOrigin + ':' + (figma.currentUser?.id || '');
  async function sendContext() {
    const user = figma.currentUser;
    const saved = await figma.clientStorage.getAsync(storageKey()) || {};
    figma.ui.postMessage({ type: 'context', context: { user: user ? { id: user.id, name: user.name } : null, destination: { file: figma.root.name, page: figma.currentPage.name, pageId: figma.currentPage.id } }, connection: saved.connection || null, receipts: saved.receipts || [] });
  }
  if (figma.on) figma.on('currentpagechange', () => { if (studioOrigin) sendContext().catch(() => {}); });
  figma.ui.onmessage = async message => {
    if (message && ['get-context', 'save-connection', 'save-receipt'].includes(message.type)) {
      try {
        if (typeof message.origin !== 'string' || message.origin.length > 250 || !/^https?:\/\//.test(message.origin)) return;
        if (studioOrigin && studioOrigin !== message.origin) return;
        studioOrigin = message.origin;
        if (message.type === 'get-context') { await sendContext(); return; }
        const saved = await figma.clientStorage.getAsync(storageKey()) || {};
        if (message.type === 'save-connection') {
          if (message.connection && !['id', 'token'].every(key => /^[a-f0-9]{64}$/.test(message.connection[key] || ''))) return;
          saved.connection = message.connection || null;
        } else {
          if (!/^[a-f0-9]{64}$/.test(message.jobId || '')) return;
          saved.receipts = [...(saved.receipts || []).filter(r => r.jobId !== message.jobId), { jobId: message.jobId, result: message.result }].slice(-30);
        }
        await figma.clientStorage.setAsync(storageKey(), saved);
      } catch { figma.ui.postMessage({ type: 'storage-error', message: 'Figma 연결 정보를 저장하지 못했어요. 플러그인을 다시 열어 주세요.' }); }
      return;
    }
    if (!message || message.type !== 'import') return;
    const requestId = typeof message.requestId === 'string' && message.requestId.length <= 100 ? message.requestId : '';
    if (requestId && completed.has(requestId)) { figma.ui.postMessage(completed.get(requestId)); return; }
    if (importing) { if (requestId && requestId === activeRequestId) return; figma.ui.postMessage({ type: 'error', requestId, message: '다른 카드가 삽입 중이에요. 완료된 뒤 다시 시도해 주세요.' }); return; }
    importing = true; activeRequestId = requestId;
    try {
      if (message.targetPageId && figma.currentPage.id !== message.targetPageId) throw new Error('받을 페이지가 바뀌었어요. 웹앱에서 대상을 확인하고 다시 보내 주세요.');
      const result = await importBundle(figma, parseBundle(message.raw), message.arrangement);
      const response = { type: 'success', requestId, ...result };
      if (requestId) { completed.set(requestId, response); if (completed.size > 30) completed.delete(completed.keys().next().value); }
      figma.ui.postMessage(response);
      figma.notify(`${result.count}개 카드를 편집 가능한 레이어로 가져왔어요.${result.fallback ? ' Pretendard 대신 ' + result.family + ' 폰트를 사용했어요.' : ''}`);
    } catch (error) { figma.ui.postMessage({ type: 'error', requestId, message: error.message || '삽입에 실패했어요. 콘텐츠와 폰트를 확인해 주세요.' }); }
    finally { importing = false; activeRequestId = ''; }
  };
}
