// Bang du lieu cho tinh nang Livestream AI (them vao app.db co san)
// Quy tac: chi tien trinh API (manager) duoc ghi DB; worker chi giao tiep IPC.

export function initLiveSchema(db) {
  db.exec(`
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  price INTEGER,                 -- VND
  promo_price INTEGER,           -- VND, null = khong khuyen mai
  description TEXT,
  selling_points TEXT,           -- moi dong 1 y ban hang
  active INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_products_user ON products(user_id);

CREATE TABLE IF NOT EXISTS stream_assets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'clip',   -- 'clip' | 'banner'
  orig_name TEXT,
  file_path TEXT NOT NULL,             -- file da chuan hoa (720x1280@30, khong tieng)
  duration_s INTEGER,
  size_bytes INTEGER NOT NULL DEFAULT 0,
  normalized INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_assets_user ON stream_assets(user_id);

CREATE TABLE IF NOT EXISTS stream_targets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  platform TEXT NOT NULL,              -- 'tiktok' | 'shopee' | 'custom'
  rtmp_url TEXT NOT NULL,
  stream_key_enc TEXT NOT NULL,        -- AES-256-GCM
  key_last4 TEXT,
  tiktok_username TEXT,                -- de doc binh luan TikTok
  status TEXT NOT NULL DEFAULT 'ok',   -- 'ok' | 'auth_failed'
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_targets_user ON stream_targets(user_id);

CREATE TABLE IF NOT EXISTS stream_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT,
  state TEXT NOT NULL DEFAULT 'stopped',
    -- 'scheduled' | 'starting' | 'live' | 'stopping' | 'stopped' | 'error'
  product_ids TEXT NOT NULL DEFAULT '[]',   -- JSON [id,...]
  asset_ids TEXT NOT NULL DEFAULT '[]',
  target_ids TEXT NOT NULL DEFAULT '[]',
  comments_ai INTEGER NOT NULL DEFAULT 0,   -- bat/tat tra loi binh luan TikTok
  schedule_start INTEGER,                   -- epoch ms, null = start tay
  schedule_end INTEGER,
  started_at INTEGER,
  ended_at INTEGER,
  streamed_seconds INTEGER NOT NULL DEFAULT 0,
  last_heartbeat INTEGER,
  worker_pid INTEGER,
  restart_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON stream_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_state ON stream_sessions(state);

CREATE TABLE IF NOT EXISTS script_log (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  kind TEXT NOT NULL,                  -- 'script' | 'comment_answer' | 'filler' | 'system'
  text TEXT NOT NULL,
  product_id TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_scriptlog_session ON script_log(session_id, created_at);

CREATE TABLE IF NOT EXISTS comment_log (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  username TEXT,
  comment TEXT,
  answer TEXT,
  answered INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_commentlog_session ON comment_log(session_id, created_at);
`);

  // users: them cot dem gio live da dung (migration co guard)
  const cols = db.prepare("PRAGMA table_info(users)").all().map(c => c.name);
  if (!cols.includes('used_stream_seconds')) {
    db.exec('ALTER TABLE users ADD COLUMN used_stream_seconds INTEGER NOT NULL DEFAULT 0');
  }
}
