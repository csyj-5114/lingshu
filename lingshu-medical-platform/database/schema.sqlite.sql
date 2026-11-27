PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- 应用数据快照：保存四类角色共享的业务聚合状态。
CREATE TABLE IF NOT EXISTS app_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  payload TEXT NOT NULL,
  revision INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL
);

-- 登录凭据独立存储，密码使用 scrypt + 随机盐哈希。
CREATE TABLE IF NOT EXISTS credentials (
  user_id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  status INTEGER NOT NULL DEFAULT 1,
  approval_status TEXT NOT NULL DEFAULT 'approved',
  review_reason TEXT,
  reviewed_by TEXT,
  reviewed_at TEXT,
  fail_count INTEGER NOT NULL DEFAULT 0,
  lock_until TEXT,
  updated_at TEXT NOT NULL
);

-- 医生、药师注册时提交的执业资质。二进制材料以 Data URL 形式保存。
CREATE TABLE IF NOT EXISTS qualification_documents (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL,
  institution TEXT,
  department TEXT,
  title TEXT,
  specialty TEXT,
  license_no TEXT NOT NULL,
  years_experience INTEGER,
  document_name TEXT NOT NULL,
  document_type TEXT NOT NULL,
  document_data TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  submitted_at TEXT NOT NULL,
  reviewed_by TEXT,
  review_reason TEXT,
  reviewed_at TEXT
);

-- 手机号短信验证码。仅保存手机号摘要，不保存原始手机号或明文验证码。
CREATE TABLE IF NOT EXISTS phone_verifications (
  id TEXT PRIMARY KEY,
  phone_hash TEXT NOT NULL,
  purpose TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  attempts INTEGER NOT NULL DEFAULT 0
);

-- 服务端会话使用随机 Token；数据库仅保存 Token 的 SHA-256 摘要。
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT,
  action TEXT NOT NULL,
  detail TEXT,
  ip TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expire ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_audit_user_time ON audit_logs(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_qualification_user ON qualification_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_qualification_status ON qualification_documents(status, submitted_at);
CREATE INDEX IF NOT EXISTS idx_phone_verification_lookup
  ON phone_verifications(phone_hash, purpose, created_at);
