// Short-lived transfers, persistent pairing, separate sender/receiver capabilities.
const CONNECTION_TTL = 30 * 86400, TRANSFER_TTL = 600, CHUNK_SIZE = 200000;
class RelayError extends Error { constructor(message, status = 400) { super(message); this.status = status; } }
const requireRelay = (condition, message, status) => { if (!condition) throw new RelayError(message, status); };
const relayToken = () => Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2, '0')).join('');
const relayHash = async text => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))), b => b.toString(16).padStart(2, '0')).join('');
const validToken = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const cleanString = (value, max = 150) => typeof value === 'string' ? value.slice(0, max) : '';
async function relayMutate(store, key, fn, ttl = CONNECTION_TTL) {
  for (let i = 0; i < 12; i++) {
    const before = await store.get(key), value = before ? JSON.parse(before) : null;
    const next = fn(value);
    if (await store.cas(key, before, JSON.stringify(next), ttl)) return next;
  }
  throw new RelayError('연결이 바빠요. 잠시 후 다시 시도해 주세요.', 409);
}
export function createD1RelayStore(database, now = Date.now) {
  if (!database) return null;
  // Keep each request on the primary before relying on compare-and-set results.
  const db = database.withSession ? database.withSession('first-primary') : database;
  async function query(sql, values, first = false) {
    try { const statement = db.prepare(sql).bind(...values); return first ? await statement.first() : await statement.run(); }
    catch (error) {
      if (/limit|quota|SQLITE_FULL|exceeded/i.test(error.message || '')) throw new RelayError('무료 전송 저장소의 사용 한도에 도달했어요. 한도가 복구된 뒤 다시 시도해 주세요.', 429);
      throw new RelayError('Figma 전송 저장소를 사용할 수 없어요. 서버 연결을 확인해 주세요.', 503);
    }
  }
  return {
    async get(key) { return (await query('SELECT value FROM figma_relay WHERE key=? AND expires>?', [key, now()], true))?.value ?? null; },
    set: (key, value, ttl) => query('INSERT INTO figma_relay(key,value,expires) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value, expires=excluded.expires', [key, value, now() + ttl * 1000]),
    delete: key => query('DELETE FROM figma_relay WHERE key=?', [key]),
    async cas(key, before, after, ttl) {
      const time = now(), expires = time + ttl * 1000;
      const result = before === null
        ? await query('INSERT INTO figma_relay(key,value,expires) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value, expires=excluded.expires WHERE figma_relay.expires<=?', [key, after, expires, time])
        : await query('UPDATE figma_relay SET value=?, expires=? WHERE key=? AND value=? AND expires>?', [after, expires, key, before, time]);
      return result.meta.changes === 1;
    }
  };
}
export async function cleanFigmaRelay(database, now = Date.now) {
  // Bounded, indexed cleanup. No permanent storage of expired card images.
  return database.prepare('DELETE FROM figma_relay WHERE key IN (SELECT key FROM figma_relay WHERE expires<=? ORDER BY expires LIMIT 1000)').bind(now()).run();
}
export function createFigmaRelay(store, now = Date.now) {
  const reply = (value, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
  const online = c => c.receiver && now() - c.seen < 45000;
  const view = c => ({ user: c.user, destination: c.destination, receiver: c.receiver, online: Boolean(online(c)), paired: Boolean(c.sender), job: c.job && { id: c.job.id, state: c.job.state, error: c.job.error, count: c.job.count } });
  return async request => {
    try {
      requireRelay(store, 'Figma 전송 저장소 연결이 필요해요. 서버의 무료 D1 연결을 확인해 주세요.', 503);
      requireRelay(request.method === 'POST', 'POST 요청을 사용해 주세요.', 405);
      const origin = request.headers.get('origin');
      requireRelay(!origin || origin === new URL(request.url).origin, '이 스튜디오에서 연결해 주세요.', 403);
      requireRelay(request.headers.get('content-type')?.includes('application/json'), 'JSON 요청이 필요해요.', 415);
      const reader = request.body?.getReader(); let bytes = 0, parts = [];
      if (reader) while (true) { const { value, done } = await reader.read(); if (done) break; bytes += value.byteLength; if (bytes > 900000) { await reader.cancel(); throw new RelayError('요청이 너무 커요.', 413); } parts.push(value); }
      let b;
      try { b = JSON.parse(await new Blob(parts).text()); } catch { throw new RelayError('JSON 요청을 확인해 주세요.'); }
      requireRelay(b && typeof b === 'object' && !Array.isArray(b), 'JSON 객체가 필요해요.');
      const action = b.action;
      if (['create', 'pair'].includes(action)) {
        const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('cf-connecting-ip') || 'local';
        await relayMutate(store, 'rate:' + await relayHash(ip), value => {
          const v = value && now() - value.start < 60000 ? value : { start: now(), count: 0 };
          requireRelay(v.count < 20, '연결 요청이 많아요. 잠시 후 다시 시도해 주세요.', 429); v.count++; return v;
        }, 60);
      }
      if (action === 'create') {
        requireRelay(typeof b.user?.id === 'string' && b.user.id && typeof b.user?.name === 'string' && b.user.name, 'Figma 로그인 계정을 확인해 주세요.');
        const id = relayToken(), token = relayToken(), code = relayToken().slice(0, 10).toUpperCase();
        const c = { receiverHash: await relayHash(token), user: { id: cleanString(b.user.id), name: cleanString(b.user.name) }, created: now(), seen: 0, sender: null };
        await store.set('conn:' + id, JSON.stringify(c), 600);
        await store.set('pair:' + code, JSON.stringify({ id }), 300);
        return reply({ id, token, code, expiresAt: now() + 300000 });
      }
      if (action === 'pair') {
        requireRelay(/^[A-F0-9]{10}$/.test(b.code || '') && validToken(b.token), '플러그인의 연결 코드를 입력해 주세요.');
        const pair = await store.get('pair:' + b.code); requireRelay(pair, '연결 코드가 만료됐어요. 플러그인에서 새 코드를 받아 주세요.', 404);
        const { id } = JSON.parse(pair), hash = await relayHash(b.token);
        const c = await relayMutate(store, 'conn:' + id, c => { requireRelay(c, '연결이 만료됐어요.', 404); requireRelay(!c.sender || c.sender === hash, '이미 사용된 연결 코드예요.', 409); c.sender = hash; return c; });
        return reply({ id, ...view(c) });
      }
      requireRelay(validToken(b.id), 'Figma 계정을 먼저 연결해 주세요.', 401);
      const token = request.headers.get('authorization')?.replace(/^Bearer /, '');
      requireRelay(validToken(token), 'Figma 연결 인증이 필요해요.', 401);
      const hash = await relayHash(token), key = 'conn:' + b.id;
      const receiverActions = ['poll', 'read', 'complete'], senderActions = ['status', 'begin', 'chunk', 'commit', 'cancel'];
      requireRelay([...receiverActions, ...senderActions, 'disconnect'].includes(action), '지원하지 않는 전송 요청이에요.');
      const authenticate = c => {
        requireRelay(c, 'Figma 연결이 만료되거나 해제됐어요. 다시 연결해 주세요.', 404);
        const receiver = c.receiverHash === hash, sender = c.sender === hash;
        requireRelay(action === 'disconnect' ? receiver || sender : receiverActions.includes(action) ? receiver : sender, 'Figma 연결 권한이 없어요.', 403);
        return c;
      };
      let c = authenticate(JSON.parse(await store.get(key) || 'null'));
      if (action === 'disconnect') { await store.delete(key); if (c.job) for (let i = 0; i < c.job.chunks; i++) await store.delete('chunk:' + b.id + ':' + c.job.id + ':' + i); return reply({ disconnected: true }); }
      if (c.job && !['done', 'error', 'cancelled'].includes(c.job.state) && now() - c.job.started > TRANSFER_TTL * 1000) {
        c = await relayMutate(store, key, c => { authenticate(c); if (c.job && !['done', 'error', 'cancelled'].includes(c.job.state) && now() - c.job.started > TRANSFER_TTL * 1000) { c.job.state = 'error'; c.job.error = '전송 시간이 만료됐어요. 결과를 확인한 뒤 다시 보내 주세요.'; } return c; });
      }
      if (action === 'status') return reply(view(c));
      if (action === 'poll') {
        requireRelay(validToken(b.instance) && b.userId === c.user.id && b.destination?.pageId, 'Figma 계정 또는 파일을 확인해 주세요.', 403);
        c = await relayMutate(store, key, c => {
          authenticate(c);
          requireRelay(!online(c) || c.receiver === b.instance, '다른 Figma 파일의 플러그인이 연결돼 있어요. 그 플러그인을 닫은 뒤 기다려 주세요.', 409);
          c.receiver = b.instance; c.seen = now(); c.destination = { file: cleanString(b.destination.file), page: cleanString(b.destination.page), pageId: cleanString(b.destination.pageId) };
          if (c.job?.state === 'processing' && c.job.receiver !== b.instance) { c.job.state = 'error'; c.job.error = '이전 플러그인 실행의 제작 결과를 확인하지 못했어요. 캔버스를 확인한 뒤 다시 보내 주세요.'; }
          if (c.job?.state === 'queued') {
            if (c.job.receiver !== b.instance || c.job.pageId !== c.destination.pageId) { c.job.state = 'error'; c.job.error = '받을 Figma 파일이나 페이지가 바뀌었어요. 대상 확인 후 다시 보내 주세요.'; }
            else c.job.state = 'processing';
          }
          return c;
        }, c.sender ? CONNECTION_TTL : 600);
        return reply({ ...view(c), transfer: c.job?.state === 'processing' && c.job.receiver === b.instance ? { id: c.job.id, chunks: c.job.chunks, digest: c.job.digest, pageId: c.job.pageId, arrangement: c.job.arrangement } : null });
      }
      if (action === 'begin') {
        requireRelay(validToken(b.jobId) && /^[a-f0-9]{64}$/.test(b.digest || '') && Number.isInteger(b.chunks) && b.chunks > 0 && b.chunks <= 240 && ['row', 'grid', 'column'].includes(b.arrangement), '전송 데이터 형식을 확인해 주세요.');
        c = await relayMutate(store, key, c => {
          authenticate(c); if (c.job?.id === b.jobId) return c;
          requireRelay(online(c) && c.receiver === b.receiver && c.destination.pageId === b.pageId, '받을 Figma 파일에서 플러그인을 열어 주세요.', 409);
          requireRelay(!c.job || ['done', 'error', 'cancelled'].includes(c.job.state), '앞선 카드가 전송 중이에요.', 409);
          c.job = { id: b.jobId, chunks: b.chunks, digest: b.digest, arrangement: b.arrangement, receiver: c.receiver, pageId: b.pageId, state: 'uploading', received: [], started: now() }; return c;
        }); return reply(view(c));
      }
      requireRelay(c.job && c.job.id === b.jobId, '전송 작업을 찾지 못했어요.', 404);
      const chunkKey = 'chunk:' + b.id + ':' + b.jobId + ':' + b.index;
      if (action === 'chunk') {
        requireRelay(c.job.state === 'uploading' && Number.isInteger(b.index) && b.index >= 0 && b.index < c.job.chunks && typeof b.text === 'string' && b.text.length <= CHUNK_SIZE, '전송 조각을 확인해 주세요.');
        // A UTF-16 slice can split an emoji's surrogate pair. JSON escaping keeps
        // each half intact when SQLite/D1 stores the chunk as UTF-8 text.
        await store.set(chunkKey, JSON.stringify(b.text), TRANSFER_TTL);
        await relayMutate(store, key, c => { authenticate(c); requireRelay(c.job?.id === b.jobId && c.job.state === 'uploading', '전송 상태가 바뀌었어요.', 409); if (!c.job.received.includes(b.index)) c.job.received.push(b.index); return c; });
        return reply({ uploaded: b.index });
      }
      if (action === 'read') {
        requireRelay(c.job.state === 'processing' && c.job.receiver === b.instance && Number.isInteger(b.index) && b.index >= 0 && b.index < c.job.chunks, '전송 수신 권한이 없어요.', 403);
        const text = await store.get(chunkKey); requireRelay(text !== null, '전송 내용이 만료됐어요.', 410); return reply({ text: JSON.parse(text) });
      }
      c = await relayMutate(store, key, c => {
        authenticate(c); requireRelay(c.job?.id === b.jobId, '전송 작업이 바뀌었어요.', 409);
        if (action === 'commit') {
          if (['queued', 'processing', 'done'].includes(c.job.state)) return c;
          requireRelay(c.job.state === 'uploading' && c.job.received.length === c.job.chunks, '아직 전송되지 않은 사진이 있어요.', 409);
          requireRelay(online(c) && c.receiver === c.job.receiver && c.destination.pageId === c.job.pageId, '받을 Figma 페이지가 바뀌었어요.', 409); c.job.state = 'queued';
        } else if (action === 'complete') {
          requireRelay(c.job.receiver === b.instance && ['processing', 'done', 'error'].includes(c.job.state), '전송 완료 권한이 없어요.', 403);
          if (c.job.state !== 'processing') return c;
          c.job.state = b.error ? 'error' : 'done'; c.job.error = cleanString(b.error, 350); c.job.count = Math.min(5, Math.max(0, Number(b.count) || 0));
        } else if (action === 'cancel') { requireRelay(['uploading', 'queued', 'cancelled'].includes(c.job.state), '이미 Figma에서 제작 중이에요. 캔버스에서 결과를 확인해 주세요.', 409); c.job.state = 'cancelled'; }
        return c;
      });
      if (['done', 'error', 'cancelled'].includes(c.job.state)) await Promise.all(Array.from({ length: c.job.chunks }, (_, i) => store.delete('chunk:' + b.id + ':' + b.jobId + ':' + i)));
      return reply(view(c));
    } catch (error) { return reply({ error: error instanceof RelayError ? error.message : 'Figma 연결 요청을 처리하지 못했어요.' }, error instanceof RelayError ? error.status : 500); }
  };
}
