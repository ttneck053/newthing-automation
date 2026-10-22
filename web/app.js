'use strict';
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const CHANNELS = { editorial: ['에디토리얼', 'EDITORIAL'], contrast: ['콘트라스트', 'CONTRAST'], brief: ['브리프', 'BRIEF'] };
const STORAGE = 'folio-studio-v1';
// Move this origin's previous installation data to the current storage namespace.
// Suffixes describe data types; no previous display names are needed.
function readStored(key, previousSuffix) {
  const current = localStorage.getItem(key);
  if (current !== null) return current;
  const previous = Object.keys(localStorage).find(name => name !== key && name.endsWith(previousSuffix));
  if (!previous) return null;
  const value = localStorage.getItem(previous);
  try { localStorage.setItem(key, value); localStorage.removeItem(previous); } catch {}
  return value;
}
const sampleContent = {
  title: '금리가 바뀌면, 내 돈의 흐름도 바뀐다', hook: '금리가 움직이면\n내 돈은 어디로?',
  body1: '금리는 돈을 빌릴 때 내는 비용이자, 돈을 맡길 때 받는 보상이에요. 기준금리가 바뀌면 은행의 예금·대출 금리에도 영향을 줍니다. 금리가 내려가면 대출자의 이자 부담이 줄어들 수 있지만, 예금으로 받을 수 있는 이자도 낮아질 수 있어요. 다만 모든 금융상품의 금리가 동시에, 같은 폭으로 움직이는 건 아닙니다. 내 상품의 고정·변동금리 여부와 금리 변경 시점을 먼저 살펴보세요.',
  body2: '중앙은행은 물가와 경기 상황을 살피며 기준금리를 결정해요. 금리를 낮추면 소비와 투자가 늘어날 여지가 생기고, 높이면 물가 상승 압력을 줄이는 데 도움이 될 수 있죠. 하지만 금리 변화가 경제에 전달되기까지는 시간이 걸립니다. 예금, 대출, 주식, 부동산도 서로 다르게 반응할 수 있어요. 뉴스 속 금리 숫자 하나만 보기보다, 왜 바뀌었는지와 내 자산에 어떤 영향을 줄지 함께 살펴보세요.',
  phrase: 'Follow the money', meaning: '돈의 흐름을 따라가다.\n경제 뉴스 속 변화를 읽는 첫걸음이에요.', cta: '오늘의 돈 공부, 저장하고\n다음 이야기에서 또 만나요.', hashtags: ['#금리공부', '#경제상식', '#돈의흐름'],
};
const makeCards = () => ['hook', 'body1', 'body2', 'expression', 'cta'].map((kind, i) => ({ kind, image: '', pos: 50, color1: '#ffffff', color2: '#ffffff', size1: 110, size2: 110, highlight1: false, highlight2: false, align: 'center', id: i }));
let state = { content: null, cards: makeCards(), palette: 'white', article: null, sample: false, model: 'gpt-5.4-mini', input: '' };
try {
  const saved = JSON.parse(readStored(STORAGE, '-contents-studio-v1'));
  if (saved?.version === 1 && saved.state && Array.isArray(saved.state.cards) && saved.state.cards.length === 5 && saved.state.cards.every(c => typeof c.image === 'string')) state = { ...state, ...saved.state };
} catch {}
let channel = routeChannel(), apiKey = '', serverKey = false, busy = false, controller = null, imageIndex = 0, previewIndex = 0, selectedCard = 0, saveTimer, toastTimer, figmaExporting = false;
const GPT_KEY_STORAGE = 'folio-openai-key-v1', FIGMA_CONNECTION_STORAGE = 'folio-figma-connection-v1';
let figmaConnection = null, figmaStatus = null, figmaPolling = false;
try { apiKey = readStored(GPT_KEY_STORAGE, '-openai-key-v1') || ''; } catch {}
try { const saved = JSON.parse(readStored(FIGMA_CONNECTION_STORAGE, '-figma-connection-v1')); if (saved && /^[a-f0-9]{64}$/.test(saved.id) && /^[a-f0-9]{64}$/.test(saved.token)) figmaConnection = saved; } catch {}
const imageCache = new Map();
const renderSequence = [0, 0, 0, 0, 0];
function routeChannel() {
  const d = new URLSearchParams(location.search).get('design');
  return Object.hasOwn(CHANNELS, d) ? d : 'editorial';
}
function persist() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try { localStorage.setItem(STORAGE, JSON.stringify({ version: 1, state })); $('#save-state').textContent = '자동 저장됨'; }
    catch { $('#save-state').textContent = '저장 공간이 부족해요 · 다운로드로 보관하세요'; }
  }, 300);
}
function toast(message) { clearTimeout(toastTimer); $('#toast').textContent = message; $('#toast').hidden = false; toastTimer = setTimeout(() => $('#toast').hidden = true, 3000); }
function showError(message) { $('#error').textContent = message; $('#error').hidden = !message; }
function field(id, label, small = false, limit = 0) {
  return `<label class="control-label" for="${id}"><span>${label}</span>${limit ? `<span class="char-count" data-count="${id}">0 / ${limit}</span>` : ''}</label><textarea class="editor-textarea ${small ? 'small' : ''}" id="${id}" ${limit ? `maxlength="${limit === 30 ? 120 : 1000}"` : ''}></textarea>`;
}
function buildEditors() {
  const labels = ['표지', '핵심 내용', '배경과 맥락', '한 줄 표현', '마무리'];
  $('#card-tabs').innerHTML = labels.map((label, i) => `<button class="card-tab" id="card-tab-${i}" role="tab" aria-controls="card-panel-${i}" aria-selected="${i === selectedCard}" tabindex="${i === selectedCard ? 0 : -1}" data-select-card="${i}"><canvas id="thumbnail-${i}" width="160" height="200" aria-hidden="true"></canvas><span><b>0${i + 1}</b> ${label}</span></button>`).join('');
  $('#cards-grid').innerHTML = state.cards.map((c, i) => {
    let editor = '';
    if (i === 0) editor = field('hook', '제목', true, 30);
    if (i === 1) editor = field('body1', '핵심 내용', false, 220);
    if (i === 2) editor = field('body2', '배경과 맥락', false, 220);
    if (i === 3) editor = field('phrase', '한 줄 표현', true) + field('meaning', '설명', true);
    if (i === 4) editor = field('cta', '마지막 한마디', true) + '<span class="control-label">해시태그</span>' + [0, 1, 2].map(n => `<input id="tag-${n}" class="tag-input" aria-label="해시태그 ${n + 1}" maxlength="50" placeholder="#해시태그">`).join('');
    const position = i === 4 ? `<div class="control-label">이미지·문구 정렬</div><div class="position-control">${['left', 'center', 'right'].map((p, j) => `<button data-action="align" data-value="${p}" data-i="${i}" class="${c.align === p ? 'selected' : ''}">${['왼쪽', '중앙', '오른쪽'][j]}</button>`).join('')}</div>` : `<div class="control-label">사진 좌우 이동</div><div class="position-control"><button data-action="move" data-delta="-10" data-i="${i}" aria-label="${labels[i]} 사진 왼쪽으로">←</button><span id="position-${i}">중앙</span><button data-action="move" data-delta="10" data-i="${i}" aria-label="${labels[i]} 사진 오른쪽으로">→</button></div>`;
    const type = i === 0 ? '<div class="type-settings">' + [1, 2].map(n => `<div class="style-line"><span>${n === 1 ? '윗줄' : '아랫줄'}</span><input type="color" data-style="color${n}" data-i="0" value="${c['color' + n]}" aria-label="${n === 1 ? '윗줄' : '아랫줄'} 글자색"><input type="number" min="36" max="160" step="2" value="${c['size' + n]}" data-style="size${n}" data-i="0" aria-label="${n === 1 ? '윗줄' : '아랫줄'} 글자 크기"><span>px</span><label><input type="checkbox" data-style="highlight${n}" data-i="0" ${c['highlight' + n] ? 'checked' : ''} aria-label="${n === 1 ? '윗줄' : '아랫줄'} 배경 강조"> 강조</label></div>`).join('') + '</div>' : '';
    return `<article class="card-column" data-card="${i}" id="card-panel-${i}" role="tabpanel" aria-labelledby="card-tab-${i}" ${i === selectedCard ? '' : 'hidden'}><div class="card-stage"><button class="card-preview" data-action="preview" data-i="${i}" aria-label="${labels[i]} 카드 크게 보기" disabled><canvas id="canvas-${i}" width="1080" height="1350"></canvas><span class="preview-hover">크게 보기 ↗</span></button><button class="mini-download text-button" data-action="download" data-i="${i}" aria-label="${labels[i]} PNG 다운로드" disabled>이 카드 다운로드 ↓</button></div><div class="card-editor"><h3><span>0${i + 1}</span> ${labels[i]}</h3>${editor}<button class="image-button" data-action="image" data-i="${i}">사진 바꾸기 <span aria-hidden="true">↗</span></button><details class="card-adjustments"><summary>${i === 0 ? '글자·사진 세부 조정' : '사진 위치 조정'}</summary>${type}${position}</details></div></article>`;
  }).join('');
  syncFields();
}
function selectCard(index, focus = false) {
  selectedCard = index;
  $$('[data-select-card]').forEach(button => {
    const active = Number(button.dataset.selectCard) === index;
    button.setAttribute('aria-selected', active); button.tabIndex = active ? 0 : -1;
    if (active && focus) button.focus();
  });
  $$('[data-card]').forEach(panel => panel.hidden = Number(panel.dataset.card) !== index);
}
function syncFields() {
  const c = state.content;
  ['hook', 'body1', 'body2', 'phrase', 'meaning', 'cta'].forEach(k => { if ($('#' + k)) $('#' + k).value = c?.[k] || ''; });
  [0, 1, 2].forEach(i => $('#tag-' + i).value = c?.hashtags?.[i] || '');
  $$('[data-style]').forEach(el => { const value = state.cards[Number(el.dataset.i)][el.dataset.style]; if (el.type === 'checkbox') el.checked = Boolean(value); else el.value = value; });
  updateCounts();
  state.cards.forEach((c, i) => { if (i < 4) $('#position-' + i).textContent = c.pos === 50 ? '중앙' : `${c.pos}%`; });
  $$('[data-action="align"]').forEach(button => button.classList.toggle('selected', button.dataset.value === state.cards[4].align));
}
function updateCounts() {
  ['hook', 'body1', 'body2'].forEach(k => {
    const n = [...$('#' + k).value.replace(/\n/g, '')].length, max = k === 'hook' ? 30 : 220, el = $(`[data-count="${k}"]`);
    el.textContent = `${n} / ${max}`; el.classList.toggle('over', n > max);
  });
}
function setChannel(value, navigate = true) {
  channel = Object.hasOwn(CHANNELS, value) ? value : 'editorial';
  if (navigate) { const url = new URL(location.href); url.searchParams.set('design', channel); history.pushState({}, '', url); }
  $('#design-select').value = channel;
  renderAll();
}
function syncHeader() {
  $('#source-title').textContent = state.article?.title || state.content?.title || '다음 이야기를 기다리고 있어요';
  $('#sample-badge').hidden = !state.sample;
  const source = $('#source-link'); const url = state.article?.url;
  source.hidden = !/^https?:\/\//.test(url || ''); source.href = source.hidden ? '#' : url;
  $('#download-zip').disabled = !state.content;
  updateFigmaStatus();
  $('#cards-section').hidden = !state.content;
  document.body.classList.toggle('has-content', Boolean(state.content));
  $('#start-blank').textContent = state.content ? '직접 편집' : '직접 작성';
  $$('.swatch').forEach(el => { const active = el.dataset.palette === state.palette; el.classList.toggle('active', active); el.setAttribute('aria-pressed', active); });
}
function loadImage(src) {
  if (!src) return Promise.resolve(null);
  if (!imageCache.has(src)) imageCache.set(src, new Promise(resolve => {
    const img = new Image(); img.onload = () => resolve(img); img.onerror = () => { imageCache.delete(src); resolve(null); }; img.src = src;
  }));
  return imageCache.get(src);
}
function wrap(ctx, text, width) {
  const lines = [];
  for (const paragraph of String(text || '').replace(/\\n/g, '\n').split('\n')) {
    let line = '';
    for (const char of paragraph) {
      if (ctx.measureText(line + char).width > width && line) { lines.push(line.trimEnd()); line = char.trimStart(); } else line += char;
    }
    lines.push(line.trimEnd());
  }
  return lines;
}
function textBlock(ctx, text, x, y, width, fontSize, color, weight = 600, lineHeight = 1.5, maxHeight = Infinity, align = 'left') {
  let size = fontSize, lines;
  do { ctx.font = `${weight} ${size}px Pretendard, sans-serif`; lines = wrap(ctx, text, width); if (lines.length * size * lineHeight <= maxHeight) break; size -= 1; } while (size > 16);
  ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = 'top';
  if (ctx.recordText) ctx.recordText(lines, x, y, width, size, color, weight, lineHeight, align);
  else lines.forEach((line, i) => ctx.fillText(line, x, y + i * size * lineHeight));
  ctx.textAlign = 'left'; return lines.length * size * lineHeight;
}
function imageCover(ctx, img, x, y, w, h, pos = 50) {
  if (!img) { ctx.fillStyle = '#c5ced4'; ctx.fillRect(x, y, w, h); return; }
  const scale = Math.max(w / img.width, h / img.height), sw = w / scale, sh = h / scale;
  ctx.drawImage(img, (img.width - sw) * pos / 100, (img.height - sh) / 2, sw, sh, x, y, w, h);
}
function headline(ctx, text, x, y, width, defaultColor, scale = 1, height = 420, c = state.cards[0]) {
  const paragraphs = text.replace(/\\n/g, '\n').split('\n');
  const lineSpace = Math.max(60, height / paragraphs.length - 14);
  for (let i = 0; i < paragraphs.length; i++) {
    const n = Math.min(i + 1, 2); let size = c['size' + n] * scale, lines;
    do { ctx.font = `850 ${size}px Pretendard, sans-serif`; lines = wrap(ctx, paragraphs[i], width); if (lines.length * size * 1.2 <= lineSpace) break; size--; } while (size > 24);
    if (c['highlight' + n]) { ctx.fillStyle = '#ffe14d'; ctx.fillRect(x - 8, y - 7, Math.min(width + 16, Math.max(...lines.map(l => ctx.measureText(l).width)) + 20), lines.length * size * 1.2); }
    const color = c['highlight' + n] ? '#141414' : c['color' + n] === '#ffffff' && defaultColor ? defaultColor : c['color' + n];
    y += textBlock(ctx, paragraphs[i], x, y, width, size, color, 850, 1.2, lineSpace) + 14;
  }
}
function footer(ctx, i, ink, accent, channel = routeChannel()) {
  ctx.fillStyle = ink + '25'; ctx.fillRect(64, 1254, 952, 2);
  textBlock(ctx, 'newthing 자동화 프로젝트', 64, 1280, 780, 20, ink, 550);
  textBlock(ctx, `${String(i + 1).padStart(2, '0')} / 05`, 1016, 1280, 160, 20, accent, 650, 1.2, 50, 'right');
}
function drawCard(canvas, index, img, options = {}) {
  const { state: renderState = state, channel: renderChannel = channel } = options;
  return paintCard(canvas, index, img, renderState, renderChannel, options.context);
}
function paintCard(canvas, index, img, state, channel, context) {
  const c = state.cards[index], data = state.content;
  canvas.width = 1080; canvas.height = 1350;
  const ctx = context || canvas.getContext('2d'); ctx.textBaseline = 'top';
  if (!data) { ctx.fillStyle = '#f0f2e9'; ctx.fillRect(0, 0, canvas.width, canvas.height); return; }
  const dark = state.palette === 'dark';
  const bg = { white: '#fffefa', dark: '#202823', cream: '#f0e7d5' }[state.palette] || '#fffefa';
  const ink = dark ? '#f2f4e9' : '#202823';
  const accent = channel === 'contrast' ? (dark ? '#c8df9f' : '#596d38') : channel === 'brief' ? (dark ? '#efad83' : '#a55331') : (dark ? '#eda07c' : '#bf5935');
  const line = dark ? '#f2f4e930' : '#20282325';
  const label = ['COVER STORY', 'THE ESSENTIALS', 'IN CONTEXT', 'WORDS TO KEEP', 'ONE LAST THING'][index];
  ctx.fillStyle = bg; ctx.fillRect(0, 0, canvas.width, canvas.height);
  // Each layout uses native drawing primitives shared by Canvas and the Figma recorder.
  if (index === 0) {
    if (channel === 'contrast') {
      ctx.fillStyle = '#253227'; ctx.fillRect(0, 0, 1080, 690);

      textBlock(ctx, 'newthing 자동화 프로젝트', 64, 65, 700, 24, '#e9f0e1', 600);
      ctx.fillStyle = '#c8df9f'; ctx.fillRect(884, 58, 132, 44);
      textBlock(ctx, 'ISSUE 01', 901, 68, 110, 20, '#253227', 650);
      textBlock(ctx, '선명하게, 한 장의 이야기.', 64, 187, 900, 28, '#c8df9f', 550);
      headline(ctx, data.hook, 64, 286, 952, '#f6f8ee', 1.05, 335, state.cards[0]);
      textBlock(ctx, '01', 64, 760, 290, 170, accent, 800, 1, 200);
      textBlock(ctx, 'THE\nSTORY', 68, 1030, 260, 34, ink, 650, 1.25, 130);
      imageCover(ctx, img, 354, 736, 662, 464, c.pos);
    } else if (channel === 'brief') {
      ctx.fillStyle = accent; ctx.fillRect(0, 0, 1080, 121);

      textBlock(ctx, 'newthing 자동화 프로젝트', 64, 44, 750, 27, dark ? '#202823' : '#fffefa', 650);
      imageCover(ctx, img, 64, 170, 952, 470, c.pos);
      ctx.fillStyle = accent; ctx.fillRect(64, 685, 62, 5);
      textBlock(ctx, '오늘의 이야기를 짧고 깊게.', 64, 724, 950, 26, accent, 550);
      headline(ctx, data.hook, 64, 820, 952, ink, .98, 360, state.cards[0]);
    } else {

      textBlock(ctx, 'newthing 자동화 프로젝트', 64, 65, 800, 24, ink, 550);
      ctx.fillStyle = line; ctx.fillRect(64, 132, 952, 2);
      textBlock(ctx, '한 편의 생각, 한 장의 기록.', 64, 176, 952, 25, accent, 550);
      headline(ctx, data.hook, 64, 272, 952, ink, 1, 340, state.cards[0]);
      imageCover(ctx, img, 64, 686, 952, 514, c.pos);
      ctx.fillStyle = accent; ctx.fillRect(64, 686, 12, 514);
    }
    footer(ctx, index, ink, accent, channel); return;
  }

  textBlock(ctx, 'newthing 자동화 프로젝트', 64, 57, 650, 22, ink, 650);
  textBlock(ctx, label, 1016, 60, 720, 20, accent, 600, 1.2, 45, 'right');
  ctx.fillStyle = line; ctx.fillRect(64, 119, 952, 2);
  if (index === 4) {
    const x = c.align === 'left' ? 64 : c.align === 'right' ? 1016 : 540;
    imageCover(ctx, img, 64, 172, 952, 360, c.align === 'left' ? 0 : c.align === 'right' ? 100 : 50);
    textBlock(ctx, 'KEEP THIS STORY', x, 608, 952, 24, accent, 650, 1.4, 70, c.align);
    textBlock(ctx, data.cta, x, 704, 952, 75, ink, 750, 1.35, 330, c.align);
    ctx.fillStyle = accent; ctx.fillRect(c.align === 'left' ? 64 : c.align === 'right' ? 952 : 508, 1090, 64, 4);
    textBlock(ctx, data.hashtags.join('  '), x, 1130, 952, 28, ink, 500, 1.5, 100, c.align);
  } else if (index === 3) {
    imageCover(ctx, img, 626, 177, 390, 375, c.pos);
    textBlock(ctx, 'Aa', 64, 190, 500, 180, accent, 800, 1.1, 230);
    textBlock(ctx, 'WORDS\nTO KEEP', 70, 414, 470, 37, ink, 550, 1.25, 120);
    textBlock(ctx, data.phrase, 64, 645, 952, 94, ink, 800, 1.2, 265);
    ctx.fillStyle = accent; ctx.fillRect(64, 960, 64, 5);
    textBlock(ctx, data.meaning, 64, 1020, 952, 38, ink, 500, 1.5, 180);
  } else if (channel === 'contrast') {
    ctx.fillStyle = dark ? '#34422d' : '#dfE7cd'; ctx.fillRect(64, 170, 570, 260);
    textBlock(ctx, `0${index + 1}`, 99, 194, 480, 174, accent, 800, 1.05, 210);
    imageCover(ctx, img, 674, 170, 342, 260, c.pos);
    textBlock(ctx, index === 1 ? '이 이야기의 핵심' : '맥락을 읽는 시간', 64, 493, 952, 61, ink, 750, 1.25, 100);
    ctx.fillStyle = accent; ctx.fillRect(64, 608, 56, 5);
    textBlock(ctx, data[index === 1 ? 'body1' : 'body2'], 64, 660, 952, 40, ink, 500, 1.6, 540);
  } else if (channel === 'brief') {
    imageCover(ctx, img, 64, 170, 952, 345, c.pos);
    ctx.fillStyle = accent; ctx.fillRect(64, 563, 62, 40);
    textBlock(ctx, `0${index + 1}`, 79, 570, 45, 23, dark ? '#202823' : '#fffefa', 650);
    textBlock(ctx, index === 1 ? '꼭 알아둘 사실' : '함께 알아둘 배경', 149, 557, 867, 45, ink, 750, 1.25, 90);
    textBlock(ctx, data[index === 1 ? 'body1' : 'body2'], 64, 678, 952, 40, ink, 500, 1.6, 520);
  } else {
    textBlock(ctx, index === 1 ? '무엇이 달라졌을까' : '조금 더 들여다보면', 64, 185, 952, 61, ink, 750, 1.25, 110);
    textBlock(ctx, data[index === 1 ? 'body1' : 'body2'], 64, 322, 952, 39, ink, 500, 1.6, 490);
    imageCover(ctx, img, 64, 872, 952, 328, c.pos);
  }
  footer(ctx, index, ink, accent, channel);
}
async function renderOne(i) {
  const sequence = ++renderSequence[i];
  await document.fonts.ready;
  const img = await loadImage(state.cards[i].image);
  if (sequence !== renderSequence[i]) return;
  const canvas = $('#canvas-' + i); if (!canvas) return;
  drawCard(canvas, i, img);
  const thumbnail = $('#thumbnail-' + i); thumbnail.getContext('2d').drawImage(canvas, 0, 0, thumbnail.width, thumbnail.height);
  const column = $(`[data-card="${i}"]`); column.classList.toggle('ready', Boolean(state.content));
  column.querySelector('.card-preview').disabled = !state.content; column.querySelector('.mini-download').disabled = !state.content;
  if ($('#preview-dialog').open && previewIndex === i) drawCard($('#preview-canvas'), i, img);
}
async function renderAll() { syncHeader(); await Promise.all(state.cards.map((_, i) => renderOne(i))); }
function adopt(content, article, sample = false) {
  state.content = content; state.article = article; state.sample = sample;
  const images = sample ? ['/media/city.jpg', '/media/markets.jpg', '/media/desk.jpg', '/media/city.jpg', '/media/desk.jpg'] : article.images || [];
  state.cards = makeCards().map((c, i) => ({ ...c, image: images.length ? (sample ? images[i] : '/api/image?url=' + encodeURIComponent(images[i % images.length])) : '' }));
  syncFields(); selectCard(0); syncHeader(); renderAll(); persist();
}
function loadSample() {
  if (busy) return;
  state.input = `${sampleContent.title}\n\n※ 기능 확인용 가상 기사입니다.\n\n${sampleContent.body1}\n\n${sampleContent.body2}`;
  $('#article-input').value = state.input; updateInput();
  adopt(structuredClone(sampleContent), { title: sampleContent.title, text: state.input, url: '', images: [] }, true);
  showError(''); $('#cards-section').scrollIntoView({ block: 'start' }); toast('샘플을 불러왔어요. 문구와 사진을 바꿔보세요.');
}
function updateInput() {
  const count = $('#article-input').value.length;
  $('#generate').disabled = count < 1 || busy;
  $('#input-count').textContent = count ? count.toLocaleString() + ' / 24,000' : '';
}
function updateConnection() {
  const ready = Boolean(apiKey || serverKey);
  document.body.classList.toggle('connected', ready);
  $('#connection-label').textContent = apiKey ? 'GPT 키 설정됨' : serverKey ? 'GPT 연결됨' : 'GPT 연결';
  $('#server-key-note').hidden = !serverKey;
}
function openSettings(section = 'gpt') {
  $('#api-key').value = apiKey; $('#api-key').type = 'password'; $('#api-key').setCustomValidity(''); $('#show-key').textContent = '보기';
  $('#model').value = state.model; try { $('#remember-key').checked = Boolean(localStorage.getItem(GPT_KEY_STORAGE)) || !apiKey; } catch { $('#remember-key').checked = false; } $('#key-save-status').textContent = ''; $('#settings-dialog').showModal(); refreshFigma();
  if (section === 'figma') { $('#figma-settings-section').scrollIntoView({ block: 'start' }); if (!figmaConnection) $('#figma-code').focus(); }
  else $('#settings-dialog').scrollTop = 0;
}
async function generateContent() {
  if (busy || !$('#article-input').value.trim()) return;
  if (!apiKey && !serverKey) { showError('설정에서 GPT API 키를 등록해 주세요. 키 없이 ‘샘플 보기’로 체험할 수도 있어요.'); openSettings(); return; }
  busy = true; updateInput(); controller = new AbortController(); showError(''); $('#progress').hidden = false; $('#sample').disabled = true; $('#start-blank').disabled = true;
  $('#generate').textContent = '생성 중…'; $('#progress-text').textContent = /^https?:/.test($('#article-input').value.trim()) ? '기사를 읽고 카드 문구를 만들고 있어요…' : '다섯 장의 이야기를 만들고 있어요…';
  const timeout = setTimeout(() => controller.abort('timeout'), 110000);
  try {
    const response = await fetch('/api/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: controller.signal, body: JSON.stringify({ input: $('#article-input').value.trim(), apiKey, model: state.model, channel }) });
    let data;
    try { data = await response.json(); }
    catch { throw new Error(response.status === 429 ? '무료 서버의 오늘 요청 한도에 도달했어요. 한도가 복구된 뒤 다시 시도해 주세요.' : '서버 응답을 받지 못했어요. 잠시 후 다시 시도해 주세요.'); }
    if (!response.ok) throw new Error(data.error || '생성을 완료하지 못했어요. 다시 시도해 주세요.');
    adopt(data.content, data.article, false); toast('카드 문구가 준비됐어요. 자유롭게 편집해 보세요.');
    $('#cards-section').scrollIntoView({ block: 'start' });
  } catch (error) { if (controller.signal.aborted) showError(controller.signal.reason === 'timeout' ? '응답 시간이 길어져서 멈췄어요. 잠시 후 다시 시도해 주세요.' : '생성을 취소했어요. 이미 처리된 API 요청에는 비용이 발생할 수 있어요.'); else showError(error.message); }
  finally { clearTimeout(timeout); busy = false; controller = null; $('#progress').hidden = true; $('#sample').disabled = false; $('#start-blank').disabled = false; $('#generate').innerHTML = '카드뉴스 만들기 <span aria-hidden="true">→</span>'; updateInput(); }
}
async function openPreview(i) {
  previewIndex = i; await renderOne(i);
  drawCard($('#preview-canvas'), i, await loadImage(state.cards[i].image));
  $('#preview-title').textContent = `${String(i + 1).padStart(2, '0')} / 05`;
  if (!$('#preview-dialog').open) $('#preview-dialog').showModal();
}
async function canvasBytes(i) {
  await renderOne(i);
  const blob = await new Promise(resolve => $('#canvas-' + i).toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('이미지를 저장하지 못했어요. 사진을 다시 선택해 주세요.');
  return new Uint8Array(await blob.arrayBuffer());
}
function download(blob, name) {
  const a = document.createElement('a'); const url = URL.createObjectURL(blob); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 30000);
}
async function downloadCard(i) {
  if (!state.content) return;
  try { download(new Blob([await canvasBytes(i)], { type: 'image/png' }), `뉴띵-카드뉴스-${channel}-${i + 1}.png`); toast('PNG 이미지를 저장했어요.'); }
  catch (error) { showError(error.message); }
}
// ZIP STORE format: each PNG is already compressed; no external library needed.
function makeZip(files) {
  const encoder = new TextEncoder(), local = [], central = []; let offset = 0, centralSize = 0;
  const crc = bytes => { let c = 0xffffffff; for (const b of bytes) { c ^= b; for (let n = 0; n < 8; n++) c = (c >>> 1) ^ ((c & 1) ? 0xedb88320 : 0); } return (c ^ 0xffffffff) >>> 0; };
  for (const file of files) {
    const name = encoder.encode(file.name), data = file.bytes, checksum = crc(data);
    const header = new Uint8Array(30 + name.length), view = new DataView(header.buffer);
    view.setUint32(0, 0x04034b50, true); view.setUint16(4, 20, true); view.setUint16(6, 0x800, true); view.setUint32(14, checksum, true); view.setUint32(18, data.length, true); view.setUint32(22, data.length, true); view.setUint16(26, name.length, true); header.set(name, 30); local.push(header, data);
    const record = new Uint8Array(46 + name.length), cv = new DataView(record.buffer);
    cv.setUint32(0, 0x02014b50, true); cv.setUint16(4, 20, true); cv.setUint16(6, 20, true); cv.setUint16(8, 0x800, true); cv.setUint32(16, checksum, true); cv.setUint32(20, data.length, true); cv.setUint32(24, data.length, true); cv.setUint16(28, name.length, true); cv.setUint32(42, offset, true); record.set(name, 46); central.push(record); centralSize += record.length; offset += header.length + data.length;
  }
  const end = new Uint8Array(22), v = new DataView(end.buffer); v.setUint32(0, 0x06054b50, true); v.setUint16(8, files.length, true); v.setUint16(10, files.length, true); v.setUint32(12, centralSize, true); v.setUint32(16, offset, true);
  return new Blob([...local, ...central, end], { type: 'application/zip' });
}
async function downloadZip() {
  if (!state.content) return;
  const button = $('#download-zip'); button.disabled = true; button.textContent = '저장 중…';
  try {
    const indices = [0, 1, 2, 3, 4], files = [];
    for (const i of indices) files.push({ name: `${String(i + 1).padStart(2, '0')}-${state.cards[i].kind}.png`, bytes: await canvasBytes(i) });
    files.push({ name: 'caption.txt', bytes: new TextEncoder().encode(`${state.content.title}\n\n${state.content.body1}\n\n${state.content.body2}\n\n${state.content.hashtags.join(' ')}${state.article?.url ? '\n\n출처: ' + state.article.url : ''}${state.sample ? '\n\n기능 확인용 가상 기사입니다.' : ''}`) });
    download(makeZip(files), `뉴띵-카드뉴스-${channel}-cards.zip`); toast('카드와 캡션을 ZIP으로 저장했어요.');
  } catch (error) { showError(error.message); }
  finally { button.disabled = false; button.innerHTML = '전체 다운로드 <span aria-hidden="true">↓</span>'; }
}
function updateFigmaStatus() {
  const connected = Boolean(figmaConnection), info = figmaStatus;
  $('#figma-account').textContent = connected ? (info?.user?.name || figmaConnection.user?.name || '연결된 계정') : '연결 안 됨';
  $('#figma-destination').textContent = connected && info?.online ? `${info.destination.file} / ${info.destination.page}` : connected ? '받을 파일에서 newthing 자동화 프로젝트 플러그인을 열어 주세요.' : '카드를 편집 가능한 Figma 레이어로 보내요.';
  $('#figma-unlink').hidden = !connected;
  $('#figma-pair-form').hidden = connected;
  const job = info?.job;
  $('#figma-unlink').disabled = figmaExporting || Boolean(job && ['uploading','queued','processing'].includes(job.state));
  const statuses = { uploading: '사진·문구 전송 중…', queued: 'Figma 수신 대기 중…', processing: 'Figma에서 카드 제작 중…', done: `${job?.count || 0}장 제작 완료`, cancelled: '전송 취소됨', error: job?.error || '전송 실패' };
  if (job && !figmaExporting) $('#figma-transfer-status').textContent = statuses[job.state] || '';
  $('#download-figma').disabled = !state.content || figmaExporting || Boolean(job && ['uploading','queued','processing'].includes(job.state));
}
async function refreshFigma() {
  if (!figmaConnection || figmaPolling) return;
  figmaPolling = true; const current = figmaConnection;
  try {
    const result = await FolioFigmaClient.request(current, { action: 'status' });
    if (figmaConnection !== current) return;
    figmaStatus = result; updateFigmaStatus();
  } catch (error) {
    if (figmaConnection !== current) return;
    figmaStatus = null;
    if ([401,403,404].includes(error.status)) { figmaConnection = null; try { localStorage.removeItem(FIGMA_CONNECTION_STORAGE); } catch {} }
    updateFigmaStatus(); $('#figma-transfer-status').textContent = error.message;
  } finally { figmaPolling = false; }
}
async function downloadFigma() {
  if (!state.content || figmaExporting) return;
  if (!figmaConnection) { openSettings('figma'); return; }
  const snapshot = structuredClone(state), selectedChannel = channel, connection = figmaConnection;
  figmaExporting = true; $('#download-figma').disabled = true; showError('');
  const progress = text => $('#figma-transfer-status').textContent = text;
  try {
    const destination = await FolioFigmaClient.request(connection, { action: 'status' });
    if (!destination.online) throw new Error('받을 Figma 파일에서 newthing 자동화 프로젝트 플러그인을 열어 주세요.');
    progress('Figma에 보낼 카드 준비 중…');
    const bundle = await FolioFigma.createBundle({ snapshot, channel: selectedChannel, loadImage, drawCard });
    await FolioFigmaClient.send(connection, bundle, destination, $('#figma-arrangement').value, progress);
    progress('Figma에서 카드를 만들고 있어요…');
    toast('Figma로 보냈어요. 제작 완료 상태가 여기에 표시돼요.');
  } catch (error) { showError(error.message); progress(error.message); }
  finally { figmaExporting = false; await pollFigmaStatus(); updateFigmaStatus(); }
}
async function downloadFigmaPlugin() {
  const button = $('#download-figma-plugin'); button.disabled = true;
  $('#figma-help-status').textContent = '플러그인을 준비하고 있어요…';
  try {
    const source = await Promise.all(['manifest.json', 'code.js', 'ui.html', 'README.md'].map(async name => {
      const response = await fetch('/figma-plugin/' + name);
      if (!response.ok) throw new Error('플러그인을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.');
      return { name, text: await response.text() };
    }));
    const files = FolioFigmaPackage.configure(source, location.origin).map(file => ({ name: '뉴띵-카드뉴스-figma/' + file.name, bytes: new TextEncoder().encode(file.text) }));
    download(makeZip(files), '뉴띵-카드뉴스-figma-plugin.zip');
    $('#figma-help-status').textContent = '이 스튜디오에 자동 연결되는 플러그인이에요. 처음 한 번 manifest.json을 등록해 주세요.';
  } catch (error) { $('#figma-help-status').textContent = error.message; }
  finally { button.disabled = false; }
}
async function setImage(src) { state.cards[imageIndex].image = src; state.cards[imageIndex].pos = 50; await renderOne(imageIndex); persist(); $('#image-dialog').close(); toast('이미지를 변경했어요.'); }
async function uploadFile(file) {
  $('#image-error').textContent = '';
  if (!file || !['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) { $('#image-error').textContent = 'JPG·PNG·WEBP·GIF 파일을 선택해 주세요.'; return; }
  if (file.size > 8_000_000) { $('#image-error').textContent = '8MB 이하의 사진을 선택해 주세요.'; return; }
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url); if (!img) throw new Error('사진을 읽을 수 없어요. 다른 파일을 선택해 주세요.');
    const scale = Math.min(1, 1600 / Math.max(img.width, img.height)), canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(img.width * scale)); canvas.height = Math.max(1, Math.round(img.height * scale));
    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height); await setImage(canvas.toDataURL('image/jpeg', .85));
  } catch (error) { $('#image-error').textContent = error.message; } finally { URL.revokeObjectURL(url); imageCache.delete(url); $('#image-file').value = ''; }
}
$('#cards-grid').addEventListener('click', async event => {
  const button = event.target.closest('button[data-action]'); if (!button) return; const i = Number(button.dataset.i), c = state.cards[i];
  if (button.dataset.action === 'preview') openPreview(i);
  if (button.dataset.action === 'download') downloadCard(i);
  if (button.dataset.action === 'image') { imageIndex = i; $('#image-error').textContent = ''; $('#image-url').value = ''; $('#image-dialog').showModal(); }
  if (button.dataset.action === 'move') { c.pos = Math.max(0, Math.min(100, c.pos + Number(button.dataset.delta))); $('#position-' + i).textContent = c.pos === 50 ? '중앙' : `${c.pos}%`; renderOne(i); persist(); }
  if (button.dataset.action === 'align') { c.align = button.dataset.value; button.parentElement.querySelectorAll('button').forEach(b => b.classList.toggle('selected', b === button)); renderOne(i); persist(); }
});
$('#cards-grid').addEventListener('input', event => {
  const el = event.target;
  if (el.dataset.style) { const prop = el.dataset.style; state.cards[0][prop] = el.type === 'checkbox' ? el.checked : el.type === 'number' ? Math.max(36, Math.min(160, Number(el.value) || 110)) : el.value; renderOne(0); persist(); return; }
  const firstEdit = !state.content;
  if (firstEdit) { state.content = { title: '직접 만든 카드뉴스', hook: '', body1: '', body2: '', phrase: '', meaning: '', cta: '', hashtags: ['', '', ''] }; state.sample = false; }
  const mapping = { hook: 0, body1: 1, body2: 2, phrase: 3, meaning: 3, cta: 4 };
  if (el.id.startsWith('tag-')) state.content.hashtags[Number(el.id.slice(-1))] = el.value;
  else if (el.id in mapping) state.content[el.id] = el.value;
  updateCounts(); syncHeader(); if (firstEdit) renderAll(); else renderOne(el.id.startsWith('tag-') ? 4 : mapping[el.id] ?? 0); persist();
});
$('#design-select').addEventListener('change', event => setChannel(event.target.value));
window.addEventListener('popstate', () => setChannel(routeChannel(), false));
$('#card-tabs').addEventListener('click', event => { const tab = event.target.closest('[data-select-card]'); if (tab) selectCard(Number(tab.dataset.selectCard)); });
$('#card-tabs').addEventListener('keydown', event => {
  const keys = { ArrowRight: (selectedCard + 1) % 5, ArrowLeft: (selectedCard + 4) % 5, Home: 0, End: 4 };
  if (Object.hasOwn(keys, event.key)) { event.preventDefault(); selectCard(keys[event.key], true); }
});
$('#start-blank').addEventListener('click', () => {
  if (busy) return;
  if (!state.content) adopt({ title: '직접 만든 카드뉴스', hook: '', body1: '', body2: '', phrase: '', meaning: '', cta: '', hashtags: ['', '', ''] }, { title: '직접 만든 카드뉴스', images: [] });
  $('#cards-section').scrollIntoView({ block: 'start' }); $(`[data-card="${selectedCard}"] textarea`).focus({ preventScroll: true });
});
document.addEventListener('click', event => { if (!event.target.closest('#more-options')) $('#more-options').open = false; });
$('#more-options').addEventListener('keydown', event => { if (event.key === 'Escape') { $('#more-options').open = false; $('#more-options summary').focus(); } });
$('#article-input').addEventListener('input', () => { state.input = $('#article-input').value; updateInput(); persist(); });
$('#article-input').addEventListener('keydown', e => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); generateContent(); } });
$('#sample').addEventListener('click', loadSample); $('#generate').addEventListener('click', generateContent);
$('#cancel-generate').addEventListener('click', () => controller?.abort('cancel'));
$('#settings').addEventListener('click', () => openSettings());
$$('[data-close]').forEach(b => b.addEventListener('click', () => $('#' + b.dataset.close).close()));
$$('dialog').forEach(dialog => dialog.addEventListener('click', e => { if (e.target !== dialog) return; const r = dialog.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) dialog.close(); }));
$('#show-key').addEventListener('click', () => { const hidden = $('#api-key').type === 'password'; $('#api-key').type = hidden ? 'text' : 'password'; $('#show-key').textContent = hidden ? '숨기기' : '보기'; });
$('#api-key').addEventListener('input', () => $('#api-key').setCustomValidity(''));
$('#settings-dialog').addEventListener('close', () => { $('#api-key').value = ''; $('#api-key').type = 'password'; $('#show-key').textContent = '보기'; });
$('#settings-form').addEventListener('submit', e => {
  e.preventDefault(); const input = $('#api-key'), key = input.value.trim();
  if (key && (!/^sk-[A-Za-z0-9_-]+$/.test(key) || key.startsWith('sk-admin-') || key.length > 512)) {
    input.setCustomValidity('프로젝트에서 발급한 sk-로 시작하는 API 키 전체를 입력해 주세요. 따옴표와 공백은 빼 주세요.');
    input.reportValidity(); return;
  }
  apiKey = key; let saved = true;
  try { if ($('#remember-key').checked && key) localStorage.setItem(GPT_KEY_STORAGE, key); else localStorage.removeItem(GPT_KEY_STORAGE); }
  catch { saved = false; }
  state.model = $('#model').value; updateConnection(); persist();
  $('#key-save-status').textContent = !saved ? '키는 이번 탭에서 사용할 수 있지만 브라우저에 저장하지 못했어요.' : apiKey || serverKey ? '키를 적용했어요. 카드뉴스 만들기를 누르면 실제 API 요청을 진행해요.' : '모델 설정을 저장했어요.';
});
$('#disconnect').addEventListener('click', () => { apiKey = ''; try { localStorage.removeItem(GPT_KEY_STORAGE); } catch {} $('#api-key').value = ''; updateConnection(); $('#key-save-status').textContent = serverKey ? '개인 키를 해제했어요. 서버 연결은 유지돼요.' : 'GPT 연결을 해제했어요.'; });
$$('[data-palette]').forEach(b => b.addEventListener('click', () => { state.palette = b.dataset.palette; renderAll(); persist(); }));
$('#download-zip').addEventListener('click', downloadZip);
$('#download-figma').addEventListener('click', downloadFigma);
$('#figma-pair-form').addEventListener('submit', async event => {
  event.preventDefault(); const button = $('#figma-pair-button'); button.disabled = true; $('#figma-pair-error').textContent = '';
  const token = FolioFigmaClient.token(), code = $('#figma-code').value.replace(/[\s-]/g,'').toUpperCase();
  try {
    const result = await FolioFigmaClient.request(null, { action: 'pair', token, code });
    const connected = { id: result.id, token, user: result.user };
    try { localStorage.setItem(FIGMA_CONNECTION_STORAGE, JSON.stringify(connected)); } catch { $('#figma-pair-error').textContent = '연결은 완료됐지만 저장 공간이 없어 다음 실행에 다시 연결해야 해요.'; }
    figmaConnection = connected; figmaStatus = result; $('#figma-code').value = ''; updateFigmaStatus(); toast('Figma 계정을 등록했어요.');
  } catch (error) { $('#figma-pair-error').textContent = error.message; }
  finally { button.disabled = false; }
});
$('#figma-unlink').addEventListener('click', async () => {
  if (!figmaConnection || $('#figma-unlink').disabled) return;
  try { await FolioFigmaClient.request(figmaConnection, { action: 'disconnect' }); figmaConnection = null; figmaStatus = null; try { localStorage.removeItem(FIGMA_CONNECTION_STORAGE); } catch {} $('#figma-transfer-status').textContent = ''; updateFigmaStatus(); }
  catch (error) { $('#figma-pair-error').textContent = error.message; }
});
$('#download-figma-plugin').addEventListener('click', downloadFigmaPlugin);
$('#preview-prev').addEventListener('click', () => openPreview((previewIndex + 4) % 5));
$('#preview-next').addEventListener('click', () => openPreview((previewIndex + 1) % 5));
$('#preview-download').addEventListener('click', () => downloadCard(previewIndex));
$('#preview-dialog').addEventListener('keydown', e => { if (e.key === 'ArrowRight') openPreview((previewIndex + 1) % 5); if (e.key === 'ArrowLeft') openPreview((previewIndex + 4) % 5); });
$('#image-file').addEventListener('change', e => uploadFile(e.target.files[0]));
const dropZone = $('.upload-area');
['dragenter', 'dragover'].forEach(name => dropZone.addEventListener(name, e => { e.preventDefault(); dropZone.classList.add('dragover'); }));
['dragleave', 'drop'].forEach(name => dropZone.addEventListener(name, e => { e.preventDefault(); dropZone.classList.remove('dragover'); if (name === 'drop') uploadFile(e.dataTransfer.files[0]); }));
$$('[data-image]').forEach(b => b.addEventListener('click', () => setImage(b.dataset.image)));
$('#remove-image').addEventListener('click', () => setImage(''));
$('#image-url-form').addEventListener('submit', async e => {
  e.preventDefault(); $('#image-error').textContent = ''; const button = e.target.querySelector('button'); button.disabled = true;
  try { const src = '/api/image?url=' + encodeURIComponent($('#image-url').value.trim()); const response = await fetch(src); if (!response.ok) { const d = await response.json(); throw new Error(d.error || '이미지를 불러오지 못했어요.'); } const blob = await response.blob(); await uploadFile(new File([blob], 'remote-photo', { type: blob.type })); }
  catch (error) { $('#image-error').textContent = error.message; } finally { button.disabled = false; }
});
$('#article-input').value = state.input || ''; buildEditors(); setChannel(channel, false); updateInput(); updateConnection();
fetch('/api/config').then(r => r.json()).then(config => { serverKey = config.configured; if (!state.model) state.model = config.model; updateConnection(); }).catch(() => {});

let figmaPollTimer, figmaPollRunning = false;
async function pollFigmaStatus() {
  if (figmaPollRunning) return;
  figmaPollRunning = true;
  clearTimeout(figmaPollTimer);
  try { if (!document.hidden) await refreshFigma(); }
  finally {
    figmaPollRunning = false;
    const active = figmaExporting || ['uploading','queued','processing'].includes(figmaStatus?.job?.state);
    figmaPollTimer = setTimeout(pollFigmaStatus, active ? 3000 : 30000);
  }
}
document.addEventListener('visibilitychange', () => { if (!document.hidden) pollFigmaStatus(); });
pollFigmaStatus();
