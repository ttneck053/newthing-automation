// Run with the local Cloudflare emulator; creates and removes its own pairing.
import assert from 'node:assert/strict';
import { randomBytes, createHash } from 'node:crypto';
const origin = process.env.TEST_ORIGIN || 'http://localhost:4199';
assert(['localhost','127.0.0.1'].includes(new URL(origin).hostname), 'Only run against the local emulator.');
const token = () => randomBytes(32).toString('hex');
async function request(body, auth) {
  const response = await fetch(origin + '/api/figma', {method:'POST',headers:{'Content-Type':'application/json',Origin:origin,...(auth?{Authorization:'Bearer '+auth}:{})},body:JSON.stringify(body)});
  const result = await response.json(); assert.equal(response.status,200,JSON.stringify(result)); return result;
}
for (const path of ['/','/generate']) {
  const response = await fetch(origin + path); assert.equal(response.status,200);
  assert.match(await response.text(), /Figma에서 제작/);
  assert.match(response.headers.get('content-security-policy'), /script-src 'self'/);
}
assert.equal((await (await fetch(origin+'/api/config')).json()).configured,false);
const receiver = await request({action:'create',user:{id:'qa-cloudflare',name:'무료 환경 테스트'}});
try {
  const sender = token(), instance = token(), jobId = token(), raw = JSON.stringify({text:'카드🎨'.repeat(65000)});
  const chunks = Math.ceil(raw.length/200000), digest = createHash('sha256').update(raw).digest('hex');
  await request({action:'pair',code:receiver.code,token:sender});
  const poll = () => request({action:'poll',id:receiver.id,instance,userId:'qa-cloudflare',destination:{file:'QA',page:'페이지 1',pageId:'qa-page'}},receiver.token);
  assert((await poll()).paired);
  await request({action:'begin',id:receiver.id,jobId,chunks,digest,receiver:instance,pageId:'qa-page',arrangement:'row'},sender);
  for (let index=0;index<chunks;index++) await request({action:'chunk',id:receiver.id,jobId,index,text:raw.slice(index*200000,(index+1)*200000)},sender);
  await request({action:'commit',id:receiver.id,jobId},sender);
  assert.equal((await poll()).transfer.id,jobId);
  const parts=[];
  for(let index=0;index<chunks;index++) parts.push((await request({action:'read',id:receiver.id,jobId,index,instance},receiver.token)).text);
  assert.equal(createHash('sha256').update(parts.join('')).digest('hex'),digest,'Unicode chunks must survive the SQL UTF-8 boundary.');
  await request({action:'complete',id:receiver.id,jobId,instance,count:5},receiver.token);
  assert.equal((await request({action:'status',id:receiver.id},sender)).job.state,'done');
  console.log('Cloudflare runtime: static routing, headers, D1 pairing, Unicode chunk transfer and completion passed.');
} finally { await request({action:'disconnect',id:receiver.id},receiver.token); }
