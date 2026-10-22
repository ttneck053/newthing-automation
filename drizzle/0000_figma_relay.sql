CREATE TABLE IF NOT EXISTS figma_relay (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  expires INTEGER NOT NULL
) WITHOUT ROWID;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS figma_relay_expiry ON figma_relay(expires);
