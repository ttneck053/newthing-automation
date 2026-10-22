// Records the same drawing operations used by PNG export as editable design layers.
// No screenshot of a card is used in the Figma document.
'use strict';
globalThis.FolioFigma = (() => {
  const FORMAT = 'folio-figma';
  class SceneContext {
    constructor(measure, imageIds) {
      this.measure = measure; this.imageIds = imageIds; this.nodes = [];
      this.font = '600 24px Pretendard'; this.fillStyle = '#000000';
      this.strokeStyle = '#000000'; this.lineWidth = 1; this.textAlign = 'left';
    }
    measureText(text) { this.measure.font = this.font; return this.measure.measureText(text); }
    createLinearGradient(x0, y0, x1, y1) {
      return { type: 'gradient', axis: x0 === x1 ? 'vertical' : 'horizontal', stops: [], addColorStop(position, color) { this.stops.push({ position, color }); } };
    }
    paint(value) {
      return typeof value === 'string' ? { type: 'solid', color: value } : { type: 'gradient', axis: value.axis, stops: value.stops.map(s => ({ ...s })) };
    }
    fillRect(x, y, width, height) { this.nodes.push({ type: 'rect', x, y, width, height, paint: this.paint(this.fillStyle) }); }
    drawImage(img, sx, sy, sw, sh, x, y, width, height) {
      const asset = this.imageIds.get(img);
      if (!asset) throw new Error('Figma에 포함할 사진을 찾지 못했어요. 다시 저장해 주세요.');
      this.nodes.push({ type: 'image', x, y, width, height, asset, crop: [sw / img.width, sh / img.height, sx / img.width, sy / img.height] });
    }
    recordText(lines, x, y, width, size, color, weight, lineHeight, align) {
      this.nodes.push({ type: 'text', text: lines.join('\n'), x, y, width, fontSize: size, weight, lineHeight: size * lineHeight, align, paint: this.paint(color) });
    }
    fillText(text, x, y) {
      const match = this.font.match(/(\d+)\s+([\d.]+)px/);
      const size = Number(match?.[2] || 24);
      this.recordText([text], x, y, this.measureText(text).width, size, this.fillStyle, Number(match?.[1] || 600), 1.2, this.textAlign);
    }
    beginPath() { this.path = []; this.circle = null; }
    moveTo(x, y) { this.path.push([x, y]); }
    lineTo(x, y) { this.path.push([x, y]); }
    closePath() {}
    arc(x, y, radius) { this.circle = { x, y, radius }; }
    fill() {
      if (this.circle) {
        const { x, y, radius } = this.circle;
        this.nodes.push({ type: 'ellipse', x: x - radius, y: y - radius, width: radius * 2, height: radius * 2, paint: this.paint(this.fillStyle) });
      } else this.nodes.push({ type: 'polygon', points: this.path.map(p => [...p]), paint: this.paint(this.fillStyle) });
    }
    stroke() {
      const [[x, y], [endX, endY]] = this.path;
      if (y !== endY) throw new Error('지원하지 않는 선 모양입니다.');
      this.nodes.push({ type: 'rect', x, y: y - this.lineWidth / 2, width: endX - x, height: this.lineWidth, paint: this.paint(this.strokeStyle) });
    }
  }
  async function createBundle({ snapshot, channel, loadImage, drawCard }) {
    if (!snapshot.content || !['editorial', 'contrast', 'brief'].includes(channel)) throw new Error('카드뉴스를 먼저 만들어 주세요.');
    await document.fonts.ready;
    const indices = [0, 1, 2, 3, 4];
    const assets = [], imageIds = new Map(), images = [];
    for (const i of indices) {
      const src = snapshot.cards[i].image, img = await loadImage(src);
      if (src && !img) throw new Error(`${i + 1}번 카드의 사진을 불러오지 못했어요. 사진을 바꾸거나 제거한 뒤 다시 저장해 주세요.`);
      images.push(img);
      if (img && !imageIds.has(img)) {
        const canvas = document.createElement('canvas');
        const scale = Math.min(1, 4096 / Math.max(img.width, img.height));
        canvas.width = Math.max(1, Math.round(img.width * scale)); canvas.height = Math.max(1, Math.round(img.height * scale));
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        const id = `image-${assets.length + 1}`;
        assets.push({ id, data: canvas.toDataURL('image/png') }); imageIds.set(img, id);
      }
    }
    const cards = indices.map((i, n) => {
      const canvas = document.createElement('canvas');
      const context = new SceneContext(canvas.getContext('2d'), imageIds);
      drawCard(canvas, i, images[n], { state: snapshot, channel, context });
      return { name: `${String(i + 1).padStart(2, '0')} · ${snapshot.cards[i].kind}`, width: canvas.width, height: canvas.height, nodes: context.nodes };
    });
    const bundle = { format: FORMAT, version: 1, title: snapshot.content.title, channel, sample: Boolean(snapshot.sample), sourceUrl: snapshot.article?.url || '', assets, cards };
    if (new Blob([JSON.stringify(bundle)]).size > 48_000_000) throw new Error('Figma 파일이 너무 커요. 사진 크기를 줄인 뒤 다시 저장해 주세요.');
    return bundle;
  }
  return { SceneContext, createBundle };
})();
