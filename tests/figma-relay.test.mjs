import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createFigmaRelay, createD1RelayStore, cleanFigmaRelay } from '../worker/figma-relay.mjs';
import { createLocalRelayStore } from '../scripts/figma-local-store.mjs';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import vm from 'node:vm';
import { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';
const token = c => c.repeat(64);
const user = { id: 'figma-user', name: '테스트 사용자' };
function setup() {
  let time = 1000000; const entries = new Map();
  const store = {
    async get(k) { const e = entries.get(k); return e && e.expires > time ? e.value : null; },
    async set(k, value, ttl) { entries.set(k, { value, expires: time + ttl * 1000 }); },
    async delete(k) { entries.delete(k); },
    async cas(k, before, after, ttl) { if (await this.get(k) !== before) return false; await this.set(k, after, ttl); return true; }
  };
  const handler = createFigmaRelay(store, () => time);
  async function request(body, auth, headers = {}) {
    const response = await handler(new Request('https://studio.example/api/figma', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: 'Bearer ' + auth } : {}), ...headers }, body: JSON.stringify(body) }));
    return { status: response.status, ...(await response.json()) };
  }
  return { store, entries, request, advance: ms => time += ms };
}
async function paired(s) {
  const receiver = await s.request({ action: 'create', user }); assert.equal(receiver.status, 200);
  const sender = await s.request({ action: 'pair', code: receiver.code, token: token('a') }); assert.equal(sender.status, 200);
  const poll = () => s.request({ action: 'poll', id: receiver.id, instance: token('b'), userId: user.id, destination: { file: '카드뉴스', page: '페이지 1', pageId: 'page1' } }, receiver.token);
  await poll(); return { receiver, sender, poll };
}
test('pairs a Figma account once, tracks destination and separates sender/receiver permissions', async () => {
  const s = setup(), { receiver } = await paired(s);
  const status = await s.request({ action: 'status', id: receiver.id }, token('a'));
  assert.equal(status.user.name, user.name); assert.equal(status.destination.file, '카드뉴스'); assert(status.online);
  assert.equal((await s.request({ action: 'status', id: receiver.id }, receiver.token)).status, 403);
  assert.equal((await s.request({ action: 'pair', code: receiver.code, token: token('c') })).status, 409);
  assert.equal((await s.request({ action: 'status', id: receiver.id }, token('c'))).status, 403);
  s.advance(46000); assert.equal((await s.request({ action: 'status', id: receiver.id }, token('a'))).online, false);
});
test('transfers chunks, claims once and reports completion without exposing credentials', async () => {
  const s = setup(), { receiver, poll } = await paired(s), id = receiver.id, jobId = token('d');
  assert.equal((await s.request({ action: 'begin', id, jobId, chunks: 2, digest: token('e'), receiver: token('b'), pageId: 'page1', arrangement: 'row' }, token('a'))).status, 200);
  assert.equal((await s.request({ action: 'commit', id, jobId }, token('a'))).status, 409);
  for (let index = 0; index < 2; index++) assert.equal((await s.request({ action: 'chunk', id, jobId, index, text: 'part' + index }, token('a'))).status, 200);
  assert.equal((await s.request({ action: 'commit', id, jobId }, token('a'))).job.state, 'queued');
  assert.equal((await poll()).transfer.id, jobId);
  assert.equal((await s.request({ action: 'read', id, jobId, index: 0, instance: token('b') }, receiver.token)).text, 'part0');
  assert.equal((await s.request({ action: 'read', id, jobId, index: 0, instance: token('b') }, token('a'))).status, 403);
  const done = await s.request({ action: 'complete', id, jobId, instance: token('b'), count: 5 }, receiver.token);
  assert.equal(done.job.state, 'done'); assert.equal(done.job.count, 5); assert(!JSON.stringify(done).includes('Hash'));
  assert.equal(await s.store.get('chunk:' + id + ':' + jobId + ':0'), null);
  assert.equal((await poll()).transfer, null);
});
test('rejects conflicting receivers and refuses to insert in a changed page', async () => {
  const s = setup(), { receiver } = await paired(s), id = receiver.id;
  const changed = { action: 'poll', id, instance: token('f'), userId: user.id, destination: { file: '다른 파일', page: '다른 페이지', pageId: 'page2' } };
  assert.equal((await s.request(changed, receiver.token)).status, 409);
  await s.request({ action: 'begin', id, jobId: token('d'), chunks: 1, digest: token('e'), receiver: token('b'), pageId: 'page1', arrangement: 'row' }, token('a'));
  await s.request({ action: 'chunk', id, jobId: token('d'), index: 0, text: '{}' }, token('a'));
  await s.request({ ...changed, instance: token('b') }, receiver.token);
  assert.equal((await s.request({ action: 'commit', id, jobId: token('d') }, token('a'))).status, 409);
});
test('expires pairing codes, cancels pending jobs, and revokes both sides on disconnect', async () => {
  const s = setup(), { receiver } = await paired(s), id = receiver.id;
  await s.request({ action: 'begin', id, jobId: token('d'), chunks: 1, digest: token('e'), receiver: token('b'), pageId: 'page1', arrangement: 'row' }, token('a'));
  assert.equal((await s.request({ action: 'cancel', id, jobId: token('d') }, token('a'))).job.state, 'cancelled');
  s.advance(301000);
  assert.equal((await s.request({ action: 'pair', code: receiver.code, token: token('c') })).status, 404);
  await s.request({ action: 'disconnect', id }, token('a'));
  assert.equal((await s.request({ action: 'status', id }, token('a'))).status, 404);
});
test('rejects cross-origin requests and limits anonymous pairing attempts', async () => {
  const s = setup();
  assert.equal((await s.request({ action: 'create', user }, null, { Origin: 'https://other.example' })).status, 403);
  for (let i = 0; i < 20; i++) await s.request({ action: 'pair', code: 'AAAAAAAAAA', token: token('a') });
  assert.equal((await s.request({ action: 'create', user })).status, 429);
});
test('SQLite relay persists across instances and performs compare-and-set atomically', async () => {
  const file = join(mkdtempSync(join(tmpdir(), 'ax-relay-')), 'relay.sqlite');
  const first = createLocalRelayStore(file), second = createLocalRelayStore(file);
  await first.set('test', 'before', 60); assert.equal(await second.get('test'), 'before');
  assert.equal(await second.cas('test', 'wrong', 'bad', 60), false);
  assert.equal(await second.cas('test', 'before', 'after', 60), true); assert.equal(await first.get('test'), 'after');
  await first.delete('test'); assert.equal(await second.get('test'), null);
});
function d1Fixture() {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(readFileSync(new URL('../migrations/0001_figma_relay.sql', import.meta.url), 'utf8'));
  const database = { prepare(sql) { return { bind(...values) { return {
    async first() { return sqlite.prepare(sql).get(...values) ?? null; },
    async run() { return { meta: { changes: Number(sqlite.prepare(sql).run(...values).changes) } }; }
  }; } }; } };
  return { database, sqlite };
}
test('D1 stores expire, compare-and-set prevents lost writes, and hourly cleanup deletes expired images', async () => {
  const { database, sqlite } = d1Fixture(); let now = 1000000;
  const store = createD1RelayStore(database, () => now), other = createD1RelayStore(database, () => now);
  assert.equal(createD1RelayStore(null), null);
  assert.equal(await store.cas('connection', null, 'first', 60), true);
  assert.equal(await other.cas('connection', null, 'overwrite', 60), false);
  assert.equal(await other.cas('connection', 'first', 'second', 60), true);
  assert.equal(await store.cas('connection', 'first', 'stale', 60), false);
  assert.equal(await store.get('connection'), 'second');
  await store.set('chunk:expired', 'image bytes', 5); now += 6000;
  assert.equal(await other.get('chunk:expired'), null);
  await cleanFigmaRelay(database, () => now);
  assert.equal(sqlite.prepare("SELECT count(*) AS n FROM figma_relay WHERE key='chunk:expired'").get().n, 0);
  now += 60000; assert.equal(await store.cas('connection', null, 'renewed', 60), true);
  await store.delete('connection'); assert.equal(await store.get('connection'), null);
});
test('D1 free quota failures are recoverable errors with no external paid-store fallback', async () => {
  const store = createD1RelayStore({ prepare() { return { bind() { return { first: async()=>{ throw new Error('D1_ERROR: daily read limit exceeded'); } }; } }; } });
  const response = await createFigmaRelay(store)(new Request('https://studio.example/api/figma', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'create',user})}));
  assert.equal(response.status,429); assert.match((await response.json()).error,/무료 전송 저장소/);
});
test('downloaded plugin connects only to the source studio origin', () => {
  const ctx = vm.createContext({ URL }); vm.runInContext(readFileSync(new URL('../web/figma-package.js', import.meta.url), 'utf8'), ctx);
  const files = ['manifest.json', 'ui.html'].map(name => ({ name, text: readFileSync(new URL('../figma-plugin/' + name, import.meta.url), 'utf8') }));
  const result = ctx.AXFigmaPackage.configure(files, 'https://studio.example/path?secret=omit');
  assert.deepEqual(JSON.parse(result[0].text).networkAccess.allowedDomains, ['https://studio.example']);
  assert(result[1].text.includes('content="https://studio.example"')); assert(!result[1].text.includes('secret=omit'));
  assert.throws(() => ctx.AXFigmaPackage.configure(files, 'http://public.example'));
});
test('sandbox checksum matches SHA-256 for Unicode, padding boundaries, and large photos', async () => {
  const ctx = vm.createContext({ crypto: {}, TextEncoder });
  vm.runInContext(readFileSync(new URL('../web/figma-client.js', import.meta.url), 'utf8'), ctx);
  for (const text of ['', 'abc', '카드뉴스 🎨', ...[55,56,63,64,65,200000,4400000].map(n=>'a'.repeat(n))]) {
    assert.equal(await ctx.AXFigmaClient.digest(text), createHash('sha256').update(text).digest('hex'));
  }
});
test('returns input errors for malformed JSON and invalid account data', async () => {
  const s = setup();
  assert.equal((await s.request(null)).status, 400);
  assert.equal((await s.request({action:'create',user:{id:123,name:'Test'}})).status, 400);
  const response = await createFigmaRelay(s.store)(new Request('https://studio.example/api/figma', {method:'POST',headers:{'Content-Type':'application/json'},body:'{'}));
  assert.equal(response.status, 400);
});
test('receiver recovers a lost completion reply without blocking the next transfer or repeating the import', async () => {
  const elements = new Map(), imports = [], listeners = {};
  let state = 'processing';
  const job = { id: token('d'), chunks: 1, digest: 'checksum', pageId: 'page1', arrangement: 'row' };
  const parent = {postMessage: msg => { if (msg.action === 'import') imports.push(msg); }};
  const ctx = vm.createContext({
    parent, setTimeout:()=>1, clearTimeout:()=>{},
    document:{querySelector:selector=>{if (!elements.has(selector)) elements.set(selector,{textContent:'',hidden:false,classList:{toggle:()=>{}},addEventListener:()=>{}});return elements.get(selector);}},
    AXFigmaClient:{token:()=>token('b'),digest:async()=>'checksum',request:async(_connection,body)=>{
      if (body.action==='poll') return {paired:true,job:{...job,state,count:5},transfer:state==='processing'?job:null};
      if (body.action==='read') return {text:'{}'};
      if (body.action==='complete') { state='done'; throw new Error('lost reply'); }
    }}
  });
  ctx.window = {addEventListener:(name,fn)=>listeners[name]=fn};
  vm.runInContext(readFileSync(new URL('../web/figma-receiver.js', import.meta.url), 'utf8'), ctx);
  listeners.message({source:parent,data:{type:'ax-receiver-host',session:'a'.repeat(32),action:'context',context:{user,destination:{pageId:'page1'}},connection:{id:token('e'),token:token('f')}}});
  await vm.runInContext('poll()',ctx); assert.equal(imports.length,1);
  await vm.runInContext('complete({count:5})',ctx);
  assert(vm.runInContext('Boolean(inFlight)',ctx));
  await vm.runInContext('poll()',ctx);
  assert.equal(vm.runInContext('inFlight',ctx),null); assert.equal(imports.length,1);
  assert.match(elements.get('#status').textContent,/5장 제작 완료/);
});
