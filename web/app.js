'use strict';
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const CHANNELS = { awesome: ['AWESOME MONEY', 'awsomemoney_official'], economic: ['SEOUL ECONOMIC', 'seoul_economic'], won: ['WON MONEY.ZIP', 'won_money.zip'], youtube: ['YOUTUBE THUMBNAIL', 'YouTube 썸네일'], blog: ['BLOG', '블로그 초안'], research: ['RESEARCH', '리서치 노트'] };
const STORAGE = 'ax-contents-studio-v1';
const sampleContent = {
  title: '금리가 바뀌면, 내 돈의 흐름도 바뀐다', hook: '금리가 움직이면\n내 돈은 어디로?',
  body1: '금리는 돈을 빌릴 때 내는 비용이자, 돈을 맡길 때 받는 보상이에요. 기준금리가 바뀌면 은행의 예금·대출 금리에도 영향을 줍니다. 금리가 내려가면 대출자의 이자 부담이 줄어들 수 있지만, 예금으로 받을 수 있는 이자도 낮아질 수 있어요. 다만 모든 금융상품의 금리가 동시에, 같은 폭으로 움직이는 건 아닙니다. 내 상품의 고정·변동금리 여부와 금리 변경 시점을 먼저 살펴보세요.',
  body2: '중앙은행은 물가와 경기 상황을 살피며 기준금리를 결정해요. 금리를 낮추면 소비와 투자가 늘어날 여지가 생기고, 높이면 물가 상승 압력을 줄이는 데 도움이 될 수 있죠. 하지만 금리 변화가 경제에 전달되기까지는 시간이 걸립니다. 예금, 대출, 주식, 부동산도 서로 다르게 반응할 수 있어요. 뉴스 속 금리 숫자 하나만 보기보다, 왜 바뀌었는지와 내 자산에 어떤 영향을 줄지 함께 살펴보세요.',
  phrase: 'Follow the money', meaning: '돈의 흐름을 따라가다.\n경제 뉴스 속 변화를 읽는 첫걸음이에요.', cta: '오늘의 돈 공부, 저장하고\n다음 이야기에서 또 만나요.', hashtags: ['#금리공부', '#경제상식', '#돈의흐름'],
  blog: '# 금리가 바뀌면, 내 돈의 흐름도 바뀐다\n\n※ 기능 확인을 위한 샘플 글입니다. 실제 뉴스나 투자 권유가 아닙니다.\n\n## 금리란 무엇일까?\n\n금리는 돈을 빌릴 때 내는 비용이자, 돈을 맡길 때 받는 보상입니다. 은행에 예금을 하면 이자를 받고, 대출을 받으면 이자를 내죠. 금리가 바뀐다는 건 이 비용과 보상의 크기가 달라질 수 있다는 뜻입니다.\n\n## 기준금리가 내 통장까지 오는 과정\n\n중앙은행이 기준금리를 조정하면 금융시장의 자금 조달 비용이 변합니다. 은행도 이를 반영해 예금과 대출 금리를 조정할 수 있습니다. 다만 상품마다 적용 시점과 변화 폭이 다릅니다. 고정금리 대출은 약정에 따라 기존 금리가 유지되고, 변동금리 대출은 정해진 주기에 맞춰 달라질 수 있습니다.\n\n## 금리가 낮아지면 무조건 좋을까?\n\n금리 하락은 대출자의 이자 부담을 줄이는 데 도움이 될 수 있습니다. 반대로 예금으로 얻는 이자는 줄어들 수 있죠. 소비와 투자에도 영향을 미치지만, 결과는 경기와 물가 등 여러 조건에 따라 달라집니다.\n\n## 뉴스 다음으로 확인할 세 가지\n\n첫째, 내 금융상품의 고정·변동금리 여부를 확인해 보세요. 둘째, 금리 변경 주기와 만기일을 살펴보세요. 셋째, 다른 상품과 비교할 때 수수료와 우대 조건도 함께 확인해 보세요.\n\n금리 뉴스는 숫자 하나로 끝나지 않습니다. 왜 변했는지, 그리고 나의 돈에는 어떻게 연결되는지 읽는 연습이 중요합니다.',
  research: '# 금리 변화 리서치 노트\n\n※ 실제 기사 분석이 아닌 기능 확인용 샘플입니다.\n\n1. 핵심 개념\n금리는 차입 비용과 저축 보상에 영향을 미칩니다. 기준금리 조정이 예금·대출 상품으로 전달되는 시점과 폭은 다를 수 있습니다.\n\n2. 배경\n중앙은행은 물가와 경기 상황 등을 고려해 금리를 결정합니다. 금리 변화가 실물경제에 반영되기까지는 시차가 있습니다.\n\n3. 시사점\n대출자와 예금자의 이해관계가 다를 수 있습니다. 고정금리와 변동금리 상품을 구분하고, 개별 약정과 변경 주기를 확인해야 합니다.\n\n4. 추가 확인할 사항\n• 현재 기준금리 및 최근 결정문: 공식 자료 확인 필요\n• 개별 금융상품의 실제 금리: 금융회사 공시 확인 필요\n• 상품별 수수료와 우대 조건: 약정 확인 필요\n• 다른 자산 가격에 대한 영향: 추가 자료 확인 필요'
};
const makeCards = () => ['hook', 'body1', 'body2', 'expression', 'cta'].map((kind, i) => ({ kind, image: '', pos: 50, color1: '#ffffff', color2: '#ffffff', size1: 110, size2: 110, highlight1: false, highlight2: false, align: 'center', id: i }));
let state = { content: null, cards: makeCards(), palette: 'white', article: null, sample: false, model: 'gpt-5.4-mini', input: '' };
try {
  const saved = JSON.parse(localStorage.getItem(STORAGE));
  if (saved?.version === 1 && saved.state && Array.isArray(saved.state.cards) && saved.state.cards.length === 5 && saved.state.cards.every(c => typeof c.image === 'string')) state = { ...state, ...saved.state };
} catch {}
let channel = routeChannel(), apiKey = '', serverKey = false, busy = false, controller = null, imageIndex = 0, previewIndex = 0, saveTimer, toastTimer;
const imageCache = new Map();
const renderSequence = [0, 0, 0, 0, 0];
function routeChannel() {
  if (location.pathname === '/blog') return 'blog';
  if (location.pathname === '/research') return 'research';
  const d = new URLSearchParams(location.search).get('design');
  return ({ 'photo-panel': 'awesome', beauty1: 'economic', 'won-money': 'won', 'youtube-thumbnail': 'youtube' })[d] || (CHANNELS[d] ? d : 'awesome');
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
  const labels = ['Hook', 'Body 1', 'Body 2', 'Expression', 'CTA'];
  $('#cards-grid').innerHTML = state.cards.map((c, i) => {
    let editor = '';
    if (i === 0) {
      editor = field('hook', '헤드라인 (15–25자, 줄바꿈 가능)', true, 30) + '<button class="style-toggle" data-action="styles" data-i="0" aria-expanded="true">제목 글자 스타일 <span>−</span></button><div class="type-settings" id="type-settings">' + [1, 2].map(n => `<div class="style-line"><span>${n === 1 ? '윗줄' : '아랫줄'}</span><input type="color" data-style="color${n}" data-i="0" value="${c['color' + n]}" aria-label="${n === 1 ? '윗줄' : '아랫줄'} 글자색"><input type="number" min="36" max="160" step="2" value="${c['size' + n]}" data-style="size${n}" data-i="0" aria-label="${n === 1 ? '윗줄' : '아랫줄'} 글자 크기"><span>px</span><input type="checkbox" data-style="highlight${n}" data-i="0" ${c['highlight' + n] ? 'checked' : ''} aria-label="${n === 1 ? '윗줄' : '아랫줄'} 배경 강조"><span>강조</span></div>`).join('') + '</div>';
    }
    if (i === 1) editor = field('body1', '본문 1 — 팩트 (200–220자)', false, 220);
    if (i === 2) editor = field('body2', '본문 2 — 배경/원인 (200–220자)', false, 220);
    if (i === 3) editor = field('phrase', 'Phrase (영문)', true) + field('meaning', 'Meaning (한글)', true);
    if (i === 4) editor = field('cta', '마지막 한마디', true) + '<label class="control-label">해시태그 (#포함)</label>' + [0, 1, 2].map(n => `<input id="tag-${n}" class="tag-input" aria-label="해시태그 ${n + 1}" maxlength="50" placeholder="#해시태그">`).join('');
    const position = i === 4 ? `<div class="control-label">이미지 정렬</div><div class="position-control">${['left', 'center', 'right'].map((p, j) => `<button data-action="align" data-value="${p}" data-i="${i}" class="${c.align === p ? 'selected' : ''}">${['왼쪽', '중앙', '오른쪽'][j]}</button>`).join('')}</div>` : `<div class="control-label">사진 좌우 이동</div><div class="position-control"><button data-action="move" data-delta="-10" data-i="${i}" aria-label="${labels[i]} 사진 왼쪽으로">◀</button><span id="position-${i}">중앙</span><button data-action="move" data-delta="10" data-i="${i}" aria-label="${labels[i]} 사진 오른쪽으로">▶</button></div>`;
    return `<article class="card-column" data-card="${i}"><button class="card-preview" data-action="preview" data-i="${i}" aria-label="${labels[i]} 카드 크게 보기" disabled><canvas id="canvas-${i}" width="1080" height="1350"></canvas><span class="empty-preview"><span>0${i + 1}</span></span><span class="preview-hover">↗</span></button><div class="card-meta"><span><span class="index">0${i + 1}</span>${labels[i].toUpperCase()}</span><button class="mini-download" data-action="download" data-i="${i}" aria-label="${labels[i]} PNG 다운로드" disabled>↓</button></div><button class="image-button" data-action="image" data-i="${i}"><span>▧</span> 이미지 변경 <span>▼</span></button>${position}${editor}<button class="apply-button" data-action="apply" data-i="${i}">${i === 0 ? '제목·색·크기 적용' : 'Apply'}</button></article>`;
  }).join('');
  syncFields();
}
function syncFields() {
  const c = state.content;
  ['hook', 'body1', 'body2', 'phrase', 'meaning', 'cta'].forEach(k => { if ($('#' + k)) $('#' + k).value = c?.[k] || ''; });
  [0, 1, 2].forEach(i => $('#tag-' + i).value = c?.hashtags?.[i] || '');
  updateCounts();
  state.cards.forEach((c, i) => { if (i < 4) $('#position-' + i).textContent = c.pos === 50 ? '중앙' : `${c.pos}%`; });
}
function updateCounts() {
  ['hook', 'body1', 'body2'].forEach(k => {
    const n = [...$('#' + k).value.replace(/\n/g, '')].length, max = k === 'hook' ? 30 : 220, el = $(`[data-count="${k}"]`);
    el.textContent = `${n} / ${max}`; el.classList.toggle('over', n > max);
  });
}
function setChannel(value, navigate = true) {
  channel = value;
  if (navigate) { const anchor = $(`[data-channel="${value}"]`); history.pushState({}, '', anchor.getAttribute('href')); window.scrollTo(0, 0); }
  $$('.channel-list a').forEach(a => { a.classList.toggle('active', a.dataset.channel === value); if (a.dataset.channel === value) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  $('#page-title').textContent = CHANNELS[value][0];
  const documentMode = ['blog', 'research'].includes(value);
  $('#cards-section').hidden = documentMode; $('#document-section').hidden = !documentMode;
  $('#cards-grid').classList.toggle('youtube', value === 'youtube');
  $('#dimensions').textContent = value === 'youtube' ? '1920 × 1080' : '1080 × 1350';
  $('#document-label').textContent = value === 'blog' ? 'BLOG DRAFT' : 'RESEARCH NOTE';
  if (documentMode) syncDocument(); else renderAll();
}
function syncDocument() {
  const ready = Boolean(state.content);
  $('#document-content').hidden = !ready; $('#document-empty').hidden = ready;
  $('#document-content').value = state.content?.[channel] || '';
  $('#download-document').disabled = !ready; $('#copy-document').disabled = !ready;
}
function syncHeader() {
  $('#source-title').textContent = state.article?.title || state.content?.title || '제목 없음';
  $('#sample-badge').hidden = !state.sample;
  const source = $('#source-link'); const url = state.article?.url;
  source.hidden = !/^https?:\/\//.test(url || ''); source.href = source.hidden ? '#' : url;
  $('#download-zip').disabled = !state.content;
  $('#footer-status').textContent = state.content ? (state.sample ? '샘플 콘텐츠 · 문구와 사진을 자유롭게 바꿔보세요.' : '카드 5장 · 변경사항이 자동 저장돼요.') : '기사 하나로, 다섯 장의 이야기.';
  $('#cards-label').textContent = `${channel === 'youtube' ? 'THUMBNAIL' : 'CARDS'} · ${state.palette.toUpperCase()}`;
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
  lines.forEach((line, i) => ctx.fillText(line, x, y + i * size * lineHeight));
  ctx.textAlign = 'left'; return lines.length * size * lineHeight;
}
function imageCover(ctx, img, x, y, w, h, pos = 50) {
  if (!img) { ctx.fillStyle = '#c5ced4'; ctx.fillRect(x, y, w, h); return; }
  const scale = Math.max(w / img.width, h / img.height), sw = w / scale, sh = h / scale;
  ctx.drawImage(img, (img.width - sw) * pos / 100, (img.height - sh) / 2, sw, sh, x, y, w, h);
}
function headline(ctx, text, x, y, width, defaultColor, scale = 1, height = 420) {
  const c = state.cards[0], paragraphs = text.replace(/\\n/g, '\n').split('\n');
  const lineSpace = Math.max(60, height / paragraphs.length - 14);
  for (let i = 0; i < paragraphs.length; i++) {
    const n = Math.min(i + 1, 2); let size = c['size' + n] * scale, lines;
    do { ctx.font = `850 ${size}px Pretendard, sans-serif`; lines = wrap(ctx, paragraphs[i], width); if (lines.length * size * 1.2 <= lineSpace) break; size--; } while (size > 24);
    if (c['highlight' + n]) { ctx.fillStyle = '#ffe14d'; ctx.fillRect(x - 8, y - 7, Math.min(width + 16, Math.max(...lines.map(l => ctx.measureText(l).width)) + 20), lines.length * size * 1.2); }
    const color = c['highlight' + n] ? '#141414' : c['color' + n] === '#ffffff' && defaultColor ? defaultColor : c['color' + n];
    y += textBlock(ctx, paragraphs[i], x, y, width, size, color, 850, 1.2, lineSpace) + 14;
  }
}
function drawLogo(ctx, x, y, color = '#fff', size = 40) {
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.moveTo(x, y + size * .3); ctx.lineTo(x + size * .65, y); ctx.lineTo(x + size * .65, y + size * .24); ctx.lineTo(x, y + size * .54); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x, y + size * .52); ctx.lineTo(x + size * .65, y + size * .8); ctx.lineTo(x + size * .65, y + size); ctx.lineTo(x, y + size * .73); ctx.closePath(); ctx.fill();
}
function footer(ctx, i, ink, accent) {
  ctx.strokeStyle = ink + '25'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(65, 1255); ctx.lineTo(1015, 1255); ctx.stroke();
  ctx.font = '600 21px Pretendard, sans-serif'; ctx.fillStyle = ink; ctx.fillText(CHANNELS[channel === 'youtube' ? 'awesome' : channel]?.[1] || 'AX CONTENTS LAB', 65, 1290);
  for (let n = 0; n < 5; n++) { ctx.beginPath(); ctx.arc(890 + n * 27, 1298, n === i ? 5 : 3, 0, Math.PI * 2); ctx.fillStyle = n === i ? accent : ink + '40'; ctx.fill(); }
}
function drawCard(canvas, index, img) {
  const c = state.cards[index], data = state.content;
  const youtube = channel === 'youtube'; canvas.width = youtube ? 1920 : 1080; canvas.height = youtube ? 1080 : 1350;
  const ctx = canvas.getContext('2d'); ctx.textBaseline = 'top';
  if (!data) { ctx.fillStyle = '#fafafa'; ctx.fillRect(0, 0, canvas.width, canvas.height); return; }
  const bg = { white: '#ffffff', dark: '#17191d', cream: '#f1ecdf' }[state.palette] || '#fff';
  const ink = state.palette === 'dark' ? '#f3f2ee' : '#17191d';
  const accent = channel === 'economic' ? '#3665b4' : channel === 'won' ? '#e25d30' : '#577d99';
  ctx.fillStyle = bg; ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (youtube) {
    imageCover(ctx, img, 0, 0, 1920, 1080, c.pos);
    const g = ctx.createLinearGradient(0, 0, 1920, 0); g.addColorStop(0, '#070d15f5'); g.addColorStop(.5, '#070d15b8'); g.addColorStop(1, '#070d1510'); ctx.fillStyle = g; ctx.fillRect(0, 0, 1920, 1080);
    textBlock(ctx, 'AWESOME MONEY', 100, 90, 1400, 43, '#fff', 750);
    headline(ctx, data.hook, 100, 300, 1150, '#ffe455', 1.45, 620);
    textBlock(ctx, '경제를 읽는 새로운 시선', 105, 940, 1400, 38, '#fff', 500); return;
  }
  if (index === 0) {
    if (channel === 'economic') {
      imageCover(ctx, img, 0, 0, 1080, 740, c.pos);
      ctx.fillStyle = '#10294bc9'; ctx.fillRect(0, 0, 1080, 740);
      textBlock(ctx, 'SEOUL\nECONOMIC', 65, 67, 800, 55, '#fff', 800, 1.15);
      ctx.fillStyle = accent; ctx.fillRect(65, 800, 80, 8);
      headline(ctx, data.hook, 65, 855, 950, ink, .78, 340); footer(ctx, index, ink, accent); return;
    }
    imageCover(ctx, img, 0, 0, 1080, 1350, c.pos);
    const g = ctx.createLinearGradient(0, 0, 0, 1350); g.addColorStop(0, '#07111e30'); g.addColorStop(.3, '#07111e00'); g.addColorStop(.58, '#07111e70'); g.addColorStop(1, '#07111ef5'); ctx.fillStyle = g; ctx.fillRect(0, 0, 1080, 1350);
    drawLogo(ctx, 65, 65); textBlock(ctx, channel === 'won' ? 'WON MONEY.ZIP' : 'AWESOME MONEY', 110, 73, 800, 29, '#fff', 800);
    textBlock(ctx, 'TODAY’S MONEY STORY', 65, 665, 900, 22, '#ffffffb0', 600);
    headline(ctx, data.hook, 65, 740, 940, '#fff');
    footer(ctx, index, '#ffffff', '#ffe14d'); return;
  }
  if (index === 4) {
    const x = c.align === 'left' ? 70 : c.align === 'right' ? 1010 : 540;
    imageCover(ctx, img, 0, 0, 1080, 400, c.align === 'left' ? 0 : c.align === 'right' ? 100 : 50);
    ctx.fillStyle = '#10223355'; ctx.fillRect(0, 0, 1080, 400);
    textBlock(ctx, CHANNELS[channel]?.[0] || 'AWESOME MONEY', x, 500, 940, 24, accent, 750, 1.4, 100, c.align);
    textBlock(ctx, data.cta, x, 605, 940, 75, ink, 800, 1.35, 330, c.align);
    ctx.fillStyle = accent; ctx.fillRect(c.align === 'left' ? 70 : c.align === 'right' ? 910 : 490, 1000, 100, 5);
    textBlock(ctx, data.hashtags.join('  '), x, 1070, 940, 29, ink, 500, 1.5, 130, c.align); footer(ctx, index, ink, accent); return;
  }
  imageCover(ctx, img, 0, 0, 1080, 530, c.pos);
  const shade = ctx.createLinearGradient(0, 0, 0, 530); shade.addColorStop(0, '#0005'); shade.addColorStop(1, '#0000'); ctx.fillStyle = shade; ctx.fillRect(0, 0, 1080, 530);
  textBlock(ctx, CHANNELS[channel]?.[0] || 'AWESOME MONEY', 65, 45, 900, 24, '#fff', 750);
  if (channel === 'won') { ctx.fillStyle = '#e87347'; ctx.fillRect(0, 530, 1080, 12); }
  textBlock(ctx, `0${index + 1}   /   ${['', 'THE FACT', 'THE CONTEXT', 'MONEY EXPRESSION'][index]}`, 65, 590, 940, 22, accent, 750);
  if (index === 3) {
    textBlock(ctx, data.phrase, 65, 700, 940, 88, ink, 850, 1.15, 260);
    ctx.fillStyle = accent; ctx.fillRect(65, 1010, 65, 4);
    textBlock(ctx, data.meaning, 65, 1070, 940, 36, ink, 500, 1.5, 155);
  } else {
    textBlock(ctx, index === 1 ? '지금, 무슨 일이?' : '그래서, 왜 중요할까?', 65, 650, 940, 55, ink, 800, 1.3, 100);
    textBlock(ctx, data[index === 1 ? 'body1' : 'body2'], 65, 765, 940, 39, ink, 500, 1.58, 440);
  }
  footer(ctx, index, ink, accent);
}
async function renderOne(i) {
  const sequence = ++renderSequence[i];
  await document.fonts.ready;
  const img = await loadImage(state.cards[i].image);
  if (sequence !== renderSequence[i]) return;
  const canvas = $('#canvas-' + i); if (!canvas) return;
  drawCard(canvas, i, img);
  const column = $(`[data-card="${i}"]`); column.classList.toggle('ready', Boolean(state.content));
  column.querySelector('.card-preview').disabled = !state.content; column.querySelector('.mini-download').disabled = !state.content;
  if ($('#preview-dialog').open && previewIndex === i) drawCard($('#preview-canvas'), i, img);
}
async function renderAll() { syncHeader(); await Promise.all(state.cards.map((_, i) => renderOne(i))); }
function adopt(content, article, sample = false) {
  state.content = content; state.article = article; state.sample = sample;
  const images = sample ? ['/media/city.jpg', '/media/markets.jpg', '/media/desk.jpg', '/media/city.jpg', '/media/desk.jpg'] : article.images || [];
  state.cards = makeCards().map((c, i) => ({ ...c, image: images.length ? (sample ? images[i] : '/api/image?url=' + encodeURIComponent(images[i % images.length])) : '' }));
  syncFields(); syncHeader(); if (['blog', 'research'].includes(channel)) syncDocument(); renderAll(); persist();
}
function loadSample() {
  if (busy) return;
  state.input = `${sampleContent.title}\n\n※ 기능 확인용 가상 기사입니다.\n\n${sampleContent.body1}\n\n${sampleContent.body2}`;
  $('#article-input').value = state.input; updateInput();
  adopt(structuredClone(sampleContent), { title: sampleContent.title, text: state.input, url: '', images: [] }, true);
  showError(''); toast('샘플을 불러왔어요. 문구와 사진을 바꿔보세요.');
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
function openSettings() {
  $('#api-key').value = apiKey; $('#api-key').type = 'password'; $('#api-key').setCustomValidity(''); $('#show-key').textContent = '보기';
  $('#model').value = state.model; $('#settings-dialog').showModal();
}
async function generateContent() {
  if (busy || !$('#article-input').value.trim()) return;
  if (!apiKey && !serverKey) { showError('GPT 연결이 필요해요. API 키를 연결하거나 ‘샘플로 시작’으로 체험해 보세요.'); openSettings(); return; }
  busy = true; updateInput(); controller = new AbortController(); showError(''); $('#progress').hidden = false; $('#sample').disabled = true;
  $('#generate').textContent = '생성 중…'; $('#progress-text').textContent = /^https?:/.test($('#article-input').value.trim()) ? '기사를 읽고 카드 문구를 만들고 있어요…' : '다섯 장의 이야기를 만들고 있어요…';
  const timeout = setTimeout(() => controller.abort('timeout'), 110000);
  try {
    const response = await fetch('/api/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: controller.signal, body: JSON.stringify({ input: $('#article-input').value.trim(), apiKey, model: state.model, channel }) });
    const data = await response.json(); if (!response.ok) throw new Error(data.error || '생성을 완료하지 못했어요. 다시 시도해 주세요.');
    adopt(data.content, data.article, false); toast('카드 문구가 준비됐어요. 자유롭게 편집해 보세요.');
    if (data.usage) $('#footer-status').textContent = `입력 ${data.usage.input_tokens.toLocaleString()} · 출력 ${data.usage.output_tokens.toLocaleString()} tokens`;
  } catch (error) { if (controller.signal.aborted) showError(controller.signal.reason === 'timeout' ? '응답 시간이 길어져서 멈췄어요. 잠시 후 다시 시도해 주세요.' : '생성을 취소했어요. 이미 처리된 API 요청에는 비용이 발생할 수 있어요.'); else showError(error.message); }
  finally { clearTimeout(timeout); busy = false; controller = null; $('#progress').hidden = true; $('#sample').disabled = false; $('#generate').innerHTML = 'Generate <span>↗</span>'; updateInput(); }
}
async function openPreview(i) {
  previewIndex = i; await renderOne(i);
  drawCard($('#preview-canvas'), i, await loadImage(state.cards[i].image));
  $('#preview-title').textContent = `${String(i + 1).padStart(2, '0')} / ${channel === 'youtube' ? '01' : '05'}`;
  $('.preview-frame').style.aspectRatio = channel === 'youtube' ? '16/9' : '4/5';
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
  try { download(new Blob([await canvasBytes(i)], { type: 'image/png' }), `ax-${channel}-${i + 1}.png`); toast('PNG 이미지를 저장했어요.'); }
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
    const indices = channel === 'youtube' ? [0] : [0, 1, 2, 3, 4], files = [];
    for (const i of indices) files.push({ name: `${String(i + 1).padStart(2, '0')}-${state.cards[i].kind}.png`, bytes: await canvasBytes(i) });
    files.push({ name: 'caption.txt', bytes: new TextEncoder().encode(`${state.content.title}\n\n${state.content.body1}\n\n${state.content.body2}\n\n${state.content.hashtags.join(' ')}${state.article?.url ? '\n\n출처: ' + state.article.url : ''}${state.sample ? '\n\n기능 확인용 가상 기사입니다.' : ''}`) });
    download(makeZip(files), `ax-${channel}-cards.zip`); toast('카드와 캡션을 ZIP으로 저장했어요.');
  } catch (error) { showError(error.message); }
  finally { button.disabled = false; button.innerHTML = '<span class="download-icon">↓</span> ZIP 다운로드'; }
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
  if (button.dataset.action === 'apply') { if (!state.content) return toast('샘플을 불러오거나 기사를 먼저 생성해 주세요.'); await renderOne(i); persist(); toast('카드에 적용했어요.'); }
  if (button.dataset.action === 'styles') { const panel = $('#type-settings'); panel.hidden = !panel.hidden; button.setAttribute('aria-expanded', !panel.hidden); button.lastElementChild.textContent = panel.hidden ? '+' : '−'; }
});
$('#cards-grid').addEventListener('input', event => {
  const el = event.target;
  if (el.dataset.style) { const prop = el.dataset.style; state.cards[0][prop] = el.type === 'checkbox' ? el.checked : el.type === 'number' ? Math.max(36, Math.min(160, Number(el.value) || 110)) : el.value; renderOne(0); persist(); return; }
  const firstEdit = !state.content;
  if (firstEdit) { state.content = { title: '직접 만든 카드뉴스', hook: '', body1: '', body2: '', phrase: '', meaning: '', cta: '', hashtags: ['', '', ''], blog: '', research: '' }; state.sample = false; }
  const mapping = { hook: 0, body1: 1, body2: 2, phrase: 3, meaning: 3, cta: 4 };
  if (el.id.startsWith('tag-')) state.content.hashtags[Number(el.id.slice(-1))] = el.value;
  else if (el.id in mapping) state.content[el.id] = el.value;
  updateCounts(); syncHeader(); if (firstEdit) renderAll(); else renderOne(el.id.startsWith('tag-') ? 4 : mapping[el.id] ?? 0); persist();
});
$$('[data-channel]').forEach(a => a.addEventListener('click', event => { event.preventDefault(); setChannel(a.dataset.channel); }));
window.addEventListener('popstate', () => setChannel(routeChannel(), false));
$('#collapse').addEventListener('click', () => { document.body.classList.toggle('collapsed'); const c = document.body.classList.contains('collapsed'); $('#collapse').textContent = c ? '»' : '«'; $('#collapse').setAttribute('aria-label', c ? '사이드바 펼치기' : '사이드바 접기'); });
$('#article-input').addEventListener('input', () => { state.input = $('#article-input').value; updateInput(); persist(); });
$('#article-input').addEventListener('keydown', e => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); generateContent(); } });
$('#sample').addEventListener('click', loadSample); $('#generate').addEventListener('click', generateContent);
$('#cancel-generate').addEventListener('click', () => controller?.abort('cancel'));
['#settings', '#settings-side'].forEach(s => $(s).addEventListener('click', openSettings));
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
  apiKey = key; state.model = $('#model').value; updateConnection(); persist(); $('#settings-dialog').close();
  toast(apiKey || serverKey ? '키를 적용했어요. Generate를 누르면 실제 API 요청을 진행해요.' : '모델 설정을 저장했어요.');
});
$('#disconnect').addEventListener('click', () => { apiKey = ''; $('#api-key').value = ''; updateConnection(); $('#settings-dialog').close(); toast(serverKey ? '개인 키를 해제했어요. 서버 연결은 유지돼요.' : 'GPT 연결을 해제했어요.'); });
$$('[data-palette]').forEach(b => b.addEventListener('click', () => { state.palette = b.dataset.palette; renderAll(); persist(); }));
$('#download-zip').addEventListener('click', downloadZip);
$('#preview-prev').addEventListener('click', () => openPreview(channel === 'youtube' ? 0 : (previewIndex + 4) % 5));
$('#preview-next').addEventListener('click', () => openPreview(channel === 'youtube' ? 0 : (previewIndex + 1) % 5));
$('#preview-download').addEventListener('click', () => downloadCard(previewIndex));
$('#preview-dialog').addEventListener('keydown', e => { if (e.key === 'ArrowRight') openPreview(channel === 'youtube' ? 0 : (previewIndex + 1) % 5); if (e.key === 'ArrowLeft') openPreview(channel === 'youtube' ? 0 : (previewIndex + 4) % 5); });
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
$('#document-content').addEventListener('input', () => { if (state.content) { state.content[channel] = $('#document-content').value; persist(); } });
$('#copy-document').addEventListener('click', async () => { try { await navigator.clipboard.writeText($('#document-content').value); toast('클립보드에 복사했어요.'); } catch { $('#document-content').select(); toast('텍스트를 선택했어요. 복사 단축키를 눌러주세요.'); } });
$('#download-document').addEventListener('click', () => download(new Blob(['\ufeff' + $('#document-content').value], { type: 'text/plain;charset=utf-8' }), `ax-${channel}.txt`));
$('#article-input').value = state.input || ''; buildEditors(); setChannel(channel, false); updateInput(); updateConnection();
fetch('/api/config').then(r => r.json()).then(config => { serverKey = config.configured; if (!state.model) state.model = config.model; updateConnection(); }).catch(() => {});
