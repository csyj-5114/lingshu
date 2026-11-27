import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";
import {
  AppError,
  authenticate,
  createPhoneVerification,
  createSession,
  destroySession,
  getQualificationDocument,
  getSession,
  listAuditLogs,
  mergeState,
  readState,
  registerAccount,
  resubmitQualification,
  resetDatabase,
  resetPasswordByPhone,
  reviewRegistration,
  verifyPhoneCode,
} from "./database.mjs";
import { sendSmsVerification } from "./sms.mjs";

const root = resolve(process.cwd());
const frontendRoot = join(root, "frontend");
const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || "127.0.0.1";
const cookieName = "lingshu_session";
const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

function securityHeaders(extra = {}) {
  return {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "SAMEORIGIN",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
      "Content-Security-Policy":
      "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; img-src 'self' data:; frame-src 'self' data:; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'self'",
    ...extra,
  };
}

function sendJson(response, status, data, extraHeaders = {}) {
  response.writeHead(
    status,
    securityHeaders({
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...extraHeaders,
    }),
  );
  response.end(JSON.stringify(data));
}

function sendError(response, error) {
  const status = error instanceof AppError ? error.status : 500;
  const code = error instanceof AppError ? error.code : "INTERNAL_ERROR";
  if (!(error instanceof AppError)) console.error(error);
  sendJson(response, status, {
    ok: false,
    error: {
      code,
      message: status === 500 ? "服务器内部错误，请稍后重试" : error.message,
    },
  });
}

async function readJson(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 4 * 1024 * 1024) throw new AppError("请求数据过大", 413, "PAYLOAD_TOO_LARGE");
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new AppError("JSON 请求格式不正确", 400, "INVALID_JSON");
  }
}

function parseCookies(request) {
  return Object.fromEntries(
    String(request.headers.cookie || "")
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const index = part.indexOf("=");
        return index >= 0
          ? [decodeURIComponent(part.slice(0, index)), decodeURIComponent(part.slice(index + 1))]
          : [part, ""];
      }),
  );
}

