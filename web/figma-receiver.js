'use strict';
const client = AXFigmaClient, $ = s => document.querySelector(s);
const instance = client.token();
let session = '', context = null, connection = null, timer, running = false, inFlight = null, creation = false, initialized = false, retryDelay = 0;
const handled = new Map();
function status(message, error = false) { $('#status').textContent = message; $('#status').classList.toggle('error', error); }
function host(action, data = {}) { parent.postMessage({ type: 'ax-receiver', session, action, ...data }, '*'); }
function showContext() { $('#account').textContent = context?.user ? context.user.name + ' 님으로 연결' : 'Figma에 로그인해 주세요.'; $('#destination').textContent = context?.destination.file || '파일 이름 없음'; $('#page').textContent = context?.destination.page || ''; }
async function createConnection() {
 if (creation || !context?.user) return;
 creation = true; $('#reconnect').hidden = true;
 try {
  const data = await client.request(null, { action: 'create', user: context.user });
  connection = { id: data.id, token: data.token };
  host('save-connection', { connection });
  $('#pairing').hidden = false; $('#code').textContent = data.code.slice(0,5) + ' ' + data.code.slice(5); $('#disconnect').hidden = false;
  status('웹앱에서 연결 코드를 입력해 주세요.');
  setTimeout(() => { if (!$('#pairing').hidden) $('#reconnect').hidden = false; }, 300000);
  schedule(0);
 } catch (error) { status(error.message, true); $('#reconnect').hidden = false; }
 finally { creation = false; }
}
function schedule(ms = retryDelay || (inFlight ? 2500 : 10000)) { clearTimeout(timer); timer = setTimeout(poll, ms); }
async function complete(result) {
 if (!inFlight) return;
 const job = inFlight;
 handled.set(job.id, result);
 // Persist the receipt before acknowledgement: reconnecting must not duplicate cards.
 host('save-receipt', { jobId: job.id, result });
 try { await client.request(connection, { action: 'complete', instance, jobId: job.id, ...result }); inFlight = null; status(result.error || `${result.count}장 제작 완료\n웹앱에서 다음 결과를 보내면 여기에 추가돼요.`, Boolean(result.error)); }
 catch (error) { status('결과는 처리됐지만 완료 상태를 전송하지 못했어요. 연결을 다시 시도하고 있어요.', true); }
 schedule();
}
async function poll() {
 if (running || !connection || !context?.user) return;
 running = true;
 try {
  const data = await client.request(connection, { action: 'poll', instance, userId: context.user.id, destination: context.destination });
  retryDelay = 0;
  if (data.paired) { $('#pairing').hidden = true; $('#reconnect').hidden = true; }
  if (inFlight && data.job?.id === inFlight.id && ['done','error','cancelled'].includes(data.job.state)) inFlight = null;
  const job = data.transfer;
  if (job && handled.has(job.id)) { inFlight = job; await complete(handled.get(job.id)); }
  else if (job && !inFlight) {
   inFlight = job; status('웹앱 결과를 받아 Figma에 만들고 있어요…');
   try {
    const parts = [];
    for (let index = 0; index < job.chunks; index++) parts.push((await client.request(connection, { action: 'read', instance, jobId: job.id, index })).text);
    const raw = parts.join(''); if (await client.digest(raw) !== job.digest) throw new Error('전송된 내용이 일치하지 않아요. 웹앱에서 다시 보내 주세요.');
    host('import', { raw, requestId: job.id, targetPageId: job.pageId, arrangement: job.arrangement });
   } catch (error) { await complete({ error: error.message }); }
  } else if (!inFlight && data.paired) status(data.job?.state === 'error' ? data.job.error : data.job?.state === 'done' ? `${data.job.count}장 제작 완료 · 다음 전송을 기다리고 있어요.` : '연결됨 · 웹앱에서 “Figma에서 제작”을 누르세요.', data.job?.state === 'error');
 } catch (error) {
  status(error.message, true);
  retryDelay = Math.min(300000, Math.max(30000, retryDelay * 2));
  if ([401,403,404].includes(error.status)) { connection = null; host('save-connection', { connection: null }); $('#pairing').hidden = true; $('#reconnect').hidden = false; }
 } finally { running = false; if (connection) schedule(); }
}
window.addEventListener('message', event => {
 const msg = event.data;
 if (event.source !== parent || msg?.type !== 'ax-receiver-host' || !/^[a-f0-9]{32}$/.test(msg.session || '')) return;
 if (session && session !== msg.session) return;
 session = msg.session;
 if (msg.action === 'context') {
  context = msg.context; showContext();
  if (!initialized) {
   initialized = true; connection = msg.connection;
   for (const receipt of msg.receipts || []) handled.set(receipt.jobId, receipt.result);
   if (connection) { $('#disconnect').hidden = false; schedule(0); } else createConnection();
  }
 } else if (msg.action === 'result' && inFlight?.id === msg.requestId) complete(msg.error ? { error: msg.error } : { count: msg.count });
});
$('#reconnect').addEventListener('click', createConnection);
$('#disconnect').addEventListener('click', async () => {
 if (inFlight) return status('제작이 완료된 뒤 연결을 해제해 주세요.', true);
 try { if (connection) await client.request(connection, { action: 'disconnect' }); connection = null; clearTimeout(timer); host('save-connection', { connection: null }); $('#pairing').hidden = true; $('#disconnect').hidden = true; $('#reconnect').hidden = false; status('계정 연결을 해제했어요.'); } catch (error) { status(error.message,true); }
});
if (parent !== window) parent.postMessage({ type: 'ax-receiver-loaded' }, '*');
else status('이 화면은 Figma 플러그인에서 열어 주세요.', true);
