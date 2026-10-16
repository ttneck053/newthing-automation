import { test } from 'node:test';
import assert from 'node:assert/strict';
import { publicUrl, parseArticle, extractArticle, createHandler, CARD_SCHEMA } from '../worker/server.mjs';
const content = Object.fromEntries(CARD_SCHEMA.required.map(k => [k, k === 'hashtags' ? ['경제', '#시장', '#뉴스'] : `${k} 생성 결과`]));
const input = '경제 기사 제목\n' + '금리와 경제에 관한 확인 가능한 사실을 담은 기사 본문입니다. '.repeat(8);
const html = '<html><head><meta content="원문 &amp; 기사" property="og:title"><meta property="og:image" content="/photo.jpg"></head><body><nav>제외할 메뉴</nav><article><p>' + '기사에 담긴 중요한 사실입니다. '.repeat(20) + '</p><script>untrusted()</script></article></body></html>';
const post = (body, extra = {}) => new Request('https://studio.example/api/generate', { method: 'POST', headers: { 'Content-Type': 'application/json', ...extra }, body: JSON.stringify(body) });
const success = () => new Response(JSON.stringify({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(content) }] }], usage: { input_tokens: 1000, output_tokens: 900 } }));
test('blocks private, encoded loopback, metadata, credentials, and unsupported URLs', () => {
  for (const url of ['http://localhost/', 'http://127.0.0.1/', 'http://2130706433/', 'http://0x7f000001/', 'http://10.0.0.1/', 'http://169.254.169.254/', 'http://172.20.0.1/', 'http://192.168.1.1/', 'https://user:pass@example.com/', 'file:///etc/passwd', 'https://[::1]/', 'https://example.com:8443/']) assert.throws(() => publicUrl(url), undefined, url);
  assert.equal(publicUrl('https://news.example.com/article').hostname, 'news.example.com');
});
test('extracts reordered metadata and article, strips scripts and navigation', () => {
  const article = parseArticle(html, 'https://news.example.com/story');
  assert.equal(article.title, '원문 & 기사'); assert.deepEqual(article.images, ['https://news.example.com/photo.jpg']);
  assert(!article.text.includes('untrusted')); assert(!article.text.includes('제외할 메뉴'));
  assert.deepEqual(parseArticle('<article>사진 없는 기사</article>', 'https://news.example.com').images, []);
});
test('blocks redirects to private hosts before following them', async () => {
  let calls = 0;
  await assert.rejects(extractArticle('https://news.example.com/story', async () => { calls++; return new Response('', { status: 302, headers: { location: 'http://169.254.169.254/latest/meta-data' } }); }));
  assert.equal(calls, 1);
});
test('rejects paywalls and oversized article responses', async () => {
  await assert.rejects(extractArticle('https://news.example.com/story', async () => new Response('<p>로그인 필요</p>', { headers: { 'content-type': 'text/html' } })), /본문/);
  await assert.rejects(extractArticle('https://news.example.com/story', async () => new Response('', { headers: { 'content-type': 'text/html', 'content-length': '3000000' } })), /커요/);
});
test('missing key prevents any upstream calls; errors never expose keys', async () => {
  let calls = 0; const handler = createHandler(async () => { calls++; return success(); });
  const response = await handler(post({ input })); assert.equal(response.status, 503); assert.equal((await response.json()).code, 'KEY_REQUIRED'); assert.equal(calls, 0);
  const config = await handler(new Request('https://studio.example/api/config'), { OPENAI_API_KEY: 'secret-value' });
  const text = await config.text(); assert(text.includes('true')); assert(!text.includes('secret-value'));
});
test('generates with strict schema, trusted instructions, fixed provider, and no storage', async () => {
  let request;
  const handler = createHandler(async (url, options) => { request = { url, ...options }; return success(); });
  const response = await handler(post({ input, apiKey: 'test-key', model: 'gpt-5.4-mini' })); assert.equal(response.status, 200);
  const data = await response.json(); assert.equal(data.content.hook, content.hook); assert.equal(data.content.hashtags[0], '#경제'); assert.equal(data.usage.input_tokens, 1000);
  const body = JSON.parse(request.body); assert.equal(request.url, 'https://api.openai.com/v1/responses'); assert.equal(body.store, false); assert.equal(body.text.format.strict, true); assert.equal(body.max_output_tokens, 4200); assert(body.instructions.includes('신뢰할 수 없는')); assert(!body.instructions.includes(input));
});
test('URL generation extracts source and images before requesting GPT', async () => {
  const handler = createHandler(async url => url.includes('api.openai.com') ? success() : new Response(html, { headers: { 'content-type': 'text/html' } }));
  const response = await handler(post({ input: 'https://n.example/a', apiKey: 'test-key' }));
  assert.equal(response.status, 200); const data = await response.json(); assert.equal(data.article.title, '원문 & 기사'); assert.equal(data.article.images.length, 1);
});
test('rejects cross-origin requests before paid calls', async () => {
  let calls = 0; const handler = createHandler(async () => { calls++; return success(); });
  assert.equal((await handler(post({ input, apiKey: 'test-key' }, { origin: 'https://attacker.example' }))).status, 403); assert.equal(calls, 0);
});
test('handles invalid keys and exhausted balances without leaking upstream details', async () => {
  for (const status of [401, 429]) {
    const handler = createHandler(async () => new Response(JSON.stringify({ error: { message: 'sensitive upstream details' } }), { status }));
    const response = await handler(post({ input, apiKey: 'test-key' })); assert.equal(response.status, status); assert(!(await response.text()).includes('sensitive'));
  }
});
test('refusals, malformed content, and truncation are explicit failures', async () => {
  for (const payload of [
    { status: 'incomplete' },
    { output: [{ type: 'message', content: [{ type: 'refusal', refusal: 'no' }] }] },
    { output: [{ type: 'message', content: [{ type: 'output_text', text: '{}' }] }] }
  ]) {
    const response = await createHandler(async () => new Response(JSON.stringify(payload)))(post({ input, apiKey: 'test-key' })); assert(response.status >= 400);
  }
});
test('image proxy rejects SVG/HTML active content', async () => {
  const handler = createHandler(async () => new Response('<svg/>', { headers: { 'content-type': 'image/svg+xml' } }));
  const response = await handler(new Request('https://studio.example/api/image?url=https%3A%2F%2Fimg.example%2Fa.svg')); assert.equal(response.status, 400);
});