function sessionCookie(token, maxAge = 12 * 60 * 60) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${cookieName}=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}${secure}`;
}

function clearSessionCookie() {
  return `${cookieName}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`;
}

function requireUser(request) {
  const token = parseCookies(request)[cookieName];
  const session = getSession(token);
  if (!session) throw new AppError("登录状态已失效，请重新登录", 401, "UNAUTHENTICATED");
  return { user: session.user, token, expiresAt: session.expiresAt };
}

function requireRole(user, roles) {
  if (!roles.includes(user.role)) {
    throw new AppError("当前角色无权执行此操作", 403, "FORBIDDEN");
  }
}

function filterStateForUser(state, user) {
  if (user.role === "ADMIN") return state;
  if (user.role === "PATIENT") {
    return {
      ...state,
      consultations: state.consultations.filter((item) => item.patientId === user.id),
      prescriptions: state.prescriptions.filter((item) => item.patientId === user.id),
      triageSessions: state.triageSessions.filter((item) => item.patientId === user.id),
      appointments: state.appointments.filter((item) => item.patientId === user.id),
      notifications: state.notifications.filter((item) => item.role === user.role),
      users: state.users.map((item) => {
        if (item.id === user.id) return item;
        return {
          id: item.id,
          realName: item.realName,
          role: item.role,
          doctorNo: item.doctorNo,
          title: item.title,
          department: item.department,
          specialty: item.specialty,
          rating: item.rating,
          consultCount: item.consultCount,
          online: item.online,
          status: item.status,
          approvalStatus: item.approvalStatus,
          mapLocation: item.mapLocation || null,
        };
      }),
    };
  }
  if (user.role === "DOCTOR") {
    return {
      ...state,
      consultations: state.consultations.filter(
        (item) => item.doctorId === user.id && item.paymentStatus === "paid",
      ),
      prescriptions: state.prescriptions.filter((item) => item.doctorId === user.id),
      notifications: state.notifications.filter((item) => item.role === user.role),
      appointments: state.appointments.filter((item) => item.doctorId === user.id),
      users: state.users.map((item) => {
        if (["PATIENT", "DOCTOR"].includes(item.role) || item.id === user.id) return item;
        return {
          id: item.id,
          realName: item.realName,
          role: item.role,
          title: item.title,
          status: item.status,
        };
      }),
    };
  }
  if (user.role === "PHARMACIST") {
    return {
      ...state,
      prescriptions: state.prescriptions.filter(
        (item) => item.pharmacyId === user.pharmacyId,
      ),
      notifications: state.notifications.filter(
        (item) =>
          item.role === "PHARMACIST" &&
          (!item.targetPharmacyId || item.targetPharmacyId === user.pharmacyId),
      ),
    };
  }
  return {
    ...state,
    notifications: state.notifications.filter((item) => item.role === user.role),
  };
}

async function handleApi(request, response, url) {
  const pathname = url.pathname;
  const method = request.method || "GET";

  if (pathname === "/api/health" && method === "GET") {
    sendJson(response, 200, {
      ok: true,
      service: "lingshu-medical-platform",
      database: "sqlite",
      status: "ok",
      timestamp: new Date().toISOString(),
    });
    return true;
  }

  if (pathname === "/api/auth/login" && method === "POST") {
    const body = await readJson(request);
    const identifier = body.identifier || body.username;
    if (!identifier || !body.password) {
      throw new AppError("请输入账号或手机号和密码", 400, "MISSING_CREDENTIALS");
    }
    const user = authenticate(identifier, body.password);
    const session = createSession(user);
    sendJson(
      response,
      200,
      { ok: true, user, expiresAt: session.expiresAt },
      { "Set-Cookie": sessionCookie(session.token) },
    );
    return true;
  }

  if (pathname === "/api/auth/register" && method === "POST") {
    const body = await readJson(request);
    const result = registerAccount(body, request.socket.remoteAddress || null);
    sendJson(response, 201, {
      ok: true,
      user: result.user,
      registration: result.registration,
      requiresApproval: result.user.approvalStatus === "pending",
    });
    return true;
  }

  if (pathname === "/api/auth/phone/send-code" && method === "POST") {
    const body = await readJson(request);
    const challenge = createPhoneVerification(body.phone, body.purpose);
    try {
      await sendSmsVerification(challenge);
    } catch (error) {
      throw new AppError(error.message || "短信发送失败", 502, "SMS_PROVIDER_ERROR");
    }
    sendJson(response, 200, {
      ok: true,
      verificationId: challenge.verificationId,
      expiresAt: challenge.expiresAt,
      expiresIn: 300,
      ...(process.env.NODE_ENV === "production" ? {} : { devCode: challenge.code }),
    });
    return true;
  }

  if (pathname === "/api/auth/phone/verify" && method === "POST") {
    const body = await readJson(request);
    const result = verifyPhoneCode(body.phone, body.purpose, body.code, false);
    sendJson(response, 200, { ok: true, ...result });
    return true;
  }

  if (pathname === "/api/auth/password/reset" && method === "POST") {
    const body = await readJson(request);
    if (!body.newPassword || body.newPassword !== body.confirmPassword) {
      throw new AppError("两次输入的新密码不一致", 400, "PASSWORD_MISMATCH");
    }
    const result = resetPasswordByPhone(
      body.phone,
      body.code,
      body.newPassword,
      request.socket.remoteAddress || null,
    );
    sendJson(response, 200, { ok: true, account: result });
    return true;
  }

  if (pathname === "/api/auth/session" && method === "GET") {
    try {
      const { user, expiresAt } = requireUser(request);
      sendJson(response, 200, { ok: true, user, expiresAt });
    } catch (error) {
      if (error.status === 401) sendJson(response, 401, { ok: false, authenticated: false });
      else throw error;
    }
    return true;
  }

  if (pathname === "/api/auth/logout" && method === "POST") {
    const token = parseCookies(request)[cookieName];
    destroySession(token);
    sendJson(response, 200, { ok: true }, { "Set-Cookie": clearSessionCookie() });
    return true;
  }

  const { user } = requireUser(request);

  if (pathname === "/api/auth/resubmit-qualification" && method === "POST") {
    requireRole(user, ["DOCTOR", "PHARMACIST"]);
    const body = await readJson(request);
    const result = resubmitQualification(
      user.id,
      body,
      request.socket.remoteAddress || null,
    );
    sendJson(
      response,
      200,
      { ok: true, user: result.user, registration: result.registration },
      { "Set-Cookie": clearSessionCookie() },
    );
    return true;
  }

  if (pathname === "/api/state" && method === "GET") {
    const state = filterStateForUser(readState(), user);
    sendJson(response, 200, { ok: true, state });
    return true;
  }

  if (pathname === "/api/state" && method === "PUT") {
    const body = await readJson(request);
    const state = mergeState(
      user,
      body.state,
      request.socket.remoteAddress || null,
    );
    sendJson(response, 200, {
      ok: true,
      state: filterStateForUser(state, user),
      savedAt: new Date().toISOString(),
    });
    return true;
  }

  if (pathname === "/api/users" && method === "GET") {
    const state = readState();
    sendJson(response, 200, {
      ok: true,
      data: filterStateForUser(state, user).users,
    });
    return true;
  }

  if (pathname === "/api/consultations" && method === "GET") {
    const state = filterStateForUser(readState(), user);
    sendJson(response, 200, { ok: true, data: state.consultations });
    return true;
  }

  if (pathname === "/api/prescriptions" && method === "GET") {
    const state = filterStateForUser(readState(), user);
    sendJson(response, 200, { ok: true, data: state.prescriptions });
    return true;
  }

  if (pathname === "/api/drugs" && method === "GET") {
    sendJson(response, 200, { ok: true, data: readState().drugs });
    return true;
  }

  if (pathname === "/api/pharmacies" && method === "GET") {
    sendJson(response, 200, { ok: true, data: readState().pharmacies });
    return true;
  }

  if (pathname === "/api/audit" && method === "GET") {
    requireRole(user, ["ADMIN"]);
    sendJson(response, 200, {
      ok: true,
      data: listAuditLogs(url.searchParams.get("limit")),
    });
    return true;
  }

  const qualificationMatch = pathname.match(/^\/api\/qualifications\/([^/]+)$/);
  if (qualificationMatch && method === "GET") {
    sendJson(response, 200, {
      ok: true,
      data: getQualificationDocument(decodeURIComponent(qualificationMatch[1]), user),
    });
    return true;
  }

  const reviewMatch = pathname.match(/^\/api\/admin\/registrations\/([^/]+)\/review$/);
  if (reviewMatch && method === "POST") {
    requireRole(user, ["ADMIN"]);
    const body = await readJson(request);
    const result = reviewRegistration(
      user.id,
      decodeURIComponent(reviewMatch[1]),
      body.decision,
      body.reason,
      request.socket.remoteAddress || null,
    );
    sendJson(response, 200, {
      ok: true,
      user: result.user,
      state: result.state,
    });
    return true;
  }

  if (pathname === "/api/reset" && method === "POST") {
    requireRole(user, ["ADMIN"]);
    const state = resetDatabase(user.id, request.socket.remoteAddress || null);
    sendJson(
      response,
      200,
      { ok: true, state: filterStateForUser(state, user) },
      { "Set-Cookie": clearSessionCookie() },
    );
    return true;
  }

  return false;
}

async function serveStatic(request, response, url) {
  if (!["GET", "HEAD"].includes(request.method || "GET")) {
    response.writeHead(405, securityHeaders({ Allow: "GET, HEAD" }));
    response.end("Method Not Allowed");
    return;
  }
  const pathname = decodeURIComponent(url.pathname);
  const relative = normalize(pathname === "/" ? "index.html" : pathname).replace(/^([/\\])+/, "");
  let filePath = join(frontendRoot, relative || "index.html");
  if (!filePath.startsWith(frontendRoot)) {
    response.writeHead(403, securityHeaders());
    response.end("Forbidden");
    return;
  }
  const fileStat = await stat(filePath).catch(() => null);
  if (!fileStat || fileStat.isDirectory()) filePath = join(frontendRoot, "index.html");
  const content = await readFile(filePath);
  response.writeHead(
    200,
    securityHeaders({
      "Content-Type": mimeTypes[extname(filePath).toLowerCase()] || "application/octet-stream",
      "Cache-Control": [".html", ".js", ".css"].includes(extname(filePath))
        ? "no-cache"
        : "public, max-age=300",
    }),
  );
  response.end(request.method === "HEAD" ? undefined : content);
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url || "/", `http://${request.headers.host || host}`);
    if (url.pathname.startsWith("/api/")) {
      const handled = await handleApi(request, response, url);
      if (!handled) {
        throw new AppError("接口不存在", 404, "API_NOT_FOUND");
      }
      return;
    }
    await serveStatic(request, response, url);
  } catch (error) {
    if (!response.headersSent) sendError(response, error);
    else response.end();
  }
});

server.listen(port, host, () => {
  console.log(`灵枢全栈服务已启动：http://${host}:${port}`);
  console.log(`前端目录：${frontendRoot}`);
  console.log(`API 健康检查：http://${host}:${port}/api/health`);
});
