import {
  createHash,
  createHmac,
  randomBytes,
  randomInt,
  randomUUID,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import {
  RX_STATUS,
  normalizeMapLocation,
  pharmacyRecommendations,
  transitionPrescription,
} from "../frontend/js/domain.js";
import { createSeedState } from "../frontend/js/seed.js";

const sessionHours = 12;
const lockMinutes = 15;
const databasePath = resolve(
  process.env.DB_PATH || fileURLToPath(new URL("./data/lingshu.sqlite", import.meta.url)),
);
mkdirSync(dirname(databasePath), { recursive: true });

export const db = new DatabaseSync(databasePath);
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;
  PRAGMA busy_timeout = 5000;

  CREATE TABLE IF NOT EXISTS app_state (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    payload TEXT NOT NULL,
    revision INTEGER NOT NULL DEFAULT 1,
    updated_at TEXT NOT NULL
  );

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
`);

const credentialColumns = new Set(
  db.prepare("PRAGMA table_info(credentials)").all().map((column) => column.name),
);
for (const [name, definition] of [
  ["approval_status", "TEXT NOT NULL DEFAULT 'approved'"],
  ["review_reason", "TEXT"],
  ["reviewed_by", "TEXT"],
  ["reviewed_at", "TEXT"],
]) {
  if (!credentialColumns.has(name)) {
    db.exec(`ALTER TABLE credentials ADD COLUMN ${name} ${definition}`);
  }
}

export class AppError extends Error {
  constructor(message, status = 400, code = "BAD_REQUEST") {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function hashPassword(password, salt) {
  return scryptSync(password, salt, 64).toString("hex");
}

function hashPhone(phone) {
  return createHash("sha256").update(String(phone)).digest("hex");
}

function hashSmsCode(verificationId, phone, code) {
  const secret = process.env.SMS_CODE_SECRET || "lingshu-local-sms-secret";
  return createHmac("sha256", secret)
    .update(`${verificationId}:${phone}:${code}`)
    .digest("hex");
}

function safeCompare(left, right) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export function safeUser(user) {
  if (!user) return null;
  const { password, ...safe } = user;
  return safe;
}

export function sanitizeState(state) {
  const { serverRevision, serverUpdatedAt, ...cleanState } = state;
  return {
    ...cleanState,
    users: state.users.map(safeUser),
    registrations: Array.isArray(state.registrations) ? state.registrations : [],
  };
}

function normalizeState(state) {
  return {
    ...state,
    hospital: state.hospital || null,
    registrations: Array.isArray(state.registrations) ? state.registrations : [],
    users: (state.users || []).map((user) => ({
      ...user,
      realName:
        user.role === "ADMIN" && user.username === "admin" ? "管理员" : user.realName,
      phone:
        user.role === "ADMIN" && user.username === "admin" ? "13900001120" : user.phone,
      approvalStatus:
        user.approvalStatus ||
        (["DOCTOR", "PHARMACIST"].includes(user.role) ? "approved" : "approved"),
    })),
  };
}

function seedDatabase() {
  const existing = db.prepare("SELECT id FROM app_state WHERE id = 1").get();
  if (existing) return;
  const state = createSeedState();
  const now = new Date().toISOString();
  const insertCredential = db.prepare(`
    INSERT INTO credentials (
      user_id, username, password_hash, password_salt, status,
      approval_status, reviewed_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  db.exec("BEGIN IMMEDIATE");
  try {
    for (const user of state.users) {
      const salt = randomBytes(16).toString("hex");
      insertCredential.run(
        user.id,
        user.username,
        hashPassword(user.password || "demo123", salt),
        salt,
        user.status ?? 1,
        user.approvalStatus || "approved",
        now,
        now,
      );
    }
    db.prepare(
      "INSERT INTO app_state (id, payload, revision, updated_at) VALUES (1, ?, 1, ?)",
    ).run(JSON.stringify(sanitizeState(state)), now);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

seedDatabase();

export function readState() {
  const row = db.prepare("SELECT payload, revision, updated_at FROM app_state WHERE id = 1").get();
  if (!row) throw new AppError("数据库尚未初始化", 500, "DATABASE_NOT_READY");
  return {
    ...normalizeState(JSON.parse(row.payload)),
    serverRevision: row.revision,
    serverUpdatedAt: row.updated_at,
  };
}

export function writeState(nextState, actorId = null, action = "STATE_UPDATE", ip = null) {
  const now = new Date().toISOString();
  const current = db.prepare("SELECT revision FROM app_state WHERE id = 1").get();
  const nextRevision = Number(current?.revision || 0) + 1;
  const payload = JSON.stringify(sanitizeState(nextState));
  db.exec("BEGIN IMMEDIATE");
  try {
    db.prepare(
      "UPDATE app_state SET payload = ?, revision = ?, updated_at = ? WHERE id = 1",
    ).run(payload, nextRevision, now);
    const updateCredential = db.prepare(
      "UPDATE credentials SET status = ?, approval_status = ?, updated_at = ? WHERE user_id = ?",
    );
    for (const user of nextState.users) {
      updateCredential.run(user.status ?? 1, user.approvalStatus || "approved", now, user.id);
    }
    db.prepare(
      "INSERT INTO audit_logs (user_id, action, detail, ip, created_at) VALUES (?, ?, ?, ?, ?)",
    ).run(actorId, action, JSON.stringify({ revision: nextRevision }), ip, now);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
  return readState();
}

export function authenticate(identifier, password) {
  const normalizedIdentifier = String(identifier || "").trim();
  let credential = db
    .prepare("SELECT * FROM credentials WHERE username = ?")
    .get(normalizedIdentifier);
  if (!credential && /^1\d{10}$/.test(normalizedIdentifier)) {
    const matchedUser = readState().users.find((user) => user.phone === normalizedIdentifier);
    if (matchedUser) {
      credential = db
        .prepare("SELECT * FROM credentials WHERE user_id = ?")
        .get(matchedUser.id);
    }
  }
  if (!credential) throw new AppError("账号或密码错误", 401, "INVALID_CREDENTIALS");
  if (credential.lock_until && new Date(credential.lock_until) > new Date()) {
    throw new AppError("连续登录失败次数过多，请稍后再试", 423, "ACCOUNT_LOCKED");
  }
  const candidate = hashPassword(String(password || ""), credential.password_salt);
  if (!safeCompare(candidate, credential.password_hash)) {
    const failCount = Number(credential.fail_count) + 1;
    const lockUntil =
      failCount >= 5 ? new Date(Date.now() + lockMinutes * 60 * 1000).toISOString() : null;
    db.prepare(
      "UPDATE credentials SET fail_count = ?, lock_until = ?, updated_at = ? WHERE user_id = ?",
    ).run(failCount, lockUntil, new Date().toISOString(), credential.user_id);
    throw new AppError("账号或密码错误", 401, "INVALID_CREDENTIALS");
  }

  if (credential.approval_status === "pending") {
    throw new AppError("资质正在审核中，管理员通过后即可登录", 403, "ACCOUNT_PENDING");
  }
  if (credential.status !== 1 && credential.approval_status !== "rejected") {
    throw new AppError("账号已被停用，请联系管理员", 403, "ACCOUNT_DISABLED");
  }

  db.prepare(
    "UPDATE credentials SET fail_count = 0, lock_until = NULL, updated_at = ? WHERE user_id = ?",
  ).run(new Date().toISOString(), credential.user_id);
  const state = readState();
  const user = state.users.find((item) => item.id === credential.user_id);
  if (!user) throw new AppError("用户资料不存在", 500, "USER_PROFILE_MISSING");
  db.prepare(
    "INSERT INTO audit_logs (user_id, action, detail, ip, created_at) VALUES (?, ?, ?, ?, ?)",
  ).run(user.id, "LOGIN", JSON.stringify({ role: user.role }), null, new Date().toISOString());
  return safeUser(user);
}

export function createPhoneVerification(phoneInput, purpose) {
  const phone = String(phoneInput || "").trim();
  if (!/^1\d{10}$/.test(phone)) throw new AppError("请输入 11 位手机号", 400, "INVALID_PHONE");
  if (!["register", "reset"].includes(purpose)) {
    throw new AppError("验证码用途不正确", 400, "INVALID_SMS_PURPOSE");
  }
  const state = readState();
  const existingUser = state.users.find((user) => user.phone === phone);
  if (purpose === "register" && existingUser) {
    throw new AppError(
      existingUser.approvalStatus === "rejected"
        ? "该手机号已有审核未通过的专业账号，请直接登录后重新提交资质"
        : "该手机号已注册，请直接登录",
      409,
      "PHONE_EXISTS",
    );
  }
  if (purpose === "reset" && !existingUser) {
    throw new AppError("未找到使用该手机号的账号", 404, "PHONE_NOT_FOUND");
  }

  const phoneHash = hashPhone(phone);
  const latest = db
    .prepare(
      `SELECT created_at FROM phone_verifications
       WHERE phone_hash = ? AND purpose = ?
       ORDER BY created_at DESC LIMIT 1`,
    )
    .get(phoneHash, purpose);
  if (latest && Date.now() - new Date(latest.created_at).getTime() < 60_000) {
    const waitSeconds = Math.ceil(
      (60_000 - (Date.now() - new Date(latest.created_at).getTime())) / 1000,
    );
    throw new AppError(`发送过于频繁，请 ${waitSeconds} 秒后再试`, 429, "SMS_RATE_LIMITED");
  }

  const id = randomUUID();
  const code = String(randomInt(100000, 1000000));
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 5 * 60 * 1000);
  db.prepare(
    `INSERT INTO phone_verifications
     (id, phone_hash, purpose, code_hash, created_at, expires_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    phoneHash,
    purpose,
    hashSmsCode(id, phone, code),
    now.toISOString(),
    expiresAt.toISOString(),
  );
  db.prepare("DELETE FROM phone_verifications WHERE expires_at < ?").run(
    new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
  );
  return {
    verificationId: id,
    code,
    phone,
    purpose,
    expiresAt: expiresAt.toISOString(),
  };
}

export function verifyPhoneCode(phoneInput, purpose, codeInput, consume = false) {
  const phone = String(phoneInput || "").trim();
  const code = String(codeInput || "").trim();
  if (!/^\d{6}$/.test(code)) throw new AppError("请输入 6 位短信验证码", 400, "INVALID_SMS_CODE");
  const phoneHash = hashPhone(phone);
  const record = db
    .prepare(
      `SELECT * FROM phone_verifications
       WHERE phone_hash = ? AND purpose = ? AND used_at IS NULL
       ORDER BY created_at DESC LIMIT 1`,
    )
    .get(phoneHash, purpose);
  if (!record) throw new AppError("请先获取短信验证码", 400, "SMS_CODE_NOT_REQUESTED");
  if (new Date(record.expires_at) < new Date()) {
    db.prepare("UPDATE phone_verifications SET used_at = ? WHERE id = ?").run(
      new Date().toISOString(),
      record.id,
    );
    throw new AppError("短信验证码已过期，请重新获取", 400, "SMS_CODE_EXPIRED");
  }
  if (record.attempts >= 5) {
    throw new AppError("验证码错误次数过多，请重新获取", 429, "SMS_ATTEMPTS_EXCEEDED");
  }
  const matches = safeCompare(record.code_hash, hashSmsCode(record.id, phone, code));
  if (!matches) {
    db.prepare("UPDATE phone_verifications SET attempts = attempts + 1 WHERE id = ?").run(record.id);
    throw new AppError("短信验证码不正确", 400, "INVALID_SMS_CODE");
  }
  if (consume) {
    db.prepare("UPDATE phone_verifications SET used_at = ? WHERE id = ?").run(
      new Date().toISOString(),
      record.id,
    );
  }
  return { verificationId: record.id, expiresAt: record.expires_at };
}

function generateAccount(role, state) {
  const prefix = { PATIENT: "lspat", DOCTOR: "lsdoc", PHARMACIST: "lspha" }[role];
  let sequence = state.users.length + 1;
  while (sequence < 1_000_000) {
    const candidate = `${prefix}${String(sequence).padStart(6, "0")}`;
    if (
      !state.users.some((user) => user.username.toLowerCase() === candidate) &&
      !db.prepare("SELECT 1 FROM credentials WHERE username = ?").get(candidate)
    ) {
      return candidate;
    }
    sequence += 1;
  }
  throw new AppError("暂时无法分配登录账号，请稍后重试", 500, "ACCOUNT_GENERATION_FAILED");
}

function normalizeCatalogText(value, fallback = "") {
  return String(value ?? fallback).trim();
}

function normalizedCatalogKey(value) {
  return normalizeCatalogText(value)
    .toLowerCase()
    .replace(/[\s·,，。()（）/\\-]/g, "");
}

function normalizeDrugCatalog(catalog) {
  if (!Array.isArray(catalog) || !catalog.length) {
    throw new AppError("请上传并解析药品目录 Excel 文件", 400, "MISSING_DRUG_CATALOG");
  }
  if (catalog.length > 2000) {
    throw new AppError("单个药品目录不能超过 2000 种药品", 400, "DRUG_CATALOG_TOO_LARGE");
  }
  const seen = new Set();
  return catalog.map((item, index) => {
    const rowNumber = index + 2;
    const name = normalizeCatalogText(item?.name);
    if (!name) {
      throw new AppError(`药品目录第 ${rowNumber} 行缺少药品名称`, 400, "INVALID_DRUG_ROW");
    }
    const spec = normalizeCatalogText(item?.spec, "未填写");
    const manufacturer = normalizeCatalogText(item?.manufacturer, "未填写");
    const approvalNo = normalizeCatalogText(item?.approvalNo);
    const code = normalizeCatalogText(
      item?.code,
      `DRG-${createHash("sha256")
        .update(`${name}|${spec}|${manufacturer}|${approvalNo}`)
        .digest("hex")
        .slice(0, 10)
        .toUpperCase()}`,
    );
    const price = Number(item?.price);
    if (!Number.isFinite(price) || price <= 0) {
      throw new AppError(
        `药品目录第 ${rowNumber} 行“${name}”的单价必须大于 0`,
        400,
        "INVALID_DRUG_PRICE",
      );
    }
    const stockValue = Number(item?.stock);
    const stock = Number.isFinite(stockValue) ? Math.max(0, Math.floor(stockValue)) : 0;
    const typeText = normalizeCatalogText(item?.type);
    const identity = normalizedCatalogKey(
      approvalNo ? `approval:${approvalNo}` : `${name}|${spec}|${manufacturer}`,
    );
    if (seen.has(identity)) {
      throw new AppError(
        `药品目录第 ${rowNumber} 行与前面的药品重复`,
        400,
        "DUPLICATE_DRUG_ROW",
      );
    }
    seen.add(identity);
    return {
      code,
      name,
      spec,
      manufacturer,
      approvalNo: approvalNo || `待补录-${code}`,
      type: Number(item?.type) === 1 || typeText.includes("处方") ? 1 : 2,
      price: Number(price.toFixed(2)),
      stock,
      contraindication: normalizeCatalogText(item?.contraindication, "暂无特别说明"),
    };
  });
}

function sameDrug(drug, item) {
  const approvalNo = normalizedCatalogKey(item.approvalNo);
  const isRealApprovalNo = approvalNo && !approvalNo.startsWith("待补录");
  if (isRealApprovalNo) {
    return normalizedCatalogKey(drug.approvalNo) === approvalNo;
  }
  if (normalizedCatalogKey(drug.code) === normalizedCatalogKey(item.code)) return true;
  return (
    normalizedCatalogKey(drug.name) === normalizedCatalogKey(item.name) &&
    normalizedCatalogKey(drug.spec) === normalizedCatalogKey(item.spec) &&
    normalizedCatalogKey(drug.manufacturer) === normalizedCatalogKey(item.manufacturer)
  );
}

function mergePharmacyCatalog(currentDrugs, pharmacy, catalog, now) {
  const updatedDrugs = currentDrugs.map((drug) => ({
    ...drug,
    pharmacyIds: Array.isArray(drug.pharmacyIds) ? [...drug.pharmacyIds] : [],
    pharmacyOffers: Array.isArray(drug.pharmacyOffers)
      ? drug.pharmacyOffers.map((offer) => ({ ...offer }))
      : [],
  }));
  const pharmacyCatalog = new Map(
    (pharmacy.catalog || []).map((offer) => [offer.drugId, { ...offer }]),
  );

  for (const item of catalog) {
    let drugIndex = updatedDrugs.findIndex((drug) => sameDrug(drug, item));
    if (drugIndex < 0) {
      updatedDrugs.push({
        id: `drg-${randomUUID()}`,
        code: item.code,
        name: item.name,
        spec: item.spec,
        manufacturer: item.manufacturer,
        approvalNo: item.approvalNo,
        type: item.type,
        price: item.price,
        contraindication: item.contraindication,
        enabled: item.stock > 0,
        stock: item.stock,
        pharmacyIds: [],
        pharmacyOffers: [],
      });
      drugIndex = updatedDrugs.length - 1;
    }
    const drug = updatedDrugs[drugIndex];
    const offer = {
      pharmacyId: pharmacy.id,
      price: item.price,
      stock: item.stock,
      enabled: item.stock > 0,
      updatedAt: now,
    };
    drug.name = item.name;
    drug.spec = item.spec;
    drug.manufacturer = item.manufacturer;
    drug.approvalNo = item.approvalNo;
    drug.type = item.type;
    drug.contraindication = item.contraindication;
    drug.pharmacyIds = Array.from(new Set([...(drug.pharmacyIds || []), pharmacy.id]));
    drug.pharmacyOffers = [
      ...(drug.pharmacyOffers || []).filter((entry) => entry.pharmacyId !== pharmacy.id),
      offer,
    ];
    const activeOffers = drug.pharmacyOffers.filter(
      (entry) => entry.enabled !== false && Number(entry.stock) > 0,
    );
    const pricedOffers = activeOffers.length
      ? activeOffers
      : drug.pharmacyOffers.filter((entry) => Number(entry.price) > 0);
    drug.price = Math.min(
      ...(pricedOffers.length ? pricedOffers.map((entry) => Number(entry.price)) : [item.price]),
    );
    drug.stock = drug.pharmacyOffers.reduce(
      (total, entry) => total + Math.max(0, Number(entry.stock) || 0),
      0,
    );
    drug.enabled = activeOffers.length > 0;
    drug.lastCatalogSyncedAt = now;
    pharmacyCatalog.set(drug.id, {
      drugId: drug.id,
      code: item.code,
      name: item.name,
      spec: item.spec,
      manufacturer: item.manufacturer,
      approvalNo: item.approvalNo,
      type: item.type,
      price: item.price,
      stock: item.stock,
      contraindication: item.contraindication,
      enabled: item.stock > 0,
      updatedAt: now,
    });
  }

  const nextCatalog = [...pharmacyCatalog.values()];
  const prices = nextCatalog.map((item) => Number(item.price)).filter((price) => price > 0);
  return {
    drugs: updatedDrugs,
    pharmacy: {
      ...pharmacy,
      status: 1,
      catalog: nextCatalog,
      drugIds: nextCatalog.map((item) => item.drugId),
      catalogUpdatedAt: now,
      priceFactor: prices.length
        ? Math.min(
            1.15,
            Math.max(0.85, prices.reduce((sum, price) => sum + price, 0) / prices.length / 30),
          )
        : Number(pharmacy.priceFactor || 1),
    },
  };
}

export function registerAccount(input, ip = null) {
  const role = String(input.role || "").toUpperCase();
  if (!["PATIENT", "DOCTOR", "PHARMACIST"].includes(role)) {
    throw new AppError("请选择患者、医生或药师身份", 400, "INVALID_ROLE");
  }
  const password = String(input.password || "");
  const realName = String(input.realName || "").trim();
  const phone = String(input.phone || "").trim();
  if (password.length < 8 || password.length > 64) {
    throw new AppError("密码长度需为 8—64 位", 400, "INVALID_PASSWORD");
  }
  if (realName.length < 2 || realName.length > 50) {
    throw new AppError("请填写真实姓名", 400, "INVALID_REAL_NAME");
  }
  if (!/^1\d{10}$/.test(phone)) {
    throw new AppError("请输入 11 位手机号", 400, "INVALID_PHONE");
  }
  if (role === "PATIENT" && String(input.address || "").trim().length < 5) {
    throw new AppError("请填写常用地址", 400, "MISSING_ADDRESS");
  }
  if (role === "PATIENT" && !normalizeMapLocation(input.mapLocation)) {
    throw new AppError("请在地图中选择常用位置", 400, "MISSING_MAP_LOCATION");
  }

  const state = readState();
  if (state.users.some((user) => user.phone === phone)) {
    throw new AppError("该手机号已注册", 409, "PHONE_EXISTS");
  }
  verifyPhoneCode(phone, "register", input.smsCode, true);
  const username = generateAccount(role, state);

  const professional = role !== "PATIENT";
  const qualification = input.qualification || {};
  let documentData = null;
  let documentName = null;
  let documentType = null;
  if (professional) {
    if (!String(qualification.institution || "").trim()) {
      throw new AppError("请填写执业机构", 400, "MISSING_INSTITUTION");
    }
    if (!String(qualification.licenseNo || "").trim()) {
      throw new AppError("请填写资格证书编号", 400, "MISSING_LICENSE");
    }
    documentName = String(qualification.documentName || "").trim();
    documentType = String(qualification.documentType || "").trim();
    documentData = String(qualification.documentData || "");
    if (!documentName || !["image/jpeg", "image/png", "application/pdf"].includes(documentType)) {
      throw new AppError("请上传 JPG、PNG 或 PDF 格式的资质材料", 400, "MISSING_DOCUMENT");
    }
    if (documentData.length > 2 * 1024 * 1024) {
      throw new AppError("资质材料不能超过 1.5MB", 413, "DOCUMENT_TOO_LARGE");
    }
  }

  const now = new Date().toISOString();
  const userId = `u-${randomUUID()}`;
  const approvalStatus = professional ? "pending" : "approved";
  const status = professional ? 0 : 1;
  const user = {
    id: userId,
    username,
    realName,
    role,
    phone,
    status,
    approvalStatus,
    createdAt: now,
    lastActive: now,
    address: String(input.address || "").trim(),
    mapLocation: normalizeMapLocation(input.mapLocation),
  };

  if (role === "PATIENT") {
    Object.assign(user, {
      patientNo: `P${new Date().getFullYear()}${String(state.users.length + 1).padStart(5, "0")}`,
      gender: String(input.gender || "未填写"),
      age: Number(input.age) || null,
      bloodType: String(input.bloodType || "未填写").trim(),
      allergy: String(input.allergy || "暂无已知过敏").trim(),
      medicalHistory: String(input.medicalHistory || "暂无记录").trim(),
      address: String(input.address || "").trim(),
      mapLocation: normalizeMapLocation(input.mapLocation),
    });
  } else if (role === "DOCTOR") {
    Object.assign(user, {
      doctorNo: `D${new Date().getFullYear()}${String(state.users.length + 1).padStart(5, "0")}`,
      department: String(qualification.department || "全科医学科").trim(),
      title: String(qualification.title || "医师").trim(),
      hospital: String(qualification.institution).trim(),
      hospitalId: String(qualification.hospitalId || "").trim() || null,
      specialty: String(qualification.specialty || "").trim(),
      licenseNo: String(qualification.licenseNo).trim(),
      rating: 0,
      consultCount: 0,
      online: false,
    });
  } else {
    const pharmacyName = String(qualification.pharmacyName || "").trim();
    const pharmacyAddress = String(qualification.pharmacyAddress || "").trim();
    const pharmacyLicenseNo = String(qualification.pharmacyLicenseNo || "").trim();
    const drugCatalog = normalizeDrugCatalog(qualification.drugCatalog);
    if (
      !pharmacyName ||
      !pharmacyAddress ||
      !pharmacyLicenseNo ||
      !normalizeMapLocation(qualification.pharmacyMapLocation)
    ) {
      throw new AppError(
        "请填写所属药房名称、地址、经营许可证编号并在地图中选择药房位置",
        400,
        "MISSING_PHARMACY_INFO",
      );
    }
    if (!drugCatalog.length) {
      throw new AppError("请上传并解析药品目录 Excel 文件", 400, "MISSING_DRUG_CATALOG");
    }
    Object.assign(user, {
      pharmacistNo: `PH${new Date().getFullYear()}${String(state.users.length + 1).padStart(5, "0")}`,
      title: String(qualification.title || "药师").trim(),
      hospital: pharmacyName,
      licenseNo: String(qualification.licenseNo).trim(),
      specialty: String(qualification.specialty || "处方审核").trim(),
      pharmacyName,
      pharmacyAddress,
      pharmacyLicenseNo,
      pharmacyPhone: phone,
      pharmacyMapLocation: normalizeMapLocation(
        qualification.pharmacyMapLocation,
      ),
      drugCatalog,
    });
  }

  const registrationId = `reg-${randomUUID()}`;
  const registration = professional
    ? {
        id: registrationId,
        userId,
        role,
        realName,
        username,
        phone,
        institution: String(qualification.institution).trim(),
        hospitalId: String(qualification.hospitalId || "").trim() || null,
        department: String(qualification.department || "").trim(),
        title: String(qualification.title || "").trim(),
        specialty: String(qualification.specialty || "").trim(),
        licenseNo: String(qualification.licenseNo).trim(),
        yearsExperience: Number(qualification.yearsExperience) || 0,
        documentName,
        documentType,
        status: "pending",
        submittedAt: now,
        ...(role === "PHARMACIST"
          ? {
              pharmacyName: user.pharmacyName,
              pharmacyAddress: user.pharmacyAddress,
              pharmacyPhone: user.pharmacyPhone,
              pharmacyLicenseNo: user.pharmacyLicenseNo,
              pharmacyMapLocation: user.pharmacyMapLocation,
              catalogFileName: String(qualification.catalogFileName || "").trim(),
              drugCatalog: user.drugCatalog,
            }
          : {}),
      }
    : null;

  const salt = randomBytes(16).toString("hex");
  const passwordHash = hashPassword(password, salt);
  const nextState = {
    ...state,
    users: [...state.users, user],
    registrations: registration
      ? [registration, ...state.registrations]
      : state.registrations,
    notifications: professional
      ? [
          {
            id: `note-${randomUUID()}`,
            role: "ADMIN",
            icon: "shield",
            title: "收到新的资质审核申请",
            content: `${realName}提交了${role === "DOCTOR" ? "医生" : "药师"}账号审核材料。`,
            time: "刚刚",
            unread: true,
          },
          ...state.notifications,
        ]
      : state.notifications,
  };
  const revision = Number(state.serverRevision || 1) + 1;
  db.exec("BEGIN IMMEDIATE");
  try {
    db.prepare(`
      INSERT INTO credentials (
        user_id, username, password_hash, password_salt, status,
        approval_status, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(userId, username, passwordHash, salt, status, approvalStatus, now);
    if (professional) {
      db.prepare(`
        INSERT INTO qualification_documents (
          id, user_id, role, institution, department, title, specialty,
          license_no, years_experience, document_name, document_type,
          document_data, status, submitted_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
      `).run(
        registrationId,
        userId,
        role,
        registration.institution,
        registration.department,
        registration.title,
        registration.specialty,
        registration.licenseNo,
        registration.yearsExperience,
        documentName,
        documentType,
        documentData,
        now,
      );
    }
    db.prepare(
      "UPDATE app_state SET payload = ?, revision = ?, updated_at = ? WHERE id = 1",
    ).run(JSON.stringify(sanitizeState(nextState)), revision, now);
    db.prepare(
      "INSERT INTO audit_logs (user_id, action, detail, ip, created_at) VALUES (?, ?, ?, ?, ?)",
    ).run(
      userId,
      professional ? "PROFESSIONAL_REGISTRATION_SUBMITTED" : "PATIENT_REGISTRATION",
      JSON.stringify({ role }),
      ip,
      now,
    );
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
  return {
    user: safeUser(user),
    registration: registration ? { ...registration } : null,
  };
}

export function resetPasswordByPhone(phoneInput, smsCode, newPassword, ip = null) {
  const phone = String(phoneInput || "").trim();
  const password = String(newPassword || "");
  if (!/^1\d{10}$/.test(phone)) throw new AppError("请输入 11 位手机号", 400, "INVALID_PHONE");
  if (password.length < 8 || password.length > 64) {
    throw new AppError("新密码长度需为 8—64 位", 400, "INVALID_PASSWORD");
  }
  const state = readState();
  const user = state.users.find((item) => item.phone === phone);
  if (!user) throw new AppError("未找到使用该手机号的账号", 404, "PHONE_NOT_FOUND");
  verifyPhoneCode(phone, "reset", smsCode, true);

  const salt = randomBytes(16).toString("hex");
  const passwordHash = hashPassword(password, salt);
  const now = new Date().toISOString();
  db.prepare(`
    UPDATE credentials
    SET password_hash = ?, password_salt = ?, fail_count = 0, lock_until = NULL, updated_at = ?
    WHERE user_id = ?
  `).run(passwordHash, salt, now, user.id);
  db.prepare("DELETE FROM sessions WHERE user_id = ?").run(user.id);
  db.prepare(
    "INSERT INTO audit_logs (user_id, action, detail, ip, created_at) VALUES (?, ?, ?, ?, ?)",
  ).run(user.id, "PASSWORD_RESET_BY_SMS", "{}", ip, now);
  return {
    username: user.username,
    realName: user.realName,
    role: user.role,
  };
}

export function reviewRegistration(actorId, userId, decision, reason = "", ip = null) {
  if (!["approve", "reject"].includes(decision)) {
    throw new AppError("审核结论不正确", 400, "INVALID_REVIEW_DECISION");
  }
  const normalizedReason = String(reason || "").trim();
  if (decision === "reject" && !normalizedReason) {
    throw new AppError("驳回时必须填写原因", 400, "MISSING_REVIEW_REASON");
  }
  const current = readState();
  const user = current.users.find((item) => item.id === userId);
  const registration = current.registrations.find((item) => item.userId === userId);
  if (!user || !registration) throw new AppError("未找到该注册申请", 404, "REGISTRATION_NOT_FOUND");
  if (registration.status !== "pending") throw new AppError("该申请已经处理", 409, "ALREADY_REVIEWED");
  if (!["DOCTOR", "PHARMACIST"].includes(user.role)) {
    throw new AppError("该账号无需资质审核", 400, "NOT_PROFESSIONAL_ACCOUNT");
  }

  const now = new Date().toISOString();
  const approved = decision === "approve";
  const approvalStatus = approved ? "approved" : "rejected";
  let targetPharmacy = null;
  let updatedDrugs = current.drugs;
  let updatedPharmacies = current.pharmacies;
  if (approved && user.role === "PHARMACIST") {
    const catalog = normalizeDrugCatalog(registration.drugCatalog);
    const licenseKey = normalizedCatalogKey(
      registration.pharmacyLicenseNo || user.pharmacyLicenseNo,
    );
    const existingPharmacy = current.pharmacies.find(
      (pharmacy) => normalizedCatalogKey(pharmacy.licenseNo) === licenseKey,
    );
    let pharmacySequence = current.pharmacies.length + 1;
    let pharmacyCode = `PH-REG-${String(pharmacySequence).padStart(3, "0")}`;
    while (current.pharmacies.some((pharmacy) => pharmacy.code === pharmacyCode)) {
      pharmacySequence += 1;
      pharmacyCode = `PH-REG-${String(pharmacySequence).padStart(3, "0")}`;
    }
    targetPharmacy = {
      ...(existingPharmacy || {}),
      id: existingPharmacy?.id || `ph-${randomUUID()}`,
      code: existingPharmacy?.code || pharmacyCode,
      name: registration.pharmacyName || user.pharmacyName || `${user.realName}所属药房`,
      address: registration.pharmacyAddress || user.pharmacyAddress || "",
      phone: registration.pharmacyPhone || user.phone,
      mapLocation:
        normalizeMapLocation(registration.pharmacyMapLocation) ||
        normalizeMapLocation(user.pharmacyMapLocation),
      licenseNo: registration.pharmacyLicenseNo || `待补录-${user.id}`,
      status: 1,
      endpoint: existingPharmacy?.endpoint || "",
      distance: existingPharmacy?.distance || "待定位",
      hours: existingPharmacy?.hours || "09:00—21:00",
      priceFactor: existingPharmacy?.priceFactor || 1,
      drugIds: existingPharmacy?.drugIds || [],
      catalog: existingPharmacy?.catalog || [],
    };
    const merged = mergePharmacyCatalog(current.drugs, targetPharmacy, catalog, now);
    updatedDrugs = merged.drugs;
    targetPharmacy = merged.pharmacy;
    updatedPharmacies = existingPharmacy
      ? current.pharmacies.map((pharmacy) =>
          pharmacy.id === targetPharmacy.id ? targetPharmacy : pharmacy,
        )
      : [targetPharmacy, ...current.pharmacies];
  }
  const nextState = {
    ...current,
    users: current.users.map((item) =>
      item.id === userId
        ? {
            ...item,
            status: approved ? 1 : 0,
            approvalStatus,
            reviewReason: approved ? null : normalizedReason,
            reviewedAt: now,
            ...(item.role === "DOCTOR" ? { online: approved } : {}),
            ...(item.role === "PHARMACIST" && targetPharmacy
              ? { pharmacyId: targetPharmacy.id, status: 1 }
              : {}),
          }
        : item,
    ),
    registrations: current.registrations.map((item) =>
      item.userId === userId
        ? {
            ...item,
            status: approvalStatus,
            reviewReason: approved ? null : normalizedReason,
            reviewedBy: actorId,
            reviewedAt: now,
          }
        : item,
    ),
    pharmacies: updatedPharmacies,
    drugs: updatedDrugs,
    notifications: [
      {
        id: `note-${randomUUID()}`,
        role: user.role,
        icon: approved ? "checkCircle" : "alert",
        title: approved ? "专业资质审核通过" : "专业资质审核未通过",
        content: approved
          ? "你的账号已启用，现在可以登录灵枢工作台。"
          : `审核意见：${normalizedReason}`,
        time: "刚刚",
        unread: true,
      },
      ...current.notifications,
    ],
  };
  const next = writeState(
    nextState,
    actorId,
    approved ? "REGISTRATION_APPROVED" : "REGISTRATION_REJECTED",
    ip,
  );
  db.prepare(`
    UPDATE credentials
    SET status = ?, approval_status = ?, review_reason = ?, reviewed_by = ?, reviewed_at = ?, updated_at = ?
    WHERE user_id = ?
  `).run(approved ? 1 : 0, approvalStatus, normalizedReason || null, actorId, now, now, userId);
  db.prepare(`
    UPDATE qualification_documents
    SET status = ?, reviewed_by = ?, review_reason = ?, reviewed_at = ?
    WHERE user_id = ?
  `).run(approvalStatus, actorId, normalizedReason || null, now, userId);
  if (!approved) db.prepare("DELETE FROM sessions WHERE user_id = ?").run(userId);
  return {
    state: next,
    user: next.users.find((item) => item.id === userId),
  };
}

export function getQualificationDocument(userId, actor) {
  const record = db
    .prepare("SELECT * FROM qualification_documents WHERE user_id = ? ORDER BY submitted_at DESC LIMIT 1")
    .get(userId);
  if (!record) throw new AppError("未找到资质材料", 404, "QUALIFICATION_NOT_FOUND");
  if (actor.role !== "ADMIN" && actor.id !== userId) {
    throw new AppError("无权查看该资质材料", 403, "FORBIDDEN");
  }
  return {
    id: record.id,
    userId: record.user_id,
    role: record.role,
    institution: record.institution,
    department: record.department,
    title: record.title,
    specialty: record.specialty,
    licenseNo: record.license_no,
    yearsExperience: record.years_experience,
    documentName: record.document_name,
    documentType: record.document_type,
    documentData: record.document_data,
    status: record.status,
    submittedAt: record.submitted_at,
    reviewedAt: record.reviewed_at,
    reviewReason: record.review_reason,
  };
}

export function resubmitQualification(userId, input, ip = null) {
  const current = readState();
  const user = current.users.find((item) => item.id === userId);
  const registration = current.registrations.find((item) => item.userId === userId);
  if (!user || !registration) throw new AppError("未找到资质申请", 404, "REGISTRATION_NOT_FOUND");
  if (!["DOCTOR", "PHARMACIST"].includes(user.role)) {
    throw new AppError("当前账号无需提交职业资质", 400, "NOT_PROFESSIONAL_ACCOUNT");
  }
  if (user.approvalStatus !== "rejected") {
    throw new AppError("只有审核未通过的账号可以重新提交", 409, "RESUBMIT_NOT_ALLOWED");
  }

  const qualification = input.qualification || input;
  const institution = String(qualification.institution || "").trim();
  const department = String(qualification.department || "").trim();
  const licenseNo = String(qualification.licenseNo || "").trim();
  const documentName = String(qualification.documentName || "").trim();
  const documentType = String(qualification.documentType || "").trim();
  const documentData = String(qualification.documentData || "");
  if (!institution || !department || !licenseNo) {
    throw new AppError("请完整填写执业机构和资格证书编号", 400, "MISSING_QUALIFICATION");
  }
  if (!documentName || !["image/jpeg", "image/png", "application/pdf"].includes(documentType)) {
    throw new AppError("请重新上传 JPG、PNG 或 PDF 资质材料", 400, "MISSING_DOCUMENT");
  }
  if (!documentData || documentData.length > 2 * 1024 * 1024) {
    throw new AppError("资质材料不能为空且不能超过 1.5MB", 413, "DOCUMENT_TOO_LARGE");
  }
  const pharmacyFields =
    user.role === "PHARMACIST"
      ? {
          pharmacyName: String(qualification.pharmacyName || institution).trim(),
          pharmacyAddress: String(qualification.pharmacyAddress || "").trim(),
          pharmacyPhone: String(qualification.pharmacyPhone || user.phone).trim(),
          pharmacyMapLocation: normalizeMapLocation(
            qualification.pharmacyMapLocation,
          ),
          pharmacyLicenseNo: String(qualification.pharmacyLicenseNo || "").trim(),
          catalogFileName: String(qualification.catalogFileName || "").trim(),
          drugCatalog: normalizeDrugCatalog(qualification.drugCatalog),
        }
      : {};
  if (
    user.role === "PHARMACIST" &&
    (!pharmacyFields.pharmacyName ||
      !pharmacyFields.pharmacyAddress ||
      !pharmacyFields.pharmacyLicenseNo ||
      !pharmacyFields.pharmacyMapLocation ||
      !pharmacyFields.drugCatalog.length)
  ) {
    throw new AppError("请完整填写药房信息并上传药品目录", 400, "MISSING_PHARMACY_INFO");
  }

  const now = new Date().toISOString();
  const updatedFields = {
    institution,
    department,
    title: String(qualification.title || "").trim(),
    specialty: String(qualification.specialty || "").trim(),
    licenseNo,
    yearsExperience: Number(qualification.yearsExperience) || 0,
    documentName,
    documentType,
    ...pharmacyFields,
  };
  const nextState = {
    ...current,
    users: current.users.map((item) =>
      item.id === userId
        ? {
            ...item,
            status: 0,
            approvalStatus: "pending",
            reviewReason: null,
            reviewedAt: null,
            department: updatedFields.department || item.department,
            title: updatedFields.title || item.title,
            specialty: updatedFields.specialty || item.specialty,
            ...pharmacyFields,
            licenseNo,
            online: false,
          }
        : item,
    ),
    registrations: current.registrations.map((item) =>
      item.userId === userId
        ? {
            ...item,
            ...updatedFields,
            status: "pending",
            reviewReason: null,
            reviewedBy: null,
            reviewedAt: null,
            submittedAt: now,
          }
        : item,
    ),
    notifications: [
      {
        id: `note-${randomUUID()}`,
        role: "ADMIN",
        icon: "shield",
        title: "收到重新提交的资质申请",
        content: `${user.realName}重新提交了${user.role === "DOCTOR" ? "医生" : "药师"}资质。`,
        time: "刚刚",
        unread: true,
      },
      ...current.notifications,
    ],
  };
  const next = writeState(nextState, userId, "QUALIFICATION_RESUBMITTED", ip);
  db.prepare(`
    UPDATE credentials
    SET status = 0, approval_status = 'pending', review_reason = NULL,
        reviewed_by = NULL, reviewed_at = NULL, updated_at = ?
    WHERE user_id = ?
  `).run(now, userId);
  db.prepare(`
    UPDATE qualification_documents
    SET institution = ?, department = ?, title = ?, specialty = ?,
        license_no = ?, years_experience = ?, document_name = ?,
        document_type = ?, document_data = ?, status = 'pending',
        reviewed_by = NULL, review_reason = NULL, reviewed_at = NULL,
        submitted_at = ?
    WHERE user_id = ?
  `).run(
    institution,
    department,
    updatedFields.title,
    updatedFields.specialty,
    licenseNo,
    updatedFields.yearsExperience,
    documentName,
    documentType,
    documentData,
    now,
    userId,
  );
  db.prepare("DELETE FROM sessions WHERE user_id = ?").run(userId);
  return {
    user: next.users.find((item) => item.id === userId),
    registration: next.registrations.find((item) => item.userId === userId),
  };
}

export function createSession(user) {
  const token = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + sessionHours * 60 * 60 * 1000);
  db.prepare(
    "INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)",
  ).run(tokenHash, user.id, now.toISOString(), expiresAt.toISOString());
  db.prepare("DELETE FROM sessions WHERE expires_at <= ?").run(now.toISOString());
  return { token, expiresAt: expiresAt.toISOString() };
}

export function getSession(token) {
  if (!token) return null;
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const row = db.prepare(
    "SELECT user_id, expires_at FROM sessions WHERE token_hash = ? AND expires_at > ?",
  ).get(tokenHash, new Date().toISOString());
  if (!row) return null;
  const state = readState();
  const user = state.users.find((item) => item.id === row.user_id);
  if (
    !user ||
    (user.status !== 1 && user.approvalStatus !== "rejected")
  ) {
    return null;
  }
  return {
    user: safeUser(user),
    expiresAt: row.expires_at,
  };
}

export function destroySession(token) {
  if (!token) return;
  const tokenHash = createHash("sha256").update(token).digest("hex");
  db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(tokenHash);
}

export function resetDatabase(actorId = null, ip = null) {
  const pending = createSeedState();
  const now = new Date().toISOString();
  const credential = db.prepare("SELECT user_id, username FROM credentials").all();
  const state = sanitizeState(pending);
  db.exec("BEGIN IMMEDIATE");
  try {
    db.prepare(
      "UPDATE app_state SET payload = ?, revision = revision + 1, updated_at = ? WHERE id = 1",
    ).run(JSON.stringify(state), now);
    for (const user of pending.users) {
      const existing = credential.find((item) => item.user_id === user.id);
      if (existing) {
        db.prepare(
          `UPDATE credentials
           SET status = ?, approval_status = 'approved', review_reason = NULL,
               reviewed_by = NULL, reviewed_at = NULL, fail_count = 0,
               lock_until = NULL, updated_at = ?
           WHERE user_id = ?`,
        ).run(user.status ?? 1, now, user.id);
      } else {
        const salt = randomBytes(16).toString("hex");
        db.prepare(`
          INSERT INTO credentials (
            user_id, username, password_hash, password_salt, status,
            approval_status, reviewed_at, updated_at
          )
          VALUES (?, ?, ?, ?, ?, 'approved', ?, ?)
        `).run(
          user.id,
          user.username,
          hashPassword(user.password || "demo123", salt),
          salt,
          user.status ?? 1,
          now,
          now,
        );
      }
    }
    const seedUserIds = pending.users.map((user) => user.id);
    db.prepare(
      `DELETE FROM credentials WHERE user_id NOT IN (${seedUserIds.map(() => "?").join(",")})`,
    ).run(...seedUserIds);
    db.prepare("DELETE FROM qualification_documents").run();
    db.prepare("DELETE FROM phone_verifications").run();
    db.prepare("DELETE FROM sessions").run();
    db.prepare("DELETE FROM audit_logs").run();
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
  return readState();
}

export function listAuditLogs(limit = 100) {
  return db
    .prepare("SELECT id, user_id, action, detail, ip, created_at FROM audit_logs ORDER BY id DESC LIMIT ?")
    .all(Math.min(Math.max(Number(limit) || 100, 1), 500));
}

function mergeById(current, incoming, predicate = () => true) {
  const next = current.map((item) => ({ ...item }));
  const index = new Map(next.map((item, position) => [item.id, position]));
  for (const item of incoming || []) {
    if (!item?.id || !predicate(item)) continue;
    if (index.has(item.id)) next[index.get(item.id)] = { ...next[index.get(item.id)], ...item };
    else {
      next.push(item);
      index.set(item.id, next.length - 1);
    }
  }
  return next;
}

function sanitizeIncomingUserState(actor, current, incoming) {
  const actorIncoming = incoming.users?.find((user) => user.id === actor.id);
  if (!actorIncoming) return current;
  const normalizedAddress = String(actorIncoming.address || "").trim();
  if (actor.role === "PATIENT" && normalizedAddress.length < 5) {
    throw new AppError("请填写常用地址后再保存资料", 400, "MISSING_ADDRESS");
  }
  return current.map((user) =>
    user.id === actor.id
      ? {
          ...user,
          ...(actor.role === "PATIENT"
            ? {
                realName: actorIncoming.realName || user.realName,
                gender: actorIncoming.gender || user.gender,
                age: actorIncoming.age || user.age,
                bloodType: actorIncoming.bloodType || user.bloodType,
                allergy: actorIncoming.allergy || user.allergy,
                medicalHistory: actorIncoming.medicalHistory || user.medicalHistory,
                address: normalizedAddress,
                mapLocation:
                  normalizeMapLocation(actorIncoming.mapLocation) ||
                  user.mapLocation ||
                  null,
              }
            : {}),
          lastActive: new Date().toISOString(),
        }
      : user,
  );
}

function sanitizeMessages(messages, sender, senderName) {
  return (Array.isArray(messages) ? messages : [])
    .filter((message) => message?.content && String(message.content).trim())
    .map((message) => ({
      id: String(message.id || `msg-${randomUUID()}`),
      sender,
      senderName,
      content: String(message.content).trim().slice(0, 2000),
      time: message.time || new Date().toISOString(),
    }));
}

function mergeConsultationMessages(current, incoming, sender, senderName) {
  const merged = new Map(
    (Array.isArray(current) ? current : []).map((message) => [message.id, message]),
  );
  for (const message of sanitizeMessages(incoming, sender, senderName)) {
    if (!merged.has(message.id)) merged.set(message.id, message);
  }
  return [...merged.values()].slice(-500);
}

function mergePatientConsultations(current, incoming, actor) {
  const next = current.map((item) => ({ ...item }));
  const index = new Map(next.map((item, position) => [item.id, position]));
  for (const candidate of incoming || []) {
    if (!candidate?.id) continue;
    const previous = index.has(candidate.id) ? next[index.get(candidate.id)] : null;
    if (previous && previous.patientId !== actor.id) continue;
    if (!previous) {
      const doctor = readState().users.find(
        (user) =>
          user.id === candidate.doctorId &&
          user.role === "DOCTOR" &&
          user.status === 1 &&
          user.approvalStatus === "approved",
      );
      if (!doctor) continue;
      next.push({
        id: candidate.id,
        no: String(candidate.no || `CS${Date.now()}`),
        patientId: actor.id,
        patientName: actor.realName,
        doctorId: doctor.id,
        doctorName: doctor.realName,
        department: String(candidate.department || doctor.department || "全科医学科"),
        chiefComplaint: String(candidate.chiefComplaint || "身体不适").trim().slice(0, 2000),
        symptomDuration: String(candidate.symptomDuration || "").trim().slice(0, 100),
        status: "awaiting_payment",
        paymentStatus: "unpaid",
        consultationFee: Number(doctor.consultFee) || 29.9,
        patientAddress: String(actor.address || "").trim(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        unread: 1,
        messages: sanitizeMessages(candidate.messages, "patient", actor.realName).slice(0, 1),
      });
      index.set(candidate.id, next.length - 1);
      continue;
    }
    const position = index.get(candidate.id);
    if (previous.status === "awaiting_payment") {
      if (candidate.paymentStatus === "paid" && candidate.status === "waiting") {
        next[position] = {
          ...previous,
          status: "waiting",
          paymentStatus: "paid",
          paymentMethod: String(candidate.paymentMethod || "在线支付").slice(0, 30),
          paidAt: new Date().toISOString(),
          transactionNo: String(candidate.transactionNo || `PAY-${randomUUID()}`).slice(0, 100),
          updatedAt: new Date().toISOString(),
        };
      }
      continue;
    }
    if (previous.paymentStatus !== "paid" || previous.status === "ended") continue;
    next[position] = {
      ...previous,
      messages: mergeConsultationMessages(
        previous.messages,
        candidate.messages,
        "patient",
        actor.realName,
      ),
      status: candidate.status === "closed" ? "closed" : previous.status,
      patientAddress: String(actor.address || previous.patientAddress || "").trim(),
      updatedAt: new Date().toISOString(),
    };
  }
  return next;
}

function mergeDoctorConsultations(current, incoming, actor) {
  return current.map((consultation) => {
    const candidate = (incoming || []).find((item) => item.id === consultation.id);
    if (
      !candidate ||
      consultation.doctorId !== actor.id ||
      consultation.paymentStatus !== "paid" ||
      consultation.status === "ended"
    ) {
      return consultation;
    }
    const allowedStatuses = {
      waiting: ["waiting", "active", "ended"],
      active: ["active", "ended"],
    }[consultation.status] || [consultation.status];
    const status = allowedStatuses.includes(candidate.status)
      ? candidate.status
      : consultation.status;
    return {
      ...consultation,
      status,
      messages:
        status === "ended"
          ? consultation.messages
          : mergeConsultationMessages(
              consultation.messages,
              candidate.messages,
              "doctor",
              actor.realName,
            ),
      startedAt:
        status === "active" && !consultation.startedAt
          ? new Date().toISOString()
          : consultation.startedAt,
      updatedAt: new Date().toISOString(),
    };
  });
}

function deductDispensedInventory(pharmacies, drugs, prescription, now) {
  const pharmacyIndex = pharmacies.findIndex(
    (pharmacy) => pharmacy.id === prescription.pharmacyId,
  );
  if (pharmacyIndex < 0) {
    throw new AppError("目标药房不存在，无法完成核销", 409, "PHARMACY_NOT_FOUND");
  }
  const pharmacy = pharmacies[pharmacyIndex];
  if (pharmacy.status !== 1) {
    throw new AppError("所属药房已停用，暂时不能核销处方", 409, "PHARMACY_DISABLED");
  }
  const nextPharmacies = pharmacies.map((item) => ({ ...item }));
  const nextDrugs = drugs.map((drug) => ({
    ...drug,
    pharmacyOffers: Array.isArray(drug.pharmacyOffers)
      ? drug.pharmacyOffers.map((offer) => ({ ...offer }))
      : [],
  }));
  const nextCatalog = (pharmacy.catalog || []).map((item) => ({ ...item }));
  const deductions = [];

  for (const item of prescription.items || []) {
    const quantity = Number(item.quantity) || 0;
    const catalogIndex = nextCatalog.findIndex(
      (offer) => offer.drugId === item.drugId,
    );
    if (catalogIndex < 0) {
      throw new AppError(
        `药房目录中找不到药品“${item.name}”，无法完成核销`,
        409,
        "DISPENSE_DRUG_NOT_FOUND",
      );
    }
    const offer = nextCatalog[catalogIndex];
    const availableStock = Number(offer.stock) || 0;
    if (availableStock < quantity) {
      throw new AppError(
        `药品“${item.name}”库存不足，当前仅剩 ${availableStock}，处方需要 ${quantity}`,
        409,
        "DISPENSE_STOCK_INSUFFICIENT",
      );
    }
    offer.stock = availableStock - quantity;
    offer.enabled = offer.stock > 0;
    offer.updatedAt = now;
    deductions.push({
      drugId: item.drugId,
      name: item.name,
      quantity,
      remainingStock: offer.stock,
    });

    const drug = nextDrugs.find((entry) => entry.id === item.drugId);
    if (!drug) continue;
    const drugOffer = drug.pharmacyOffers.find(
      (entry) => entry.pharmacyId === pharmacy.id,
    );
    if (drugOffer) {
      drugOffer.stock = offer.stock;
      drugOffer.enabled = offer.stock > 0;
      drugOffer.updatedAt = now;
    }
    drug.stock = drug.pharmacyOffers.reduce(
      (total, entry) => total + Math.max(0, Number(entry.stock) || 0),
      0,
    );
    drug.enabled = drug.stock > 0;
    drug.lastStockUpdatedAt = now;
  }

  nextPharmacies[pharmacyIndex] = {
    ...pharmacy,
    catalog: nextCatalog,
    catalogUpdatedAt: now,
    inventoryUpdatedAt: now,
  };
  return {
    pharmacies: nextPharmacies,
    drugs: nextDrugs,
    deductions,
  };
}

export function mergeState(actor, incoming, ip = null) {
  if (!incoming || typeof incoming !== "object") {
    throw new AppError("请求数据格式不正确");
  }
  const current = readState();
  const next = {
    ...current,
    version: Math.max(Number(current.version) || 0, Number(incoming.version) || 0),
  };

  next.users = sanitizeIncomingUserState(actor, current.users, incoming);
  next.notifications = mergeById(
    current.notifications,
    incoming.notifications,
    (item) => item.role === actor.role,
  );

  if (actor.role === "ADMIN") {
    next.users = mergeById(current.users, incoming.users);
    if (incoming.hospital && typeof incoming.hospital === "object") {
      next.hospital = {
        ...(current.hospital || {}),
        ...incoming.hospital,
        mapLocation:
          normalizeMapLocation(incoming.hospital.mapLocation) ||
          current.hospital?.mapLocation ||
          null,
      };
    }
    next.drugs = mergeById(current.drugs, incoming.drugs);
    next.pharmacies = mergeById(current.pharmacies, incoming.pharmacies);
    next.consultations = mergeById(current.consultations, incoming.consultations);
    next.prescriptions = mergeById(current.prescriptions, incoming.prescriptions);
    next.triageSessions = mergeById(current.triageSessions, incoming.triageSessions);
    next.appointments = mergeById(current.appointments, incoming.appointments);
  } else if (actor.role === "PATIENT") {
    next.consultations = mergePatientConsultations(
      current.consultations,
      incoming.consultations,
      actor,
    );
    next.triageSessions = mergeById(
      current.triageSessions,
      incoming.triageSessions,
      (item) => item.patientId === actor.id,
    );
    next.appointments = mergeById(
      current.appointments,
      incoming.appointments,
      (item) => item.patientId === actor.id,
    );
    const currentRx = new Map(current.prescriptions.map((item) => [item.id, item]));
    for (const incomingRx of incoming.prescriptions || []) {
      const previous = currentRx.get(incomingRx.id);
      if (
        previous?.patientId === actor.id &&
        previous.status === RX_STATUS.PENDING_PHARMACY &&
        incomingRx.status === RX_STATUS.PENDING_REVIEW
      ) {
        const patient = current.users.find((item) => item.id === actor.id);
        const selectedPharmacy = current.pharmacies.find(
          (item) => item.id === incomingRx.pharmacyId && item.status === 1,
        );
        if (!selectedPharmacy) {
          throw new AppError(
            "所选药房不存在或已停用，请重新选择",
            409,
            "INVALID_PHARMACY",
          );
        }
        const recommendations = pharmacyRecommendations(
          current.pharmacies,
          previous.items || [],
          patient?.address || previous.patientAddress || "",
          current.drugs || [],
          patient?.mapLocation || null,
        );
        const quote = recommendations.find(
          (item) => item.pharmacy.id === selectedPharmacy.id,
        );
        if (!quote?.available) {
          throw new AppError(
            `所选药房无法配齐处方${quote?.missingDrugNames?.length ? `：缺少 ${quote.missingDrugNames.join("、")}` : ""}`,
            409,
            "PHARMACY_CANNOT_FULFILL",
          );
        }
        try {
          const selected = transitionPrescription(previous, "select_pharmacy", {
            pharmacyId: selectedPharmacy.id,
          });
          selected.pharmacyRecommendations = recommendations.map((item) => ({
            pharmacyId: item.pharmacy.id,
            pharmacyName: item.pharmacy.name,
            distanceKm: item.distanceKm,
            estimatedPrice: item.estimatedPrice,
            available: item.available,
            missingDrugNames: item.missingDrugNames,
            score: item.score,
          }));
          selected.selectedPharmacyQuote = {
            estimatedPrice: quote.estimatedPrice,
            distanceKm: quote.distanceKm,
            items: quote.quoteItems,
          };
          next.prescriptions = next.prescriptions.map((item) =>
            item.id === selected.id ? selected : item,
          );
          next.notifications = [
            {
              id: `note-${randomUUID()}`,
              role: "PHARMACIST",
              icon: "file",
              title: "患者已选择药房，处方待审核",
              content: `${selected.no} · ${selected.patientName} 已选择${selectedPharmacy.name}，请及时审核。`,
              time: "刚刚",
              unread: true,
              targetPage: "review",
              targetPharmacyId: selectedPharmacy.id,
            },
            ...next.notifications,
          ];
        } catch (error) {
          throw new AppError(error.message, 409, "INVALID_PHARMACY_SELECTION");
        }
        continue;
      }
      if (
        previous?.patientId === actor.id &&
        previous.status === RX_STATUS.PENDING_PAYMENT &&
        incomingRx.status === RX_STATUS.TRANSFERRED
      ) {
        try {
          const patient = current.users.find((item) => item.id === actor.id);
          const selectedPharmacy = current.pharmacies.find(
            (item) =>
              item.id === (incomingRx.pharmacyId || previous.pharmacyId) &&
              item.status === 1,
          );
          if (!selectedPharmacy) {
            throw new AppError(
              "所选药房不存在或已停用，请重新选择",
              409,
              "INVALID_PHARMACY",
            );
          }
          const quote = pharmacyRecommendations(
            current.pharmacies,
            previous.items || [],
            patient?.address || previous.patientAddress || "",
            current.drugs || [],
            patient?.mapLocation || null,
          ).find((item) => item.pharmacy.id === selectedPharmacy.id);
          if (!quote?.available) {
            throw new AppError(
              `所选药房无法配齐处方${quote?.missingDrugNames?.length ? `：缺少 ${quote.missingDrugNames.join("、")}` : ""}`,
              409,
              "PHARMACY_CANNOT_FULFILL",
            );
          }
          const paid = transitionPrescription(previous, "pay", {
            paymentMethod: incomingRx.paymentMethod,
            pickupCode: incomingRx.pickupCode,
            transactionNo: incomingRx.transactionNo,
          });
          paid.pharmacyId = selectedPharmacy.id;
          paid.pharmacyQuote = {
            estimatedPrice: quote.estimatedPrice,
            distanceKm: quote.distanceKm,
            items: quote.quoteItems,
          };
          paid.pharmacySelectedAt = new Date().toISOString();
          next.prescriptions = next.prescriptions.map((item) =>
            item.id === paid.id ? paid : item,
          );
          next.notifications = [
            {
              id: `note-${randomUUID()}`,
              role: "PHARMACIST",
              icon: "building",
              title: "患者已选择药房并完成支付",
              content: `${paid.no} · ${paid.patientName} 已选择${selectedPharmacy.name}，请准备取药核销。`,
              time: "刚刚",
              unread: true,
              targetPage: "prescriptions",
            },
            ...next.notifications,
          ];
        } catch (error) {
          throw new AppError(error.message, 409, "INVALID_RX_PAYMENT");
        }
      }
    }
  } else if (actor.role === "DOCTOR") {
    next.consultations = mergeDoctorConsultations(
      current.consultations,
      incoming.consultations,
      actor,
    );
    const currentRx = new Map(current.prescriptions.map((item) => [item.id, item]));
    const doctorRx = incoming.prescriptions?.filter((item) => item.doctorId === actor.id) || [];
    for (const incomingRx of doctorRx) {
      const previous = currentRx.get(incomingRx.id);
      if (previous && previous.status !== RX_STATUS.DRAFT) continue;
      if (![RX_STATUS.DRAFT, RX_STATUS.PENDING_PHARMACY].includes(incomingRx.status)) {
        throw new AppError("医生只能保存草稿或提交待审核处方", 409, "INVALID_RX_STATUS");
      }
      const consultation = current.consultations.find(
        (item) =>
          item.id === incomingRx.consultationId &&
          item.doctorId === actor.id &&
          item.paymentStatus === "paid",
      );
      if (!consultation) {
        throw new AppError("关联问诊未支付或不属于当前医生", 409, "INVALID_CONSULTATION");
      }
      const seenDrugIds = new Set();
      const items = (incomingRx.items || []).map((item) => {
        const drug = current.drugs.find(
          (entry) => entry.id === item.drugId && entry.enabled,
        );
        if (!drug) throw new AppError("处方包含停用或不存在于药品目录中的药品", 409, "INVALID_RX_DRUG");
        if (seenDrugIds.has(drug.id)) {
          throw new AppError("同一药品不能重复添加", 409, "DUPLICATE_RX_DRUG");
        }
        const quantity = Number(item.quantity);
        if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
          throw new AppError("药品数量必须为 1 到 99 的整数", 409, "INVALID_RX_QUANTITY");
        }
        seenDrugIds.add(drug.id);
        return {
          drugId: drug.id,
          name: drug.name,
          spec: drug.spec,
          quantity,
          dosage: String(item.dosage || "").trim(),
          frequency: String(item.frequency || "").trim(),
          price: Number(drug.price),
        };
      });
      const patient = current.users.find((item) => item.id === consultation.patientId);
      const recommendations = pharmacyRecommendations(
        current.pharmacies,
        items,
        patient?.address || consultation.patientAddress || "",
        current.drugs,
        patient?.mapLocation || null,
      );
      const recommended = recommendations.find((item) => item.available) || recommendations[0];
      let candidate = {
        ...(previous || {}),
        id: previous?.id || incomingRx.id,
        no:
          previous?.no ||
          `RX${new Date().toISOString().slice(0, 10).replaceAll("-", "")}${String(
            current.prescriptions.length + 1,
          ).padStart(4, "0")}`,
        consultationId: consultation.id,
        patientId: consultation.patientId,
        patientName: patient?.realName || consultation.patientName,
        doctorId: actor.id,
        doctorName: actor.realName,
        department: actor.department || consultation.department,
        diagnosis: String(incomingRx.diagnosis || "").trim(),
        reviewNote: String(incomingRx.reviewNote || "").trim(),
        status: RX_STATUS.DRAFT,
        createdAt: previous?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: Number(previous?.version || 0),
        items,
        allergySnapshot: patient?.allergy || "暂无已知过敏",
        recommendedPharmacyId: recommended?.pharmacy.id || null,
        recommendedPharmacyName: recommended?.pharmacy.name || null,
        pharmacyRecommendations: recommendations.map((item) => ({
          pharmacyId: item.pharmacy.id,
          pharmacyName: item.pharmacy.name,
          distanceKm: item.distanceKm,
          estimatedPrice: item.estimatedPrice,
          available: item.available,
          missingDrugNames: item.missingDrugNames,
          score: item.score,
        })),
      };
      if (incomingRx.status === RX_STATUS.PENDING_PHARMACY) {
        try {
          candidate = transitionPrescription(candidate, "submit");
        } catch (error) {
          throw new AppError(error.message, 409, "INVALID_RX_CONTENT");
        }
      }
      if (previous) {
        next.prescriptions = next.prescriptions.map((item) =>
          item.id === candidate.id ? candidate : item,
        );
      } else {
        next.prescriptions.push(candidate);
      }
    }
  } else if (actor.role === "PHARMACIST") {
    const actorUser = current.users.find((item) => item.id === actor.id);
    const assignedPharmacy = current.pharmacies.find(
      (item) => item.id === actorUser?.pharmacyId,
    );
    const incomingOwnPharmacy = incoming.pharmacies?.find(
      (item) => item.id === actorUser?.pharmacyId,
    );
    if (incomingOwnPharmacy && Array.isArray(incomingOwnPharmacy.catalog)) {
      const now = new Date().toISOString();
      const stockUpdates = new Map();
      for (const incomingItem of incomingOwnPharmacy.catalog) {
        const stock = Number(incomingItem.stock);
        if (!Number.isInteger(stock) || stock < 0) {
          throw new AppError(
            "库存必须为非负整数",
            400,
            "INVALID_INVENTORY",
          );
        }
        stockUpdates.set(incomingItem.drugId, stock);
      }
      const nextCatalog = (assignedPharmacy?.catalog || []).map((item) => {
        if (!stockUpdates.has(item.drugId)) return item;
        const stock = stockUpdates.get(item.drugId);
        return {
          ...item,
          stock,
          enabled: stock > 0,
          updatedAt: now,
        };
      });
      next.pharmacies = current.pharmacies.map((pharmacy) =>
        pharmacy.id === actorUser.pharmacyId
          ? {
              ...pharmacy,
              catalog: nextCatalog,
              catalogUpdatedAt: now,
              inventoryUpdatedAt: now,
            }
          : pharmacy,
      );
      next.drugs = current.drugs.map((drug) => {
        if (!stockUpdates.has(drug.id)) return drug;
        const offers = (drug.pharmacyOffers || []).map((offer) =>
          offer.pharmacyId === actorUser.pharmacyId
            ? {
                ...offer,
                stock: stockUpdates.get(drug.id),
                enabled: stockUpdates.get(drug.id) > 0,
                updatedAt: now,
              }
            : offer,
        );
        const stock = offers.reduce(
          (total, offer) => total + Math.max(0, Number(offer.stock) || 0),
          0,
        );
        return {
          ...drug,
          pharmacyOffers: offers,
          stock,
          enabled: stock > 0,
          lastStockUpdatedAt: now,
        };
      });
      next.notifications = [
        {
          id: `note-${randomUUID()}`,
          role: "ADMIN",
          icon: "pill",
          title: "药师已更新药房库存",
          content: `${assignedPharmacy?.name || "合作药房"}已更新药品数量，请在合作药房页面查看。`,
          time: "刚刚",
          unread: true,
          targetPage: "pharmacies",
        },
        ...next.notifications,
      ];
    }
    const currentRx = new Map(current.prescriptions.map((item) => [item.id, item]));
    for (const incomingRx of incoming.prescriptions || []) {
      const previous = currentRx.get(incomingRx.id);
      if (!previous || previous.status === incomingRx.status) continue;
      let finalRx = previous;
      try {
        if (previous.status === RX_STATUS.PENDING_REVIEW && incomingRx.status === RX_STATUS.PENDING_PAYMENT) {
          if (!assignedPharmacy || assignedPharmacy.status !== 1) {
            throw new AppError(
              "所属药房不存在或已停用，暂时不能审核处方",
              409,
              "ASSIGNED_PHARMACY_DISABLED",
            );
          }
          const pharmacy = current.pharmacies.find(
            (item) => item.id === incomingRx.pharmacyId && item.status === 1,
          );
          if (!pharmacy) {
            throw new AppError("目标药房不存在或已停用", 409, "INVALID_PHARMACY");
          }
          const patient = current.users.find((item) => item.id === previous.patientId);
          const quote = pharmacyRecommendations(
            current.pharmacies,
            previous.items || [],
            patient?.address || "",
            current.drugs || [],
            patient?.mapLocation || null,
          ).find((item) => item.pharmacy.id === pharmacy.id);
          if (!quote?.available) {
            throw new AppError(
              `该药房无法配齐处方${quote?.missingDrugNames?.length ? `：缺少 ${quote.missingDrugNames.join("、")}` : ""}`,
              409,
              "PHARMACY_CANNOT_FULFILL",
            );
          }
          if (pharmacy.id !== assignedPharmacy.id) {
            throw new AppError(
              "只能将处方审核流转至本人所属药房",
              409,
              "PHARMACY_ASSIGNMENT_MISMATCH",
            );
          }
          finalRx = transitionPrescription(previous, "approve", {
            pharmacyId: incomingRx.pharmacyId,
            pharmacistId: actor.id,
          });
          finalRx.reviewComment = incomingRx.reviewComment || "";
          finalRx.pharmacyQuote = {
            estimatedPrice: quote.estimatedPrice,
            distanceKm: quote.distanceKm,
            items: quote.quoteItems,
          };
        } else if (previous.status === RX_STATUS.PENDING_REVIEW && incomingRx.status === RX_STATUS.VOID) {
          finalRx = transitionPrescription(previous, "reject", {
            reason: incomingRx.rejectReason,
            pharmacistId: actor.id,
          });
        } else if (previous.status === RX_STATUS.TRANSFERRED && incomingRx.status === RX_STATUS.DISPENSED) {
          if (!assignedPharmacy || assignedPharmacy.id !== previous.pharmacyId) {
            throw new AppError(
              "该处方不属于当前药师所属药房，不能核销",
              409,
              "PHARMACY_ASSIGNMENT_MISMATCH",
            );
          }
          const now = new Date().toISOString();
          const inventory = deductDispensedInventory(
            next.pharmacies || current.pharmacies,
            next.drugs || current.drugs,
            previous,
            now,
          );
          next.pharmacies = inventory.pharmacies;
          next.drugs = inventory.drugs;
          finalRx = transitionPrescription(previous, "dispense", {
            pickupCode: incomingRx.pickupCode,
          });
          finalRx.inventoryDeductedAt = now;
          finalRx.inventoryDeductions = inventory.deductions;
          const pharmacy = next.pharmacies.find(
            (item) => item.id === previous.pharmacyId,
          );
          next.notifications = [
            {
              id: `note-${randomUUID()}`,
              role: "ADMIN",
              icon: "pill",
              title: "患者已完成取药，请核对药品库存",
              content: `${previous.no} 已在${pharmacy?.name || "合作药房"}完成取药，请及时补录或调整库存。`,
              time: "刚刚",
              unread: true,
              targetPage: "pharmacies",
            },
            {
              id: `note-${randomUUID()}`,
              role: "DOCTOR",
              icon: "checkCircle",
              title: "患者已完成取药",
              content: `${previous.no} · ${previous.patientName} 已完成取药核销。`,
              time: "刚刚",
              unread: true,
              targetPage: "prescriptions",
            },
            {
              id: `note-${randomUUID()}`,
              role: "PATIENT",
              icon: "checkCircle",
              title: "处方已完成取药核销",
              content: `${previous.no} · ${pharmacy?.name || "合作药房"}`,
              time: "刚刚",
              unread: true,
              targetPage: "prescriptions",
            },
            ...next.notifications,
          ];
        }
      } catch (error) {
        throw new AppError(error.message, 409, "INVALID_RX_TRANSITION");
      }
      next.prescriptions = next.prescriptions.map((item) => (item.id === finalRx.id ? finalRx : item));
    }
  }

  return writeState(
    next,
    actor.id,
    `STATE_SYNC_${actor.role}`,
    ip,
  );
}
