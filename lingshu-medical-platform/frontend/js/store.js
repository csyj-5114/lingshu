const API_BASE = "/api";
let persistQueue = Promise.resolve();

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });
  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }
  if (!response.ok) {
    const error = new Error(payload?.error?.message || `请求失败（${response.status}）`);
    error.status = response.status;
    error.code = payload?.error?.code;
    throw error;
  }
  return payload;
}

export async function loadSession() {
  try {
    const payload = await request("/auth/session");
    return payload?.user
      ? {
          userId: payload.user.id,
          role: payload.user.role,
          loginAt: new Date().toISOString(),
          expiresAt: payload.expiresAt,
        }
      : null;
  } catch (error) {
    if (error.status === 401) return null;
    throw error;
  }
}

export async function login(identifier, password) {
  return request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ identifier, password }),
  });
}

export async function logout() {
  try {
    await request("/auth/logout", { method: "POST", body: "{}" });
  } catch {
    // The browser session is cleared even if the server session already expired.
  }
}

export async function loadState() {
  const payload = await request("/state");
  return payload.state;
}

export function saveState(state) {
  const snapshot = JSON.stringify(state);
  persistQueue = persistQueue
    .catch(() => undefined)
    .then(() =>
      request("/state", {
        method: "PUT",
        body: JSON.stringify({ state: JSON.parse(snapshot) }),
      }),
    );
  return persistQueue;
}

export async function resetState() {
  const payload = await request("/reset", {
    method: "POST",
    body: "{}",
  });
  return payload.state;
}

export async function registerAccount(payload) {
  return request("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function resubmitQualification(payload) {
  return request("/auth/resubmit-qualification", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function sendPhoneVerificationCode(phone, purpose) {
  return request("/auth/phone/send-code", {
    method: "POST",
    body: JSON.stringify({ phone, purpose }),
  });
}

export async function verifyPhoneVerificationCode(phone, purpose, code) {
  return request("/auth/phone/verify", {
    method: "POST",
    body: JSON.stringify({ phone, purpose, code }),
  });
}

export async function resetPasswordWithSms(payload) {
  return request("/auth/password/reset", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function reviewRegistration(userId, decision, reason = "") {
  return request(`/admin/registrations/${encodeURIComponent(userId)}/review`, {
    method: "POST",
    body: JSON.stringify({ decision, reason }),
  });
}

export async function getQualificationDocument(userId) {
  return request(`/qualifications/${encodeURIComponent(userId)}`, {
    method: "GET",
  });
}

export async function getAuditLogs(limit = 100) {
  const payload = await request(`/audit?limit=${encodeURIComponent(limit)}`, {
    method: "GET",
  });
  return payload.data || [];
}
