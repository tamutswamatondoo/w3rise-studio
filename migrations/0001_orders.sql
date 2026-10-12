-- Private order records. No customer files are stored or served by this database.
CREATE TABLE orders (
  reference TEXT PRIMARY KEY,
  request_id TEXT NOT NULL UNIQUE,
  request_hash TEXT NOT NULL,
  data TEXT NOT NULL CHECK(json_valid(data)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  is_test INTEGER NOT NULL DEFAULT 0 CHECK(is_test IN (0,1)),
  provider_transaction_id TEXT UNIQUE COLLATE NOCASE,
  CHECK(json_extract(data, '$.currency') = 'USD'),
  CHECK(json_extract(data, '$.priceCents') = 2000)
);
CREATE INDEX orders_created ON orders(created_at);
CREATE INDEX orders_test_created ON orders(is_test, created_at);
-- Short lived salted hashes, never raw visitor IP addresses.
CREATE TABLE intake_rate_limits (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX intake_rate_expiry ON intake_rate_limits(expires_at);
CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
