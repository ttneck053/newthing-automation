import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker from '../worker/cloudflare.mjs';
test('free hosting requires the caller GPT key and never uses an operator key', async () => {
  const env = {OPENAI_API_KEY:'operator-key-must-not-be-used'};
  const config = await worker.fetch(new Request('https://studio.example/api/config'),env);
  assert.equal((await config.json()).configured,false);
  const result = await worker.fetch(new Request('https://studio.example/api/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({input:'키 없이 과금이 발생하면 안 되는 생성 요청을 보내는 테스트입니다.'})}),env);
  assert.equal(result.status,503); assert.equal((await result.json()).code,'KEY_REQUIRED');
});
test('assets use the free static binding and the cron runs bounded cleanup', async () => {
  const request = new Request('https://studio.example/generate'); let sql,deadline;
  const env = {ASSETS:{fetch:async actual=>{assert.equal(actual,request);return new Response('static');}},FIGMA_DB:{prepare:query=>{sql=query;return {bind:value=>{deadline=value;return {run:async()=>({meta:{changes:0}})};}}}}};
  assert.equal(await (await worker.fetch(request,env)).text(),'static');
  await worker.scheduled({},env); assert.match(sql,/LIMIT 1000/); assert(Number.isFinite(deadline));
});
