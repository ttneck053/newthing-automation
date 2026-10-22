import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../web/app.js', import.meta.url), 'utf8');
const migration = source.slice(source.indexOf('function readStored('), source.indexOf('const sampleContent'));
function storage(values, full = false) {
  const store = { ...values };
  Object.defineProperties(store, {
    getItem: { value: key => store[key] ?? null },
    setItem: { value: (key, value) => { if (full) throw new Error('QuotaExceededError'); store[key] = value; } },
    removeItem: { value: key => { delete store[key]; } }
  });
  return store;
}
function reader(localStorage) {
  const context = vm.createContext({ localStorage });
  vm.runInContext(migration, context);
  return context.readStored;
}
test('moves saved work, personal keys and pairing data without changing their values', () => {
  for (const [suffix, destination, value] of [
    ['-contents-studio-v1', 'folio-studio-v1', JSON.stringify({ version: 1, state: { content: '저장된 문구', cards: [] } })],
    ['-openai-key-v1', 'folio-openai-key-v1', 'sk-test-only'],
    ['-figma-connection-v1', 'folio-figma-connection-v1', JSON.stringify({ id: 'a'.repeat(64), token: 'b'.repeat(64) })]
  ]) {
    const previous = 'previous' + suffix;
    const store = storage({ [previous]: value, unrelated: 'keep' });
    assert.equal(reader(store)(destination, suffix), value);
    assert.equal(store[destination], value);
    assert.equal(store[previous], undefined);
    assert.equal(store.unrelated, 'keep');
  }
});
test('an existing current value wins over older data, including an empty value', () => {
  for (const current of ['current work', '']) {
    const store = storage({ 'folio-studio-v1': current, 'previous-contents-studio-v1': 'older work' });
    assert.equal(reader(store)('folio-studio-v1', '-contents-studio-v1'), current);
  }
});
test('a full browser store leaves the previous data readable and does not delete it', () => {
  const store = storage({ 'previous-contents-studio-v1': 'saved work' }, true);
  assert.equal(reader(store)('folio-studio-v1', '-contents-studio-v1'), 'saved work');
  assert.equal(store['previous-contents-studio-v1'], 'saved work');
  assert.equal(reader(store)('missing', '-missing'), null);
});
