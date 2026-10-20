import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, chmodSync } from 'node:fs';
import { dirname } from 'node:path';
export function createLocalRelayStore(path) {
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  const db = new DatabaseSync(path); chmodSync(path, 0o600);
  db.exec('PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS relay (key TEXT PRIMARY KEY, value TEXT NOT NULL, expires INTEGER NOT NULL)');
  const get = db.prepare('SELECT value FROM relay WHERE key=? AND expires>?');
  const put = db.prepare('INSERT INTO relay VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value, expires=excluded.expires');
  const del = db.prepare('DELETE FROM relay WHERE key=?'), sweep = db.prepare('DELETE FROM relay WHERE expires<=?');
  let lastSweep = 0;
  const clean = () => { if (Date.now() - lastSweep > 60000) { sweep.run(Date.now()); lastSweep = Date.now(); } };
  return {
    async get(key) { clean(); return get.get(key, Date.now())?.value ?? null; },
    async set(key, value, ttl) { clean(); put.run(key, value, Date.now() + ttl * 1000); },
    async delete(key) { del.run(key); },
    async cas(key, before, after, ttl) {
      db.exec('BEGIN IMMEDIATE');
      try { const current = get.get(key, Date.now())?.value ?? null; if (current !== before) { db.exec('ROLLBACK'); return false; } put.run(key, after, Date.now() + ttl * 1000); db.exec('COMMIT'); return true; }
      catch (error) { db.exec('ROLLBACK'); throw error; }
    }
  };
}
