import {
  RX_STATUS,
  RX_STATUS_META,
  formatCurrency,
  mapDistanceKm,
  pharmacyRecommendations,
  prescriptionTotal,
  quotePrescriptionAtPharmacy,
  rankTriageDoctors,
  summarizeConsultation,
  transitionPrescription,
  triageSymptoms,
  validateResidentIdCard,
  validatePrescriptionDraft,
} from "./js/domain.js";
import {
  loadSession,
  loadState,
  getAuditLogs,
  getQualificationDocument,
  login as apiLogin,
  logout as apiLogout,
  registerAccount,
  resubmitQualification,
  resetPasswordWithSms,
  reviewRegistration,
  sendPhoneVerificationCode,
  verifyPhoneVerificationCode,
  resetState,
  saveState,
} from "./js/store.js";

const iconPaths = {
  home: '<path d="m3 10 9-7 9 7v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/><path d="M9 21v-7h6v7"/>',
  sparkles:
    '<path d="m12 3-1.3 3.7L7 8l3.7 1.3L12 13l1.3-3.7L17 8l-3.7-1.3Z"/><path d="m5 14-.7 2.3L2 17l2.3.7L5 20l.7-2.3L8 17l-2.3-.7Z"/><path d="m19 13-.8 2.2L16 16l2.2.8L19 19l.8-2.2L22 16l-2.2-.8Z"/>',
  message:
    '<path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z"/><path d="M8 9h8M8 13h5"/>',
  pill: '<path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/><path d="m8.5 8.5 7 7"/>',
  user: '<path d="M20 21a8 8 0 0 0-16 0"/><circle cx="12" cy="7" r="4"/>',
  users:
    '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  calendar:
    '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  activity: '<path d="M3 12h4l3-9 4 18 3-9h4"/>',
  shield:
    '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/>',
  package:
    '<path d="m21 8-9-5-9 5 9 5Z"/><path d="m3 8 9 5v10l9-5V8"/><path d="M12 13v10"/>',
  building:
    '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M9 21v-4h6v4M8 7h.01M16 7h.01M8 11h.01M16 11h.01M8 15h.01M16 15h.01"/>',
  settings:
    '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56V21h-4v-.08A1.7 1.7 0 0 0 9 19.37a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.63 15a1.7 1.7 0 0 0-1.56-1.03H3v-4h.08A1.7 1.7 0 0 0 4.63 9a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.63a1.7 1.7 0 0 0 1.03-1.56V3h4v.08A1.7 1.7 0 0 0 15 4.63a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.37 9a1.7 1.7 0 0 0 1.56 1.03H21v4h-.08A1.7 1.7 0 0 0 19.4 15Z"/>',
  logout: '<path d="M10 17l5-5-5-5M15 12H3"/><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>',
  bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  x: '<path d="m6 6 12 12M18 6 6 18"/>',
  arrow: '<path d="m9 18 6-6-6-6"/>',
  send: '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
  paperclip: '<path d="m21.4 11.6-8.9 8.9a6 6 0 0 1-8.5-8.5l9.6-9.6a4 4 0 0 1 5.7 5.7l-9.6 9.6a2 2 0 0 1-2.8-2.8l8.9-8.9"/>',
  image:
    '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  checkCircle: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
  alert: '<path d="M10.3 3.7 2.2 18a2 2 0 0 0 1.7 3h16.2a2 2 0 0 0 1.7-3L13.7 3.7a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M8 13h8M8 17h5"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  eyeOff: '<path d="m3 3 18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 4.2A10.8 10.8 0 0 1 12 4c6.5 0 10 8 10 8a17.2 17.2 0 0 1-2.1 3.2M6.6 6.6C3.6 8.5 2 12 2 12s3.5 8 10 8a10 10 0 0 0 4.1-.9"/>',
  trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 15H6L5 6M10 11v5M14 11v5"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  map: '<path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
  phone:
    '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.4 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z"/>',
  rotate:
    '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
  lock: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 1 1 8 0v3"/>',
  at: '<circle cx="12" cy="12" r="4"/><path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-4 8"/>',
  heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z"/>',
  stethoscope:
    '<path d="M4 8v4a4 4 0 0 0 8 0V8M8 4v4M2 4h4M10 4h4"/><path d="M16 10v2a6 6 0 0 1-6 6H8"/><circle cx="19" cy="18" r="3"/><path d="M19 15V9"/>',
  download: '<path d="M12 3v12m0 0 4-4m-4 4-4-4"/><path d="M5 21h14"/>',
  wifi: '<path d="M5 12.6a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0M12 20h.01"/>',
  more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
  arrowUp: '<path d="m6 15 6-6 6 6"/>',
  bag: '<path d="M6 7h12l1 14H5L6 7Z"/><path d="M9 7a3 3 0 0 1 6 0"/>',
};

const registrationMapPlaces = [
  {
    type: "hospital",
    name: "灵枢综合医院",
    location: { x: 5, y: 4 },
  },
  {
    type: "pharmacy",
    name: "安心药房 · 静安店",
    location: { x: 2.2, y: 2.2 },
  },
  {
    type: "pharmacy",
    name: "惠民药房 · 徐汇店",
    location: { x: 7, y: 5 },
  },
];

function icon(name, className = "") {
  const paths = iconPaths[name] || iconPaths.heart;
  return `<svg class="icon ${className}" viewBox="0 0 24 24" aria-hidden="true">${paths}</svg>`;
}

function brandMark() {
  return `
    <div class="brand-mark" aria-hidden="true">
      <svg viewBox="0 0 32 32" fill="none">
        <path d="M9 23V10.5C9 8 11 6 13.5 6H23v12.5c0 2.5-2 4.5-4.5 4.5H9Z" stroke="currentColor" stroke-width="1.8"/>
        <path d="M23 23V12.5C23 10 21 8 18.5 8H9v12.5C9 23 11 25 13.5 25H23Z" stroke="currentColor" stroke-width="1.3" opacity=".72"/>
        <path d="M12 16h2.4l1.2-2.6 2.1 5.2 1.4-2.6H22" stroke="#F5C76A" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </div>`;
}

function esc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

const roleConfig = {
  PATIENT: {
    label: "患者",
    home: "overview",
    greeting: "患者端",
    pages: {
      overview: ["健康首页", "查看今天的健康安排"],
      triage: ["AI 导诊", "描述症状，找到合适的医生"],
      consultations: ["在线问诊", "与医生保持连续沟通"],
      prescriptions: ["我的处方", "查看处方审核与取药进度"],
      profile: ["健康档案", "管理个人健康信息"],
    },
  },
  DOCTOR: {
    label: "医生",
    home: "overview",
    greeting: "医生工作台",
    pages: {
      overview: ["诊疗工作台", "今天的工作已为你整理好"],
      consultations: ["患者问诊", "查看会话并持续跟进病情"],
      prescriptions: ["处方管理", "开具、提交并追踪电子处方"],
      profile: ["个人资料", "管理执业信息与工作设置"],
    },
  },
  PHARMACIST: {
    label: "药师",
    home: "overview",
    greeting: "药师审方中心",
    pages: {
      overview: ["审方概览", "把好处方流转的每一道关"],
      review: ["待审处方", "核对诊断、用药与过敏风险"],
      prescriptions: ["处方流转", "追踪审核后的处方状态"],
      profile: ["药师资料", "管理审方工作设置"],
    },
  },
  ADMIN: {
    label: "管理员",
    home: "overview",
    greeting: "平台管理中心",
    pages: {
      overview: ["运营总览", "掌握平台服务与业务趋势"],
      "consultations-admin": ["问诊管理", "查看平台全部问诊与接诊状态"],
      registrations: ["账号审核", "审核医生与药师的执业资质"],
      users: ["用户管理", "维护平台账号与角色状态"],
      drugs: ["药品目录", "管理药品信息与启用状态"],
      pharmacies: ["合作药房", "查看药房资质与对接状态"],
      prescriptions: ["处方管理", "查看全部处方及流转状态"],
      audit: ["操作记录", "查看平台关键操作审计日志"],
      profile: ["系统设置", "管理平台偏好与数据维护"],
    },
  },
};

const navSections = {
  PATIENT: [
    {
      label: "医疗服务",
      items: [
        ["overview", "home", "健康首页"],
        ["triage", "sparkles", "AI 导诊"],
        ["consultations", "message", "在线问诊"],
        ["prescriptions", "pill", "我的处方"],
      ],
    },
    { label: "个人", items: [["profile", "user", "健康档案"]] },
  ],
  DOCTOR: [
    {
      label: "诊疗工作",
      items: [
        ["overview", "home", "诊疗工作台"],
        ["consultations", "message", "患者问诊"],
        ["prescriptions", "file", "处方管理"],
      ],
    },
    { label: "个人", items: [["profile", "user", "个人资料"]] },
  ],
  PHARMACIST: [
    {
      label: "药学服务",
      items: [
        ["overview", "home", "审方概览"],
        ["review", "shield", "待审处方"],
        ["prescriptions", "package", "处方流转"],
      ],
    },
    { label: "个人", items: [["profile", "user", "药师资料"]] },
  ],
  ADMIN: [
    {
      label: "平台运营",
      items: [
        ["overview", "home", "运营总览"],
        ["consultations-admin", "message", "问诊管理"],
        ["registrations", "shield", "账号审核"],
        ["users", "users", "用户管理"],
        ["drugs", "pill", "药品目录"],
        ["pharmacies", "building", "合作药房"],
        ["prescriptions", "file", "处方管理"],
        ["audit", "activity", "操作记录"],
      ],
    },
    { label: "系统", items: [["profile", "settings", "系统设置"]] },
  ],
};

let state = null;
let session = null;
let activePage = null;
let selectedConsultation = null;
let triageResult = null;
let selectedRxId = null;
let notificationsOpen = false;
let sidebarOpen = false;
let editorState = null;
let searchQuery = "";
let loginAttempts = 0;
let rxFilter = "all";
let listQuery = "";
let registrationDraft = null;
let selectedRegistrationId = null;
let lastLoginError = "";
let lastLoginCode = "";
let passwordResetDraft = null;
let smsResendTimer = null;
let userRoleFilter = "ALL";
let loginMode = "account";
let qualificationResubmitMode = false;
let qualificationResubmitDraft = null;
let stateSyncTimer = null;
let stateSyncInFlight = false;
let patientPharmacySelection = null;
let selectedTriageDoctorId = null;

const app = document.getElementById("app");
const modalRoot = document.getElementById("modal-root");
const toastRoot = document.getElementById("toast-root");

function currentUser() {
  return state?.users?.find((user) => user.id === session?.userId) || null;
}

function persist() {
  return saveState(state).catch((error) => {
    if (error.status === 401) {
      session = null;
      state = null;
      activePage = null;
      render();
    }
    showToast(error.message || "保存失败，请稍后重试", "error");
  });
}

function stopStateSync() {
  if (stateSyncTimer) {
    clearInterval(stateSyncTimer);
    stateSyncTimer = null;
  }
}

function startStateSync() {
  stopStateSync();
  if (!session) return;
  stateSyncTimer = setInterval(() => {
    refreshSharedState();
  }, 8000);
}

async function refreshSharedState({ force = false, notify = false } = {}) {
  if (!session || stateSyncInFlight || document.visibilityState === "hidden") return false;
  if (!force && modalRoot.innerHTML) return false;
  const activeElement = document.activeElement;
  if (
    !force &&
    (activeElement?.matches?.("input, textarea, select") ||
      activeElement?.isContentEditable)
  ) {
    return false;
  }
  stateSyncInFlight = true;
  try {
    const previousWaiting = new Set(
      (state?.consultations || [])
        .filter((item) => item.status === "waiting")
        .map((item) => item.id),
    );
    const nextState = await loadState();
    if (Number(nextState.serverRevision) === Number(state?.serverRevision)) {
      return false;
    }
    const currentAccount = nextState.users?.find((item) => item.id === session.userId);
    if (!currentAccount) {
      session = null;
      state = null;
      activePage = null;
      stopStateSync();
      render();
      return false;
    }
    const newWaiting = (nextState.consultations || []).filter(
      (item) => item.status === "waiting" && !previousWaiting.has(item.id),
    );
    state = nextState;
    if (!modalRoot.innerHTML) render();
    if (notify && currentAccount.role === "DOCTOR" && newWaiting.length) {
      showToast(`收到 ${newWaiting.length} 条新的已支付问诊`);
    }
    return true;
  } catch (error) {
    if (error.status === 401) {
      session = null;
      state = null;
      activePage = null;
      stopStateSync();
      render();
      showToast("登录状态已失效，请重新登录", "error");
    }
    return false;
  } finally {
    stateSyncInFlight = false;
  }
}

function initials(name = "") {
  return name.trim().slice(-2) || "灵枢";
}

function avatar(user, extra = "") {
  const roleClass = user?.role ? user.role.toLowerCase() : "";
  return `<span class="avatar ${roleClass} ${extra}">${esc(initials(user?.realName || user?.name))}</span>`;
}

function dateTime(value, options = {}) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    ...options,
  }).format(new Date(value));
}

function timeOnly(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function statusPill(status) {
  const meta = RX_STATUS_META[status] || { label: status, tone: "gray" };
  return `<span class="pill ${meta.tone}">${esc(meta.label)}</span>`;
}

function patientOf(id) {
  return state.users.find((user) => user.id === id) || null;
}

function rxTotal(rx) {
  if (Number(rx.pharmacyQuote?.estimatedPrice) >= 0 && rx.pharmacyQuote?.items?.length) {
    return formatCurrency(rx.pharmacyQuote.estimatedPrice);
  }
  return formatCurrency(prescriptionTotal(rx.items));
}

function pageHeading(title, subtitle, actions = "") {
  return `
    <div class="page-heading">
      <div>
        <h2>${esc(title)}</h2>
        <p>${esc(subtitle)}</p>
      </div>
      ${actions ? `<div class="page-heading-actions">${actions}</div>` : ""}
    </div>`;
}

function sectionHead(title, subtitle = "", action = "") {
  return `
    <div class="section-head">
      <div><h3>${esc(title)}</h3>${subtitle ? `<p>${esc(subtitle)}</p>` : ""}</div>
      ${action}
    </div>`;
}

function emptyState(iconName, title, text, action = "") {
  return `
    <div class="empty-state">
      <div class="empty-icon">${icon(iconName, "icon-lg")}</div>
      <h3>${esc(title)}</h3>
      <p>${esc(text)}</p>
      ${action}
    </div>`;
}

function roleNav() {
  const user = currentUser();
  const role = user.role;
  const nav = navSections[role] || [];
  const unread = state.notifications.filter((item) => item.role === role && item.unread).length;
  return nav
    .map(
      (section) => `
        <div class="nav-section-label">${esc(section.label)}</div>
        <nav class="sidebar-nav" aria-label="${esc(section.label)}">
          ${section.items
            .map(([page, iconName, label]) => {
              let count = "";
              if (page === "consultations" && role === "DOCTOR") {
                count = state.consultations.filter((item) => item.doctorId === user.id && item.status === "waiting").length;
              }
              if (page === "prescriptions" && role === "PATIENT") {
                count = state.prescriptions.filter(
                  (item) => item.patientId === user.id && [RX_STATUS.PENDING_PHARMACY, RX_STATUS.PENDING_REVIEW, RX_STATUS.PENDING_PAYMENT, RX_STATUS.TRANSFERRED].includes(item.status),
                ).length;
              }
              if (page === "review" && role === "PHARMACIST") {
                count = state.prescriptions.filter((item) => item.status === RX_STATUS.PENDING_REVIEW).length;
              }
              if (page === "registrations" && role === "ADMIN") {
                count = (state.registrations || []).filter((item) => item.status === "pending").length;
              }
              if (page === "overview" && role === "ADMIN") count = 0;
              return `
                <button class="nav-item ${activePage === page ? "active" : ""}" data-action="navigate" data-page="${page}">
                  ${icon(iconName)}
                  <span>${esc(label)}</span>
                  ${count ? `<span class="nav-count">${count}</span>` : ""}
                </button>`;
            })
            .join("")}
        </nav>`,
    )
    .join("");
}

function sidebarTip(user) {
  const waitingDoctors = state.consultations.filter(
    (item) => item.doctorId === user.id && item.status === "waiting",
  ).length;
  const pendingRx = state.prescriptions.filter(
    (item) => item.status === RX_STATUS.PENDING_REVIEW,
  ).length;
  const pendingAccounts = (state.registrations || []).filter(
    (item) => item.status === "pending",
  ).length;
  const todayConsults = state.consultations.filter(
    (item) => shanghaiDateKey(item.createdAt) === shanghaiDateKey(),
  ).length;
  const tips = {
    PATIENT: ["用药提醒", "布洛芬建议餐后服用，请留意胃部不适。", "查看处方"],
    DOCTOR: ["今日待办", `当前有 ${waitingDoctors} 位患者等待接诊。`, "去接诊"],
    PHARMACIST: ["审方提示", `当前有 ${pendingRx} 张处方等待审核。`, "开始审方"],
    ADMIN: ["账号审核", `有 ${pendingAccounts} 个资质申请待审核，今日问诊 ${todayConsults} 次。`, "去审核"],
  };
  const [title, text, action] = tips[user.role];
  const route =
    user.role === "PHARMACIST"
      ? "review"
      : user.role === "ADMIN"
        ? "registrations"
        : user.role === "DOCTOR"
          ? "consultations"
          : "prescriptions";
  return `
    <div class="sidebar-tip">
      <h4>${esc(title)}</h4>
      <p>${esc(text)}</p>
      <button data-action="navigate" data-page="${route}">${esc(action)} →</button>
    </div>`;
}

function topbarActions(user) {
  const primary =
    user.role === "PATIENT"
      ? `<button class="btn btn-primary btn-sm" data-action="navigate" data-page="triage">${icon("plus", "icon-xs")} 发起问诊</button>`
      : user.role === "DOCTOR"
        ? `<button class="btn btn-primary btn-sm" data-action="new-prescription">${icon("plus", "icon-xs")} 新建处方</button>`
        : user.role === "PHARMACIST"
          ? `<button class="btn btn-primary btn-sm" data-action="navigate" data-page="review">${icon("shield", "icon-xs")} 开始审方</button>`
          : `<button class="btn btn-primary btn-sm" data-action="open-add-drug">${icon("plus", "icon-xs")} 新增药品</button>`;
  const unread = state.notifications.some((item) => item.role === user.role && item.unread);
  return `
    <div class="topbar-actions">
      <div class="topbar-date">${icon("calendar", "icon-xs")} ${esc(fullDateLabel())}</div>
      <button class="search-trigger" data-action="open-search">
        ${icon("search", "icon-xs")} 搜索医生、处方或药品 <kbd>⌘ K</kbd>
      </button>
      <button class="icon-btn" data-action="toggle-notifications" aria-label="通知">
        ${icon("bell")}${unread ? '<span class="badge-dot"></span>' : ""}
      </button>
      ${primary}
    </div>`;
}

function notificationsPanel(user) {
  const items = state.notifications.filter((item) => item.role === user.role);
  return `
    <aside class="notifications-panel" aria-label="通知中心">
      <div class="notifications-head">
        <h3>通知中心</h3>
        <button class="text-button" data-action="read-all">全部已读</button>
      </div>
      ${
        items.length
          ? items
              .map(
                (item) => `
                <div class="notification-item" ${item.targetPage ? `data-action="navigate" data-page="${esc(item.targetPage)}"` : ""}>
                  <div class="notification-icon">${icon(item.icon || "bell", "icon-xs")}</div>
                  <div class="notification-copy">
                    <p>${esc(item.title)}</p>
                    <span>${esc(item.content)}</span>
                    <time>${esc(item.time)}</time>
                  </div>
                </div>`,
              )
              .join("")
          : `<div class="empty-state" style="min-height:180px"><p>暂时没有新通知</p></div>`
      }
    </aside>`;
}

function shellMarkup(user) {
  const pageMeta = roleConfig[user.role].pages[activePage] || ["灵枢", "智慧医疗服务平台"];
  return `
    <div class="app-shell">
      ${sidebarOpen ? '<div class="sidebar-overlay" data-action="close-sidebar"></div>' : ""}
      <aside class="sidebar ${sidebarOpen ? "open" : ""}">
        <div class="sidebar-brand">
          ${brandMark()}
          <div class="brand-name">灵枢</div>
        </div>
        <div class="role-capsule">
          ${icon("shield", "icon-xs")}
          <span>当前身份 · <strong>${esc(roleConfig[user.role].label)}</strong></span>
          <i class="online-dot"></i>
        </div>
        ${roleNav()}
        ${sidebarTip(user)}
        <div class="sidebar-user">
          ${avatar(user, "small")}
          <div class="sidebar-user-copy">
            <strong>${esc(user.realName)}</strong>
            <span>${esc(user.title || user.doctorNo || user.patientNo || "灵枢用户")}</span>
          </div>
          <button class="icon-btn" data-action="logout" aria-label="退出登录">${icon("logout", "icon-xs")}</button>
        </div>
      </aside>
      <main class="main">
        <header class="topbar">
          <button class="icon-btn mobile-menu" data-action="open-sidebar" aria-label="打开导航">${icon("menu")}</button>
          <div class="topbar-title">
            <h1>${esc(pageMeta[0])}</h1>
            <p>${esc(pageMeta[1])}</p>
          </div>
          ${topbarActions(user)}
        </header>
        <div class="page-wrap">
          <div class="page" id="page-content">${renderPage(user)}</div>
          <div class="footer-note">灵枢 · 数据加密与访问控制 · 本平台不构成实际诊疗建议</div>
        </div>
      </main>
      ${notificationsOpen ? notificationsPanel(user) : ""}
    </div>`;
}

function render() {
  if (!session) {
    activePage = null;
    app.innerHTML = authMarkup();
  } else {
    const user = currentUser();
    if (!user) {
      session = null;
      state = null;
      activePage = null;
      app.innerHTML = authMarkup();
      return;
    }
    if (
      ["DOCTOR", "PHARMACIST"].includes(user.role) &&
      user.approvalStatus === "rejected"
    ) {
      qualificationResubmitMode = true;
      app.innerHTML = qualificationResubmitMarkup(user);
      return;
    }
    if (!roleConfig[user.role].pages[activePage]) activePage = roleConfig[user.role].home;
    app.innerHTML = shellMarkup(user);
    requestAnimationFrame(() => {
      const messages = document.querySelector(".messages");
      if (messages) messages.scrollTop = messages.scrollHeight;
      if (activePage === "audit" && user.role === "ADMIN") loadAuditLogsIntoPage();
    });
  }
}

function authMarkup() {
  return `
    <main class="auth-screen">
      <section class="auth-stage">
        <div class="auth-brand">
          ${brandMark()}
          <div class="brand-name">灵枢 <small>LINGSHU HEALTH</small></div>
        </div>
        <div class="auth-copy">
          <span class="auth-kicker"><i class="dot"></i> 智慧医疗 · 让专业照护更近一步</span>
          <h1>看见症状背后的<em>完整脉络</em></h1>
          <p>从智能导诊到在线问诊，从医生开方到药师审核、药房核销。让每一次医疗协作，都清晰、安全、可追溯。</p>
        </div>
        <div class="auth-flow">
          <div class="auth-flow-step"><span>${icon("sparkles", "icon-xs")}</span><span>AI 导诊</span></div>
          <i class="auth-flow-line"></i>
          <div class="auth-flow-step"><span>${icon("message", "icon-xs")}</span><span>在线问诊</span></div>
          <i class="auth-flow-line"></i>
          <div class="auth-flow-step"><span>${icon("file", "icon-xs")}</span><span>电子处方</span></div>
          <i class="auth-flow-line"></i>
          <div class="auth-flow-step"><span>${icon("shield", "icon-xs")}</span><span>药师审方</span></div>
        </div>
        <div class="auth-footer">
          <span>© 2026 灵枢智慧医疗</span>
          <span>隐私保护 · 安全加密 · 全程留痕</span>
        </div>
      </section>
      <section class="auth-panel">
        <div class="login-card">
          <span class="login-eyebrow">WELCOME TO LINGSHU</span>
          <h2>欢迎回来</h2>
          <p>登录灵枢，开始今天的医疗协作。</p>
          <div class="login-mode-switch" role="tablist" aria-label="登录方式">
            <button type="button" class="${loginMode === "account" ? "active" : ""}" data-action="login-mode" data-mode="account">账号登录</button>
            <button type="button" class="${loginMode === "phone" ? "active" : ""}" data-action="login-mode" data-mode="phone">手机号登录</button>
          </div>
          <form class="login-form" id="login-form" autocomplete="off" novalidate>
            <div class="field-group">
              <label for="login-identifier">${loginMode === "phone" ? "手机号" : "账号"}</label>
              <div class="input-shell">
                ${icon(loginMode === "phone" ? "phone" : "user")}
                <input id="login-identifier" name="identifier" type="${loginMode === "phone" ? "tel" : "text"}" autocomplete="off" placeholder="${loginMode === "phone" ? "请输入注册手机号" : "请输入系统分配账号"}" value="" inputmode="${loginMode === "phone" ? "numeric" : "text"}" />
              </div>
            </div>
            <div class="field-group">
              <label for="login-password">密码</label>
              <div class="input-shell">
                ${icon("lock")}
                <input id="login-password" name="password" type="password" autocomplete="new-password" placeholder="请输入密码" value="" />
                <button class="password-toggle" type="button" data-action="toggle-password" aria-label="显示密码">${icon("eye", "icon-xs")}</button>
              </div>
            </div>
            <div class="login-options">
              <label class="checkbox-line"><input type="checkbox" checked /> 保持登录</label>
              <button type="button" class="text-button" data-action="forgot-password">忘记密码？</button>
            </div>
            <div class="login-error" id="login-error"></div>
            <button class="btn btn-primary btn-lg btn-block" type="submit">安全登录 ${icon("arrow", "icon-xs")}</button>
          </form>
          <div class="register-callout">
            <span>还没有灵枢账号？</span>
            <button type="button" class="text-button" data-action="open-register">创建患者、医生或药师账号 →</button>
          </div>
          <div class="auth-security">${icon("lock", "icon-xs")} 医疗数据已加密保护 · 请妥善保管登录凭据</div>
        </div>
      </section>
    </main>`;
}

function loadingMarkup() {
  return `
    <div class="loading-screen">
      ${brandMark()}
      <strong>灵枢</strong>
      <span>正在连接医疗服务</span>
      <i class="loading-line"></i>
    </div>`;
}

function bootstrapErrorMarkup(message) {
  return `
    <div class="loading-screen">
      ${brandMark()}
      <strong>暂时无法连接服务端</strong>
      <span>${esc(message)}</span>
      <button class="btn btn-primary" data-action="retry-bootstrap">重新连接</button>
    </div>`;
}

function quickAction(page, iconName, title, text, tone = "") {
  return `
    <button class="quick-card" data-action="navigate" data-page="${page}">
      <span class="quick-icon ${tone}">${icon(iconName)}</span>
      <span><strong>${esc(title)}</strong><span>${esc(text)}</span></span>
    </button>`;
}

function statCard(label, value, unit, delta, iconName, tone = "") {
  return `
    <article class="stat-card">
      <div class="stat-top">
        <span class="stat-label">${esc(label)}</span>
        <span class="stat-icon ${tone}">${icon(iconName, "icon-xs")}</span>
      </div>
      <div class="stat-value">${esc(value)}${unit ? `<small>${esc(unit)}</small>` : ""}</div>
      <div class="stat-trend">${delta}</div>
    </article>`;
}

function areaChart(id = "trend", alt = false) {
  return `
    <svg class="area-chart" viewBox="0 0 760 240" preserveAspectRatio="none" aria-label="近七日趋势图" role="img">
      <defs>
        <linearGradient id="${id}-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${alt ? "#66c9ab" : "#0b6b5b"}" stop-opacity=".2"/>
          <stop offset="100%" stop-color="${alt ? "#66c9ab" : "#0b6b5b"}" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <g stroke="#e8eeea" stroke-width="1">
        <line x1="10" y1="35" x2="750" y2="35"/>
        <line x1="10" y1="85" x2="750" y2="85"/>
        <line x1="10" y1="135" x2="750" y2="135"/>
        <line x1="10" y1="185" x2="750" y2="185"/>
      </g>
      <path d="M10 182 C70 179 91 156 134 162 S211 132 254 141 S329 98 375 112 S447 72 494 85 S568 116 611 91 S710 49 750 60 L750 220 L10 220 Z" fill="url(#${id}-fill)"/>
      <path d="M10 182 C70 179 91 156 134 162 S211 132 254 141 S329 98 375 112 S447 72 494 85 S568 116 611 91 S710 49 750 60" fill="none" stroke="#0b6b5b" stroke-width="2.6" stroke-linecap="round"/>
      <path d="M10 198 C65 186 89 190 134 181 S205 168 254 172 S320 157 375 151 S452 160 494 145 S566 148 611 128 S701 126 750 104" fill="none" stroke="#74c9ae" stroke-width="1.8" stroke-dasharray="5 6" stroke-linecap="round"/>
      <g fill="#fff" stroke="#0b6b5b" stroke-width="2">
        <circle cx="134" cy="162" r="3"/>
        <circle cx="254" cy="141" r="3"/>
        <circle cx="375" cy="112" r="3"/>
        <circle cx="494" cy="85" r="3"/>
        <circle cx="611" cy="91" r="3"/>
        <circle cx="750" cy="60" r="3"/>
      </g>
    </svg>
    <div class="chart-labels"><span>11/18</span><span>11/19</span><span>11/20</span><span>11/21</span><span>11/22</span><span>11/23</span><span>今天</span></div>`;
}

function consultationPreview(item, role) {
  const counterpart =
    role === "DOCTOR"
      ? patientOf(item.patientId) || { realName: item.patientName, role: "PATIENT" }
      : state.users.find((user) => user.id === item.doctorId) || { realName: item.doctorName, role: "DOCTOR" };
  const lastMessage = item.messages[item.messages.length - 1];
  const statusLabel = {
    waiting: ["待接诊", "amber"],
    active: ["问诊中", "green"],
    ended: ["已结束", "gray"],
    closed: ["已关闭", "gray"],
  }[item.status];
  return `
    <div class="consult-preview" data-action="open-consultation" data-id="${item.id}">
      ${avatar(counterpart, "small")}
      <div class="consult-preview-copy">
        <strong>${esc(counterpart.realName)} <span class="pill ${statusLabel[1]}">${statusLabel[0]}</span></strong>
        <p>${esc(lastMessage?.content || item.chiefComplaint)}</p>
      </div>
      <span class="time">${timeOnly(item.updatedAt)}</span>
    </div>`;
}

function patientOverviewMarkup(user) {
  const onlineDoctorCount = state.users.filter(
    (item) =>
      item.role === "DOCTOR" &&
      item.status === 1 &&
      item.approvalStatus === "approved" &&
      item.online === true,
  ).length;
  const consultations = state.consultations
    .filter((item) => item.patientId === user.id)
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .slice(0, 3);
  const appointment = state.appointments.find((item) => item.patientId === user.id);
  const activeRx = state.prescriptions.find(
    (item) => item.patientId === user.id && item.status === RX_STATUS.TRANSFERRED,
  );
  return `
    <div class="dashboard-grid">
      <div>
        <section class="welcome-banner">
          <div class="welcome-copy">
            <span class="welcome-tag">早上好，${esc(user.realName)}</span>
            <h2>身体有小信号，<br/>灵枢陪你理清它。</h2>
            <p>今天体感如何？如果有些不适，可以先从 AI 导诊开始。专业医生会沿着完整记录持续为你服务。</p>
            <div class="welcome-actions">
              <button class="btn btn-primary" data-action="navigate" data-page="triage">${icon("sparkles", "icon-xs")} 开始 AI 导诊</button>
              <button class="btn btn-secondary" data-action="navigate" data-page="consultations">继续问诊</button>
            </div>
          </div>
        </section>
        <div class="quick-grid">
          ${quickAction("triage", "sparkles", "AI 智能导诊", "快速匹配科室与医生", "sun")}
          ${quickAction("consultations", "message", "在线图文问诊", `${onlineDoctorCount} 位医生在线接诊`)}
          ${quickAction("prescriptions", "pill", activeRx ? "处方待取药" : "用药与处方", activeRx ? "取药码已生成" : "查看审核与流转记录", "coral")}
          ${quickAction("profile", "activity", "健康档案", "完善过敏与病史信息", "blue")}
        </div>
      </div>
      <div class="stack-sm">
        <section class="card side-card">
          <div class="side-card-head">
            <h3>下一次问诊</h3>
            <button data-action="navigate" data-page="consultations">查看全部</button>
          </div>
          ${
            appointment
              ? `
                <div class="appointment-card">
                  <div class="appointment-person">
                    ${avatar(state.users.find((item) => item.id === appointment.doctorId), "small doctor")}
                    <div><strong>${esc(appointment.doctorName)} 医生</strong><span>${esc(appointment.department)} · ${esc(appointment.type)}</span></div>
                    <span class="pill green" style="margin-left:auto">已确认</span>
                  </div>
                  <div class="appointment-time">${icon("calendar", "icon-xs")} ${esc(appointment.date)} <strong>${esc(appointment.time)}</strong></div>
                </div>`
              : `<div class="card-pad muted">暂无预约</div>`
          }
          <div class="mini-health-list">
            <div class="mini-health-item">
              <span class="mini-health-icon">${icon("heart", "icon-xs")}</span>
              <div><strong>健康状态</strong><span>最近一次记录 · 11 月 22 日</span></div>
              <span class="value">平稳</span>
            </div>
            <div class="mini-health-item">
              <span class="mini-health-icon">${icon("shield", "icon-xs")}</span>
              <div><strong>过敏提示</strong><span>开方与审方时自动校验</span></div>
              <span class="value text-danger">${esc(user.allergy)}</span>
            </div>
          </div>
        </section>
        <section class="card tips-card">
          <div class="tip-icon">${icon("activity", "icon-xs")}</div>
          <h3>今日健康小笺</h3>
          <p>天气转凉，室内外温差较大。注意补充温水，外出时做好颈咽部保暖。若低热持续超过 3 天或出现气促，请及时就医。</p>
        </section>
      </div>
    </div>
    <div class="content-grid">
      <section class="card">
        <div class="side-card-head">
          <div><h3>最近问诊</h3><p class="text-small muted" style="margin:2px 0 0">持续保存每一次沟通</p></div>
          <button data-action="navigate" data-page="consultations">查看全部 →</button>
        </div>
        <div class="consult-preview-list">
          ${consultations.length ? consultations.map((item) => consultationPreview(item, "PATIENT")).join("") : emptyState("message", "还没有问诊记录", "从 AI 导诊开始你的第一次在线问诊。")}
        </div>
      </section>
      <section class="card side-card">
        <div class="side-card-head">
          <h3>用药安全</h3>
          <span class="pill teal">已开启</span>
        </div>
        <div class="card-pad" style="padding-top:6px">
          <p class="muted text-small" style="line-height:1.8;margin-bottom:16px">处方提交后由持证药师审核。过敏史、药品禁忌和重复用药会在审核环节重点提示。</p>
          <div class="mini-health-item" style="padding-top:0">
            <span class="mini-health-icon">${icon("checkCircle", "icon-xs")}</span>
            <div><strong>身份与隐私保护</strong><span>敏感字段加密存储</span></div>
          </div>
          <div class="mini-health-item">
            <span class="mini-health-icon">${icon("clock", "icon-xs")}</span>
            <div><strong>处方有效期</strong><span>通过审核后 72 小时内取药</span></div>
          </div>
        </div>
      </section>
    </div>`;
}

function doctorOverviewMarkup(user) {
  const ownConsultations = state.consultations.filter(
    (item) => item.doctorId === user.id && item.paymentStatus === "paid",
  );
  const waiting = ownConsultations.filter((item) => item.status === "waiting");
  const active = ownConsultations.filter((item) => item.status === "active");
  const accepted = ownConsultations
    .filter((item) => item.startedAt)
    .sort((left, right) => new Date(right.startedAt) - new Date(left.startedAt));
  const acceptedToday = accepted.filter(
    (item) => shanghaiDateKey(item.startedAt) === shanghaiDateKey(),
  );
  const drafts = state.prescriptions.filter(
    (item) => item.doctorId === user.id && item.status === RX_STATUS.DRAFT,
  );
  const recent = [...ownConsultations]
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .slice(0, 5);
  const activity = [];
  for (const consultation of accepted) {
    activity.push({
      time: consultation.startedAt,
      icon: "message",
      text: `已接诊患者 ${consultation.patientName}`,
    });
    const lastMessage = consultation.messages?.at(-1);
    if (lastMessage?.time) {
      activity.push({
        time: lastMessage.time,
        icon: "message",
        text: `${lastMessage.senderName}：${lastMessage.content}`,
      });
    }
  }
  for (const rx of state.prescriptions.filter((item) => item.doctorId === user.id)) {
    activity.push({
      time: rx.updatedAt || rx.createdAt,
      icon: "file",
      text: `处方 ${rx.no} · ${RX_STATUS_META[rx.status]?.label || rx.status}`,
    });
  }
  const recentActivity = activity
    .filter((item) => item.time)
    .sort((left, right) => new Date(right.time) - new Date(left.time))
    .slice(0, 6);
  return `
    ${pageHeading(
      `${greetingForHour()}，${user.realName}医生`,
      `账号 ${user.username} · 当前有 ${waiting.length + active.length} 条待处理问诊。`,
      `<button class="btn btn-secondary" data-action="refresh-state">${icon("activity", "icon-xs")} 刷新</button><button class="btn btn-secondary" data-action="navigate" data-page="consultations">查看问诊队列</button><button class="btn btn-primary" data-action="new-prescription">${icon("plus", "icon-xs")} 新建处方</button>`,
    )}
    <div class="stat-grid">
      ${statCard("待接诊患者", String(waiting.length), "位", waiting.length ? "患者已完成支付" : "暂无待接诊患者", "clock", "amber")}
      ${statCard("进行中问诊", String(active.length), "位", active.length ? "正在与患者沟通" : "暂无进行中问诊", "message")}
      ${statCard("今日已接诊", String(acceptedToday.length), "位", acceptedToday.length ? "按实际接诊时间统计" : "今日暂无接诊记录", "checkCircle")}
      ${statCard("待提交处方", String(drafts.length), "张", drafts.length ? "存在未提交草稿" : "暂无处方草稿", "file", "coral")}
    </div>
    ${
      accepted.length
        ? `
        <section class="card">
          <div class="side-card-head"><div><h3>接诊日程</h3><p class="text-small muted" style="margin:2px 0 0">仅展示本账号实际接诊的会话</p></div><button data-action="navigate" data-page="consultations">进入问诊</button></div>
          <div class="schedule-list">
            ${accepted
              .slice(0, 6)
              .map(
                (item) => `
                <div class="schedule-item">
                  <div class="schedule-time">${timeOnly(item.startedAt)}<span>图文</span></div>
                  <div class="schedule-copy"><strong>${esc(item.patientName)} · ${esc(item.department)}</strong><p>${esc(item.chiefComplaint)} · ${consultationStatus(item.status)[0]}</p></div>
                </div>`,
              )
              .join("")}
          </div>
        </section>`
        : ""
    }
    <div class="content-grid ${recentActivity.length ? "" : "single-card"}">
      <section class="card">
        <div class="side-card-head"><div><h3>问诊队列</h3><p class="text-small muted" style="margin:2px 0 0">仅包含已支付且分配给账号 ${esc(user.username)} 的问诊</p></div><button data-action="navigate" data-page="consultations">查看全部</button></div>
        <div class="consult-preview-list">
          ${recent.length ? recent.map((item) => consultationPreview(item, "DOCTOR")).join("") : emptyState("message", "当前账号暂无问诊", "患者完成支付并分配到当前账号后，问诊会自动显示。")}
        </div>
      </section>
      ${
        recentActivity.length
          ? `
          <section class="card side-card">
            <div class="side-card-head"><h3>工作动态</h3><span class="muted text-small">真实接诊记录</span></div>
            <div class="activity-list">
              ${recentActivity
                .map(
                  (item) => `
                  <div class="activity-item"><span class="activity-icon">${icon(item.icon || "activity", "icon-xs")}</span><div class="activity-copy"><p>${esc(item.text)}</p><span>${dateTime(item.time)}</span></div></div>`,
                )
                .join("")}
            </div>
          </section>`
          : ""
      }
    </div>`;
}

function reviewBanner() {
  const pending = state.prescriptions.filter((item) => item.status === RX_STATUS.PENDING_REVIEW);
  const user = currentUser();
  const reviewed = state.prescriptions.filter(
    (item) =>
      item.pharmacistId === user?.id &&
      item.reviewedAt &&
      ![
        RX_STATUS.DRAFT,
        RX_STATUS.PENDING_REVIEW,
      ].includes(item.status),
  );
  const reviewedToday = reviewed.filter(
    (item) => shanghaiDateKey(item.reviewedAt) === shanghaiDateKey(),
  );
  const durations = reviewed
    .map((item) => {
      if (!item.submittedAt || !item.reviewedAt) return null;
      return Math.max(
        0,
        (new Date(item.reviewedAt).getTime() - new Date(item.submittedAt).getTime()) / 60000,
      );
    })
    .filter((value) => Number.isFinite(value));
  const averageMinutes = durations.length
    ? Math.round(durations.reduce((total, value) => total + value, 0) / durations.length)
    : null;
  return `
    <section class="card review-banner">
      <div class="review-banner-icon">${icon("shield", "icon-lg")}</div>
      <div class="review-banner-copy">
        <h3>每一张处方，都值得被认真看见</h3>
        <p>请重点核对诊断与用药指征、过敏史、特殊人群和重复用药风险。</p>
      </div>
      <div class="review-banner-stat">
        <div><strong>${pending.length}</strong><span>待审核</span></div>
        <div><strong>${reviewedToday.length}</strong><span>今日已审</span></div>
        <div><strong>${averageMinutes === null ? "—" : `${averageMinutes}′`}</strong><span>本人平均时效</span></div>
      </div>
    </section>`;
}

function pharmacistOverviewMarkup(user) {
  const assignedPharmacy = state.pharmacies.find(
    (item) => item.id === user.pharmacyId,
  );
  const ownPharmacy =
    assignedPharmacy?.status === 1 ? assignedPharmacy : null;
  const pending = state.prescriptions.filter(
    (item) => item.status === RX_STATUS.PENDING_REVIEW,
  );
  const ownReviews = state.prescriptions
    .filter(
      (item) =>
        item.pharmacistId === user.id &&
        item.reviewedAt &&
        ![RX_STATUS.DRAFT, RX_STATUS.PENDING_REVIEW].includes(item.status),
    )
    .sort((left, right) => new Date(right.reviewedAt) - new Date(left.reviewedAt));
  const reviewedToday = ownReviews.filter(
    (item) => shanghaiDateKey(item.reviewedAt) === shanghaiDateKey(),
  );
  const durations = ownReviews
    .map((item) => {
      if (!item.submittedAt || !item.reviewedAt) return null;
      return Math.max(
        0,
        (new Date(item.reviewedAt).getTime() - new Date(item.submittedAt).getTime()) / 60000,
      );
    })
    .filter((value) => Number.isFinite(value));
  const averageMinutes = durations.length
    ? Math.round(durations.reduce((total, value) => total + value, 0) / durations.length)
    : null;
  const rejectedCount = ownReviews.filter((item) => item.status === RX_STATUS.VOID).length;
  const fulfillablePending = ownPharmacy
    ? pending.filter((prescription) => {
        const patient = patientOf(prescription.patientId);
        return pharmacyRecommendations(
          [ownPharmacy],
          prescription.items || [],
          patient?.address || "",
          state.drugs,
          patient?.mapLocation || null,
        ).some((recommendation) => recommendation.available);
      }).length
    : 0;
  const pendingRisk = pending
    .map((prescription) => ({
      prescription,
      patient: patientOf(prescription.patientId),
    }))
    .filter(
      ({ patient }) =>
        patient?.allergy && !patient.allergy.includes("无") && !patient.allergy.includes("暂无"),
    );
  return `
    ${pageHeading(
      `${greetingForHour()}，${user.realName}药师`,
      `账号 ${user.username}${assignedPharmacy ? ` · 所属药房：${assignedPharmacy.name}${ownPharmacy ? "" : "（已停用）"}` : " · 尚未关联合作药房"}`,
      `<button class="btn btn-secondary" data-action="refresh-state">${icon("activity", "icon-xs")} 刷新</button>${assignedPharmacy ? `<button class="btn btn-secondary" data-action="edit-pharmacy-inventory" data-id="${assignedPharmacy.id}">${icon("pill", "icon-xs")} 更新药品数量</button>` : ""}<button class="btn btn-primary" data-action="navigate" data-page="review">${icon("shield", "icon-xs")} 进入审方工作台</button>`,
    )}
    ${reviewBanner()}
    <div class="stat-grid">
      ${statCard("今日审核", String(reviewedToday.length), "张", reviewedToday.length ? "按本人实际审核时间统计" : "今日暂无审核记录", "shield")}
      ${statCard("平均审方时长", averageMinutes === null ? "—" : String(averageMinutes), averageMinutes === null ? "" : "分", averageMinutes === null ? "暂无已完成审核记录" : "按本人实际处理时间计算", "clock", "amber")}
      ${statCard("本人驳回", String(rejectedCount), "张", rejectedCount ? "来自实际审核记录" : "暂无驳回处方", "alert", "coral")}
      ${statCard("药房目录", String(assignedPharmacy?.catalog?.length || 0), "种", assignedPharmacy ? (ownPharmacy ? `其中可配齐待审处方 ${fulfillablePending} 张` : "药房已停用，暂停审核与核销") : "尚未关联药房目录", "pill", "blue")}
    </div>
    <div class="wide-grid">
      <section class="card card-pad">
        <div class="side-card-head"><div><h3>合作药房</h3><p class="text-small muted" style="margin:2px 0 0">由药师注册资料审核通过后自动建立</p></div><span class="pill ${ownPharmacy ? "green" : assignedPharmacy ? "red" : "gray"}">${ownPharmacy ? "合作中" : assignedPharmacy ? "已停用" : "未关联"}</span></div>
        ${
          assignedPharmacy
            ? `<div class="detail-list"><div class="detail-item"><span>药房名称</span><strong>${esc(assignedPharmacy.name)}</strong></div><div class="detail-item"><span>药房地址</span><strong>${esc(assignedPharmacy.address)}</strong></div><div class="detail-item"><span>经营许可证</span><strong>${esc(assignedPharmacy.licenseNo)}</strong></div><div class="detail-item"><span>药品目录</span><strong>${assignedPharmacy.catalog?.length || 0} 种 · 最近同步 ${dateTime(assignedPharmacy.catalogUpdatedAt)}</strong></div></div>${ownPharmacy ? "" : `<div class="risk-alert red" style="margin-top:12px">${icon("alert", "icon-xs")}<div><strong>药房已由管理员停用</strong><p>当前不能审核新处方或核销患者取药，请联系管理员恢复。</p></div></div>`}`
            : emptyState("building", "尚未建立合作药房", "药师注册时填写的药房信息审核通过后，会自动出现在这里。")
        }
      </section>
      <section class="card side-card">
        <div class="side-card-head"><h3>真实风险提示</h3><span class="pill ${pendingRisk.length ? "red" : "green"}">${pendingRisk.length ? `${pendingRisk.length} 张需关注` : "暂无记录"}</span></div>
        <div class="card-pad" style="padding-top:5px">
          ${
            pendingRisk.length
              ? pendingRisk
                  .slice(0, 4)
                  .map(
                    ({ prescription, patient }, index) => `<div class="risk-alert" style="margin-top:${index === 0 ? "0" : "9px"}"><span>${icon("alert", "icon-xs")}</span><div><strong>${esc(patient?.realName || prescription.patientName)} · ${esc(patient?.allergy)}</strong><p>处方 ${esc(prescription.no)} 存在实际记录的过敏信息，请在审核时核对。</p></div></div>`,
                  )
                  .join("")
              : `<p class="muted text-small" style="line-height:1.8;margin:0">当前待审处方未记录明确过敏史。审核时仍需核对药品禁忌与患者实际情况。</p>`
          }
        </div>
      </section>
    </div>
    <section class="card" style="margin-top:20px">
      <div class="side-card-head"><div><h3>优先审核</h3><p class="text-small muted" style="margin:2px 0 0">按提交时间和风险等级排布</p></div><button data-action="navigate" data-page="review">进入工作台</button></div>
      <div class="rx-grid card-pad" style="padding-top:5px">
        ${pending.length ? pending.map((rx) => rxCardMarkup(rx)).join("") : emptyState("checkCircle", "队列已清空", "当前没有待审核处方。")}
      </div>
    </section>
    <section class="card" style="margin-top:20px">
      <div class="side-card-head"><div><h3>本人审核记录</h3><p class="text-small muted" style="margin:2px 0 0">仅展示当前药师实际处理过的处方</p></div></div>
      ${
        ownReviews.length
          ? `<div class="activity-list card-pad">${ownReviews
              .slice(0, 6)
              .map(
                (prescription) => `<div class="activity-item"><span class="activity-icon">${icon(prescription.status === RX_STATUS.VOID ? "alert" : "checkCircle", "icon-xs")}</span><div class="activity-copy"><p>处方 ${esc(prescription.no)} · ${RX_STATUS_META[prescription.status]?.label || prescription.status}</p><span>${dateTime(prescription.reviewedAt)}</span></div></div>`,
              )
              .join("")}</div>`
          : emptyState("activity", "暂无审核记录", "完成处方审核后会在这里显示真实处理记录。")
      }
    </section>`;
}

function shanghaiDateKey(value = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(value));
  const get = (type) => parts.find((part) => part.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function lastSevenShanghaiDates() {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    return {
      key: shanghaiDateKey(date),
      label: `${date.getMonth() + 1}/${date.getDate()}`,
    };
  });
}

function adminTrendMarkup() {
  const days = lastSevenShanghaiDates();
  const consultationCounts = days.map(
    (day) =>
      state.consultations.filter((item) => shanghaiDateKey(item.createdAt) === day.key).length,
  );
  const prescriptionCounts = days.map(
    (day) =>
      state.prescriptions.filter((item) => shanghaiDateKey(item.createdAt) === day.key).length,
  );
  const max = Math.max(1, ...consultationCounts, ...prescriptionCounts);
  const baseY = 188;
  const chartHeight = 145;
  const groupWidth = 95;
  const bars = days
    .map((day, index) => {
      const x = 38 + index * groupWidth;
      const consultHeight = (consultationCounts[index] / max) * chartHeight;
      const rxHeight = (prescriptionCounts[index] / max) * chartHeight;
      return `
        <rect x="${x}" y="${baseY - consultHeight}" width="22" height="${consultHeight}" rx="5" fill="#0b6b5b"></rect>
        <rect x="${x + 28}" y="${baseY - rxHeight}" width="22" height="${rxHeight}" rx="5" fill="#66c9ab"></rect>
        ${consultationCounts[index] ? `<text x="${x + 11}" y="${baseY - consultHeight - 7}" text-anchor="middle" font-size="9" fill="#53716a">${consultationCounts[index]}</text>` : ""}
        ${prescriptionCounts[index] ? `<text x="${x + 39}" y="${baseY - rxHeight - 7}" text-anchor="middle" font-size="9" fill="#53716a">${prescriptionCounts[index]}</text>` : ""}`;
    })
    .join("");
  return `
    <svg class="area-chart" viewBox="0 0 760 220" preserveAspectRatio="none" aria-label="近七日问诊与处方趋势">
      <g stroke="#e8eeea" stroke-width="1">
        <line x1="18" y1="43" x2="742" y2="43"/>
        <line x1="18" y1="91" x2="742" y2="91"/>
        <line x1="18" y1="139" x2="742" y2="139"/>
        <line x1="18" y1="188" x2="742" y2="188"/>
      </g>
      ${bars}
    </svg>
    <div class="chart-labels">${days.map((day) => `<span>${esc(day.label)}</span>`).join("")}</div>`;
}

function adminRecentActivities() {
  const activities = [];
  for (const item of state.consultations) {
    activities.push({
      time: item.updatedAt,
      icon: "message",
      text: `${item.patientName} 与 ${item.doctorName} 的${item.department}问诊更新为“${consultationStatus(item.status)[0]}”`,
    });
  }
  for (const item of state.prescriptions) {
    activities.push({
      time: item.updatedAt,
      icon: "file",
      text: `处方 ${item.no} · ${item.patientName} · ${RX_STATUS_META[item.status]?.label || item.status}`,
    });
  }
  for (const item of state.registrations || []) {
    if (!item.reviewedAt) continue;
    activities.push({
      time: item.reviewedAt,
      icon: item.status === "approved" ? "checkCircle" : "alert",
      text: `${item.realName}的${item.role === "DOCTOR" ? "医生" : "药师"}账号审核${item.status === "approved" ? "已通过" : "未通过"}`,
    });
  }
  return activities
    .filter((item) => item.time)
    .sort((a, b) => new Date(b.time) - new Date(a.time))
    .slice(0, 4);
}

function adminOverviewMarkup(user) {
  const today = shanghaiDateKey();
  const nonAdminUsers = state.users.filter((item) => item.role !== "ADMIN");
  const normalUsers = nonAdminUsers.filter((item) => item.status === 1);
  const todayConsultations = state.consultations.filter(
    (item) => shanghaiDateKey(item.createdAt) === today,
  );
  const activeConsultations = state.consultations.filter((item) => item.status === "active").length;
  const waitingConsultations = state.consultations.filter((item) => item.status === "waiting").length;
  const pendingRegistrations = (state.registrations || []).filter(
    (item) => item.status === "pending",
  );
  const pendingPrescriptions = state.prescriptions.filter(
    (item) =>
      item.status === RX_STATUS.PENDING_PHARMACY ||
      item.status === RX_STATUS.PENDING_REVIEW,
  );
  const transferredPrescriptions = state.prescriptions.filter(
    (item) => item.status === RX_STATUS.TRANSFERRED,
  );
  const dispensedPrescriptions = state.prescriptions.filter(
    (item) => item.status === RX_STATUS.DISPENSED,
  );
  const onlineDoctors = state.users.filter(
    (item) => item.role === "DOCTOR" && item.status === 1 && item.online,
  );
  const roleRows = [
    ["PATIENT", "患者"],
    ["DOCTOR", "医生"],
    ["PHARMACIST", "药师"],
    ["ADMIN", "管理员"],
  ].map(([role, label]) => {
    const roleUsers = state.users.filter((item) => item.role === role);
    const pending = pendingRegistrations.filter((item) => item.role === role).length;
    return {
      role,
      label,
      total: roleUsers.length,
      active: roleUsers.filter((item) => item.status === 1).length,
      today: roleUsers.filter(
        (item) => item.createdAt && shanghaiDateKey(item.createdAt) === today,
      ).length,
      pending,
    };
  });
  const activities = adminRecentActivities();
  return `
    ${pageHeading(
      `${greetingForHour()}，管理员`,
      `当前数据库共有 ${nonAdminUsers.length} 个注册用户，今日新增 ${todayConsultations.length} 次问诊。`,
      `<button class="btn btn-secondary" data-action="reset-demo">${icon("rotate", "icon-xs")} 重置系统数据</button>`,
    )}
    <div class="stat-grid">
      ${statCard("注册用户", String(nonAdminUsers.length), "人", `正常账号 <strong>${normalUsers.length}</strong> · 不含管理员`, "users")}
      ${statCard("今日问诊", String(todayConsultations.length), "次", `问诊中 <strong>${activeConsultations}</strong> · 待接诊 <strong>${waitingConsultations}</strong>`, "message", "amber")}
      ${statCard("待审账号", String(pendingRegistrations.length), "个", `医生 ${pendingRegistrations.filter((item) => item.role === "DOCTOR").length} · 药师 ${pendingRegistrations.filter((item) => item.role === "PHARMACIST").length}`, "shield", "blue")}
      ${statCard("待审处方", String(pendingPrescriptions.length), "张", `已流转 ${transferredPrescriptions.length} · 已核销 ${dispensedPrescriptions.length}`, "file", "coral")}
    </div>
    <div class="wide-grid">
      <section class="card chart-card">
        <div class="section-head" style="margin-bottom:0">
          <div><h3>平台业务趋势</h3><p>近七日实际问诊与处方创建量</p></div>
          <div class="chart-legend"><span><i></i>问诊</span><span><i class="alt"></i>处方</span></div>
        </div>
        ${adminTrendMarkup()}
      </section>
      <section class="card side-card">
        <div class="side-card-head"><h3>平台实际数据</h3><span class="pill green">实时同步</span></div>
        <div class="card-pad" style="padding-top:4px">
          <div class="mini-health-item" style="padding-top:0">
            <span class="mini-health-icon">${icon("stethoscope", "icon-xs")}</span>
            <div><strong>在线医生</strong><span>状态正常且当前在岗</span></div>
            <span class="value">${onlineDoctors.length} 人</span>
          </div>
          <div class="mini-health-item">
            <span class="mini-health-icon">${icon("building", "icon-xs")}</span>
            <div><strong>合作药房</strong><span>已启用处方流转接口</span></div>
            <span class="value">${state.pharmacies.filter((item) => item.status === 1).length} 家</span>
          </div>
          <div class="mini-health-item">
            <span class="mini-health-icon">${icon("pill", "icon-xs")}</span>
            <div><strong>启用药品</strong><span>当前可用药品目录</span></div>
            <span class="value">${state.drugs.filter((item) => item.enabled).length} 种</span>
          </div>
          <div class="mini-health-item">
            <span class="mini-health-icon">${icon("users", "icon-xs")}</span>
            <div><strong>待审核资质</strong><span>医生与药师注册申请</span></div>
            <span class="value">${pendingRegistrations.length} 个</span>
          </div>
        </div>
      </section>
    </div>
    <div class="content-grid">
      <section class="card">
        <div class="side-card-head"><h3>平台账户概览</h3><button data-action="navigate" data-page="users">管理用户</button></div>
        <div class="table-wrap">
          <table class="data-table">
            <thead><tr><th>角色</th><th>账号总数</th><th>正常账号</th><th>今日新增</th><th>待审核</th></tr></thead>
            <tbody>
              ${roleRows
                .map(
                  (row) => `
                  <tr>
                    <td>${esc(row.label)}</td>
                    <td>${row.total}</td>
                    <td>${row.active}</td>
                    <td>${row.today ? `+${row.today}` : "0"}</td>
                    <td>${row.pending ? `<span class="pill amber">${row.pending}</span>` : '<span class="muted">0</span>'}</td>
                  </tr>`,
                )
                .join("")}
            </tbody>
          </table>
        </div>
      </section>
      <section class="card side-card">
        <div class="side-card-head"><h3>最近动态</h3><span class="online-dot"></span></div>
        <div class="activity-list">
          ${
            activities.length
              ? activities
                  .map(
                    (item) => `
                    <div class="activity-item">
                      <span class="activity-icon">${icon(item.icon || "activity", "icon-xs")}</span>
                      <div class="activity-copy"><p>${esc(item.text)}</p><span>${dateTime(item.time)}</span></div>
                    </div>`,
                  )
                  .join("")
              : emptyState("activity", "暂无业务动态", "新的问诊、处方和审核记录会显示在这里。")
          }
        </div>
      </section>
    </div>`;
}

function greetingForHour() {
  const hour = new Date().getHours();
  if (hour < 11) return "早上好";
  if (hour < 14) return "中午好";
  if (hour < 18) return "下午好";
  return "晚上好";
}

function fullDateLabel(value = new Date()) {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(new Date(value));
}

function serviceMapMarkup({ patientId = null, recommendedPharmacyId = null } = {}) {
  const patients = state.users.filter(
    (user) => user.role === "PATIENT" && user.mapLocation,
  );
  const pharmacies = state.pharmacies.filter(
    (pharmacy) => pharmacy.status === 1 && pharmacy.mapLocation,
  );
  const currentPatient =
    patients.find((patient) => patient.id === patientId) || patients[0] || null;
  const hospital = state.hospital?.mapLocation ? state.hospital : null;
  if (!patients.length || !pharmacies.length) {
    return emptyState(
      "map",
      "地图数据尚未建立",
      "需要为患者和合作药房配置地图坐标后才能计算距离。",
    );
  }
  const toPoint = (location) => ({
    x: 44 + Number(location.x) * 63,
    y: 34 + Number(location.y) * 28,
  });
  const distances = pharmacies
    .map((pharmacy) => ({
      pharmacy,
      distanceKm: mapDistanceKm(
        currentPatient?.mapLocation,
        pharmacy.mapLocation,
      ),
    }))
    .sort((left, right) => (left.distanceKm ?? 999) - (right.distanceKm ?? 999));
  const highlightedPharmacy =
    distances.find((item) => item.pharmacy.id === recommendedPharmacyId) ||
    distances[0] ||
    null;
  const patientPoint = currentPatient ? toPoint(currentPatient.mapLocation) : null;
  const pharmacyPoint = highlightedPharmacy
    ? toPoint(highlightedPharmacy.pharmacy.mapLocation)
    : null;
  return `
    <section class="card map-card">
      <div class="side-card-head">
        <div><h3>区域服务地图</h3><p class="text-small muted" style="margin:2px 0 0">示意坐标，距离用于药房推荐</p></div>
        <span class="pill teal">${highlightedPharmacy ? `最近 ${highlightedPharmacy.distanceKm.toFixed(2)}km` : "待定位"}</span>
      </div>
      <div class="mini-map-wrap">
        <svg class="mini-map" viewBox="0 0 720 330" role="img" aria-label="患者家庭、灵枢综合医院和两家合作药房的示意图">
          <title>患者、医院与药房平面示意图</title>
          <rect class="map-ground" x="18" y="16" width="684" height="298" rx="20" />
          <g class="map-roads">
            <path d="M70 56H650M70 142H650M70 228H650M160 38V292M330 38V292M500 38V292M620 38V292" />
            <path class="map-road-main" d="M42 186H678M405 30V306" />
          </g>
          <text class="map-road-label" x="92" y="52">安康路</text>
          <text class="map-road-label" x="522" y="138">云锦路</text>
          <text class="map-road-label" x="38" y="320" transform="rotate(-90 38 320)">中心大道</text>
          ${
            currentPatient && pharmacyPoint
              ? `<path class="map-route" d="M${patientPoint.x} ${patientPoint.y} L${pharmacyPoint.x} ${pharmacyPoint.y}" />`
              : ""
          }
          ${
            hospital
              ? (() => {
                  const point = toPoint(hospital.mapLocation);
                  return `<g class="map-hospital" transform="translate(${point.x} ${point.y})"><rect x="-11" y="-11" width="22" height="22" rx="6"/><path d="M-5 0H5M0-5V5"/><title>${esc(hospital.name)}</title></g><text class="map-label map-label-hospital" x="${point.x + 16}" y="${point.y + 4}">${esc(hospital.name)}</text>`;
                })()
              : ""
          }
          ${patients
            .map((patient) => {
              const point = toPoint(patient.mapLocation);
              const active = patient.id === currentPatient?.id;
              return `<g class="map-patient ${active ? "current" : ""}" transform="translate(${point.x} ${point.y})"><circle r="${active ? 12 : 8}"/><path d="M-4 1V-3L0-6l4 3v4h-8Z"/><title>${esc(patient.realName)}的家</title></g><text class="map-label ${active ? "map-label-current" : ""}" x="${point.x + 11}" y="${point.y + 18}">${esc(patient.realName)}的家</text>`;
            })
            .join("")}
          ${distances
            .map(({ pharmacy, distanceKm }) => {
              const point = toPoint(pharmacy.mapLocation);
              const active = pharmacy.id === highlightedPharmacy?.pharmacy.id;
              return `<g class="map-pharmacy ${active ? "recommended" : ""}" transform="translate(${point.x} ${point.y})"><circle r="${active ? 14 : 10}"/><text x="0" y="4">药</text><title>${esc(pharmacy.name)} · ${distanceKm.toFixed(2)}km</title></g><text class="map-label ${active ? "map-label-recommended" : ""}" x="${point.x + 15}" y="${point.y - 10}">${esc(pharmacy.name)}</text>`;
            })
            .join("")}
        </svg>
        <div class="map-legend">
          <span><i class="map-legend-hospital"></i>医院</span>
          <span><i class="map-legend-patient"></i>患者家庭</span>
          <span><i class="map-legend-pharmacy"></i>合作药房</span>
          <span><i class="map-legend-route"></i>推荐路线</span>
        </div>
      </div>
      <div class="map-distance-list">
        ${distances
          .map(
            ({ pharmacy, distanceKm }, index) => `
            <div class="${pharmacy.id === highlightedPharmacy?.pharmacy.id ? "recommended" : ""}">
              <span>${pharmacy.name}</span>
              <strong>${distanceKm.toFixed(2)} km</strong>
              <small>${pharmacy.id === highlightedPharmacy?.pharmacy.id ? "按当前地图距离推荐" : `第 ${index + 1} 距离`}</small>
            </div>`,
          )
          .join("")}
      </div>
    </section>`;
}

function recommendedDoctorsForTriage(result) {
  if (!result) return [];
  return rankTriageDoctors(state.users, result).slice(0, 4);
}

function triageResultMarkup() {
  if (!triageResult) {
    return `
      <section class="card ai-result">
        <div class="ai-result-label">${icon("sparkles", "icon-xs")} AI 初步分诊</div>
        <div class="ai-placeholder">
          <div class="ai-placeholder-graphic">
            <span>${icon("stethoscope")}</span>
          </div>
          <h3>先告诉我们你的感受</h3>
          <p>灵枢会根据症状描述给出科室建议与风险提示。AI 结果只用于辅助分诊，不替代医生判断。</p>
        </div>
      </section>`;
  }
  const recommendedDoctors = recommendedDoctorsForTriage(triageResult);
  if (
    !selectedTriageDoctorId ||
    !recommendedDoctors.some((doctor) => doctor.id === selectedTriageDoctorId)
  ) {
    selectedTriageDoctorId = recommendedDoctors[0]?.id || null;
  }
  const selectedDoctor = recommendedDoctors.find(
    (doctor) => doctor.id === selectedTriageDoctorId,
  );
  const matchingDoctorCount = recommendedDoctors.filter(
    (doctor) => doctor.triageMatchPriority === 0,
  ).length;
  const alternativeDepartments = (triageResult.departmentCandidates || [])
    .slice(1)
    .filter((item) => item.department !== triageResult.department);
  return `
    <section class="card ai-result">
      <div class="ai-result-label">${icon("sparkles", "icon-xs")} AI 初步分诊</div>
      <div class="risk-banner ${triageResult.urgent ? "high" : ""}">
        ${icon("alert", "icon-xs")}
        <div><strong>${esc(triageResult.riskLevel)}</strong><p>${esc(triageResult.riskTip)}</p></div>
      </div>
      <div class="result-dept">
        <span class="result-icon">${icon("stethoscope")}</span>
        <div>
          <span>首选就诊科室 · 匹配度${esc(triageResult.confidence || "一般")}</span>
          <strong>${esc(triageResult.department)}</strong>
          ${alternativeDepartments.length ? `<small>备选：${alternativeDepartments.map((item) => esc(item.department)).join("、")}</small>` : ""}
        </div>
        <span class="pill ${recommendedDoctors.length ? "green" : "amber"}" style="margin-left:auto">${recommendedDoctors.length ? `${matchingDoctorCount ? `${matchingDoctorCount} 位首选科室医生` : `${recommendedDoctors.length} 位备选科室医生`}` : "暂无匹配医生"}</span>
      </div>
      ${triageResult.matchedSymptoms?.length ? `<div class="choice-row" style="margin-bottom:12px">${triageResult.matchedSymptoms.map((item) => `<span class="choice-chip active">${esc(item)}</span>`).join("")}</div>` : ""}
      <ul class="result-list">
        ${triageResult.questions.map((question) => `<li>${esc(question)}</li>`).join("")}
      </ul>
      <div class="risk-alert" style="margin-bottom:16px">
        <span>${icon(recommendedDoctors.length ? "shield" : "alert", "icon-xs")}</span>
        <div><strong>${recommendedDoctors.length ? "分诊与医生匹配依据" : "当前没有可接诊医生"}</strong><p>${recommendedDoctors.length ? `${esc(triageResult.recommendationReason || "")} 医生列表已限定在首选或备选科室，并按专业方向、从业年限、评分和接诊量排序。` : `当前${esc(triageResult.department)}及备选科室暂无状态正常、资质已通过且正在接诊的医生。请稍后重新查看，或联系平台管理员。`}</p></div>
      </div>
      ${
        recommendedDoctors.length
          ? `<div class="doctor-choice-section">
              <div class="doctor-choice-head"><strong>选择接诊医生</strong><span>仅展示与分诊科室匹配的在线医生，点击卡片选择</span></div>
              <div class="doctor-choice-grid">
                ${recommendedDoctors
                  .map(
                    (doctor) => `
                    <button type="button" class="doctor-choice-card ${doctor.id === selectedTriageDoctorId ? "active" : ""}" data-action="select-triage-doctor" data-doctor-id="${doctor.id}" aria-pressed="${doctor.id === selectedTriageDoctorId}">
                      ${avatar(doctor, "small doctor")}
                      <span class="doctor-choice-copy">
                        <strong>${esc(doctor.realName)} 医生</strong>
                        <small>${esc(doctor.title || "医师")} · ${esc(doctor.department || "全科医学科")}</small>
                        <small>${doctor.triageSymptomHits?.length ? `专业方向匹配：${doctor.triageSymptomHits.map((item) => esc(item)).join("、")} · ` : ""}${esc(doctor.specialty || "综合诊疗")}</small>
                      </span>
                      <span class="pill ${doctor.triageMatchPriority === 0 ? "teal" : "gray"}">${esc(doctor.triageMatchLabel)}</span>
                    </button>`,
                  )
                  .join("")}
              </div>
            </div>
            <button class="btn btn-primary btn-block" data-action="start-triage-consult" data-doctor-id="${selectedDoctor?.id || ""}">${icon("message", "icon-xs")} 选择 ${esc(selectedDoctor?.realName || "")} 医生并问诊</button>`
          : `<button class="btn btn-primary btn-block" disabled>当前暂无可接诊医生</button>`
      }
      <button class="btn btn-secondary btn-block" style="margin-top:8px" data-action="reset-triage">重新描述症状</button>
    </section>`;
}

function triagePageMarkup(user) {
  const triageHistory = state.triageSessions
    .filter((item) => item.patientId === user.id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5);
  return `
    ${pageHeading(
      "AI 智能导诊",
      "用几分钟描述你的不适，灵枢会整理重点并推荐合适的科室。",
      `<button class="btn btn-secondary" data-action="navigate" data-page="consultations">${icon("message", "icon-xs")} 继续已有问诊</button>`,
    )}
    <div class="triage-layout">
      <section class="card triage-form-card">
        <div class="triage-title">
          <div class="triage-orb">${icon("sparkles")}</div>
          <div><h3>症状采集</h3><p>描述越清楚，分诊建议越有参考价值</p></div>
          <span class="pill green" style="margin-left:auto">AI 已就绪</span>
        </div>
        <form id="triage-form">
          <div class="form-grid">
            <div class="form-field full">
              <label for="triage-symptoms">哪里不舒服？<span class="required">*</span></label>
              <textarea id="triage-symptoms" name="symptoms" required placeholder="例如：从前天开始咽痛，伴低热，晨起咳嗽加重……">${esc(state.triageSessions.find((item) => item.patientId === user.id)?.symptoms || "")}</textarea>
              <span class="field-hint">请描述主要症状、严重程度和伴随不适，勿填写真实身份证号等敏感信息。</span>
            </div>
            <div class="form-field">
              <label for="triage-duration">症状持续多久？</label>
              <select id="triage-duration" name="duration">
                <option value="1天">1 天内</option>
                <option value="3天" selected>2—3 天</option>
                <option value="1周">1 周左右</option>
                <option value="2周">超过 2 周</option>
              </select>
            </div>
            <div class="form-field">
              <label>当前严重程度</label>
              <input type="hidden" id="triage-severity" name="severity" value="mild" />
              <div class="choice-row">
                <button type="button" class="choice-chip active" data-action="severity" data-value="mild">轻微</button>
                <button type="button" class="choice-chip" data-action="severity" data-value="moderate">中等</button>
                <button type="button" class="choice-chip" data-action="severity" data-value="severe">严重</button>
              </div>
            </div>
            <div class="form-field full">
              <label>常见症状快捷填写</label>
              <div class="choice-row">
                <button type="button" class="choice-chip" data-action="fill-symptom" data-value="发热">发热</button>
                <button type="button" class="choice-chip" data-action="fill-symptom" data-value="咳嗽">咳嗽</button>
                <button type="button" class="choice-chip" data-action="fill-symptom" data-value="咽痛">咽痛</button>
                <button type="button" class="choice-chip" data-action="fill-symptom" data-value="腹痛">腹痛</button>
                <button type="button" class="choice-chip" data-action="fill-symptom" data-value="头晕">头晕</button>
                <button type="button" class="choice-chip" data-action="fill-symptom" data-value="皮疹">皮疹</button>
                <button type="button" class="choice-chip" data-action="fill-symptom" data-value="胸闷">胸闷</button>
              </div>
            </div>
            <div class="form-field full">
              <label>补充信息</label>
              <div class="choice-row">
                <span class="choice-chip active">${esc(user.allergy)}</span>
                <span class="choice-chip">近期未服用处方药</span>
                <span class="choice-chip">已阅读隐私说明</span>
              </div>
            </div>
          </div>
          <div class="triage-action">
            <button class="btn btn-primary" type="submit">${icon("sparkles", "icon-xs")} 生成分诊建议</button>
            <span class="muted">约需 3 秒 · 结果仅供分诊参考</span>
          </div>
        </form>
      </section>
      <div id="triage-result">${triageResultMarkup()}</div>
    </div>
    <section class="card" style="margin-top:20px">
      <div class="side-card-head"><div><h3>我的 AI 导诊记录</h3><p class="text-small muted" style="margin:2px 0 0">查看历史症状描述、推荐科室与风险等级</p></div></div>
      <div class="table-wrap">
        ${
          triageHistory.length
            ? `<table class="data-table"><thead><tr><th>症状描述</th><th>持续时间</th><th>推荐科室</th><th>风险等级</th><th>生成时间</th></tr></thead><tbody>${triageHistory.map((item) => `<tr><td>${esc(item.symptoms)}</td><td>${esc(item.duration)}</td><td>${esc(item.department)}</td><td><span class="pill ${item.riskLevel === "高风险" ? "red" : "green"}">${esc(item.riskLevel)}</span></td><td>${dateTime(item.createdAt)}</td></tr>`).join("")}</tbody></table>`
            : emptyState("sparkles", "暂无导诊记录", "完成一次 AI 导诊后，结果会显示在这里。")
        }
      </div>
    </section>`;
}

function consultationStatus(status) {
  return {
    awaiting_payment: ["待支付", "amber"],
    waiting: ["待接诊", "amber"],
    active: ["问诊中", "green"],
    ended: ["已结束", "gray"],
    closed: ["已关闭", "gray"],
  }[status] || [status, "gray"];
}

function consultationItemsFor(user) {
  return state.consultations
    .filter(
      (item) =>
        (user.role === "PATIENT" ? item.patientId === user.id : item.doctorId === user.id) &&
        (user.role === "PATIENT" || item.status !== "awaiting_payment"),
    )
    .sort((a, b) => {
      const order = { waiting: 0, active: 1, ended: 2, closed: 3 };
      return (order[a.status] ?? 9) - (order[b.status] ?? 9) || new Date(b.updatedAt) - new Date(a.updatedAt);
    });
}

function messageMarkup(message, user) {
  const isOwn =
    (user.role === "PATIENT" && message.sender === "patient") ||
    (user.role === "DOCTOR" && message.sender === "doctor");
  const senderUser = state.users.find((item) => item.realName === message.senderName);
  return `
    <div class="message ${isOwn ? "own" : ""}">
      ${avatar(senderUser || { realName: message.senderName, role: message.sender === "patient" ? "PATIENT" : "DOCTOR" }, "small")}
      <div>
        <div class="message-body">${esc(message.content)}</div>
        <div class="message-time">${timeOnly(message.time)}</div>
      </div>
    </div>`;
}

function consultationsPageMarkup(user) {
  if (!["PATIENT", "DOCTOR"].includes(user.role)) {
    return emptyState("lock", "当前角色无权访问问诊对话", "请使用患者或医生身份进入该页面。");
  }
  const items = consultationItemsFor(user);
  if (!selectedConsultation || !items.some((item) => item.id === selectedConsultation)) {
    selectedConsultation = items[0]?.id || null;
  }
  const selected = items.find((item) => item.id === selectedConsultation);
  const counterpart = selected
    ? user.role === "DOCTOR"
      ? patientOf(selected.patientId)
      : state.users.find((item) => item.id === selected.doctorId)
    : null;
  const status = selected ? consultationStatus(selected.status) : ["—", "gray"];
  return `
    ${pageHeading(
      user.role === "DOCTOR" ? "患者问诊" : "在线问诊",
      user.role === "DOCTOR"
        ? `当前仅显示已支付且分配给账号 ${user.username} 的问诊。`
        : "与医生保持连续沟通，所有消息均会进入病情摘要。",
      user.role === "PATIENT"
        ? `<button class="btn btn-primary" data-action="navigate" data-page="triage">${icon("plus", "icon-xs")} 发起新问诊</button>`
        : `<button class="btn btn-secondary" data-action="refresh-state">${icon("activity", "icon-xs")} 刷新问诊</button><span class="pill green">${icon("wifi", "icon-xs")} 每 8 秒自动同步</span>`,
    )}
    <div class="consultation-layout">
      <section class="card conversation-list">
        <div class="toolbar">
          <div class="toolbar-search">
            ${icon("search")}
            <input type="search" data-action="filter-consults" placeholder="搜索患者或症状" />
          </div>
        </div>
        <div class="filter-pills" style="padding:10px 12px;border-bottom:1px solid var(--line-soft)">
          <button class="filter-pill active" data-action="consult-filter" data-value="all">全部 ${items.length}</button>
          <button class="filter-pill" data-action="consult-filter" data-value="active">问诊中 ${items.filter((i) => i.status === "active").length}</button>
          <button class="filter-pill" data-action="consult-filter" data-value="waiting">待接诊 ${items.filter((i) => i.status === "waiting").length}</button>
        </div>
        <div id="conversation-items">
          ${
            items.length
              ? items
                  .map((item) => {
                    const person =
                      user.role === "DOCTOR"
                        ? patientOf(item.patientId)
                        : state.users.find((personItem) => personItem.id === item.doctorId);
                    const itemStatus = consultationStatus(item.status);
                    return `
                      <div class="convo-item ${item.id === selectedConsultation ? "active" : ""}" data-action="select-consultation" data-id="${item.id}" data-search="${esc(`${person?.realName || ""} ${item.chiefComplaint}`)}">
                        ${avatar(person, `small ${user.role === "DOCTOR" ? "" : "doctor"}`)}
                        <div class="convo-copy">
                          <div class="convo-top"><strong>${esc(person?.realName || item.patientName)}</strong><span>${timeOnly(item.updatedAt)}</span></div>
                          <p>${esc(item.chiefComplaint)}</p>
                          <div class="convo-meta"><span class="pill ${itemStatus[1]}">${itemStatus[0]}</span><span class="muted">${item.department}</span></div>
                        </div>
                      </div>`;
                  })
                  .join("")
              : emptyState(
                  "message",
                  user.role === "DOCTOR" ? "当前账号暂无可处理问诊" : "暂无问诊",
                  user.role === "DOCTOR"
                    ? "患者支付问诊费后，分配给当前账号的问诊会自动显示。若存在同名医生账号，请确认患者选择的是哪个登录账号。"
                    : "新的问诊会话会出现在这里。",
                )
          }
        </div>
      </section>
      ${
        selected
          ? `
          <section class="card chat-panel">
            <div class="chat-head">
              ${avatar(counterpart, `large doctor`)}
              <div class="chat-head-copy">
                <strong>${esc(counterpart?.realName || (user.role === "DOCTOR" ? selected.patientName : selected.doctorName))}</strong>
                <span>${esc(user.role === "DOCTOR" ? `${selected.department} · 患者编号 ${counterpart?.patientNo || "—"}` : `${selected.department} · ${counterpart?.title || "医生"}`)}</span>
              </div>
              <span class="pill ${status[1]}">${status[0]}</span>
              <div class="chat-head-actions">
                ${user.role === "DOCTOR" ? `<button class="btn btn-secondary btn-sm" data-action="patient-details" data-id="${selected.patientId}">${icon("user", "icon-xs")} 患者资料</button><button class="btn btn-secondary btn-sm" data-action="consult-summary" data-id="${selected.id}">${icon("sparkles", "icon-xs")} AI 摘要</button>${selected.status === "waiting" ? `<button class="btn btn-primary btn-sm" data-action="accept-consultation" data-id="${selected.id}">接受问诊</button>` : selected.status === "active" ? `<button class="btn btn-primary btn-sm" data-action="finish-consult" data-id="${selected.id}">结束并开方</button>` : `<button class="btn btn-primary btn-sm" data-action="prescription-from-consult" data-id="${selected.id}">查看处方</button>`}` : `<button class="btn btn-secondary btn-sm" data-action="patient-details" data-id="${selected.patientId}">${icon("file", "icon-xs")} 我的健康资料</button><button class="btn btn-secondary btn-sm" data-action="consult-summary" data-id="${selected.id}">${icon("sparkles", "icon-xs")} AI 摘要</button>`}
              </div>
            </div>
            <div class="chat-context">${icon("shield", "icon-xs")} <span>问诊信息已加密 · <strong>${esc(selected.chiefComplaint)}</strong> · 持续 ${esc(selected.symptomDuration)}</span></div>
            <div class="messages">
              ${selected.messages.map((message) => messageMarkup(message, user)).join("")}
            </div>
            ${
              selected.status === "awaiting_payment"
                ? `<div class="chat-compose"><div class="risk-alert" style="margin:0"><span>${icon("bag", "icon-xs")}</span><div style="flex:1"><strong>问诊费待支付</strong><p>支付 ${formatCurrency(selected.consultationFee)} 后医生才能接收问诊。</p></div><button class="btn btn-primary btn-sm" data-action="open-payment" data-id="${selected.id}">立即支付</button></div></div>`
                : selected.status === "ended"
                ? `<div class="chat-compose"><div class="chat-context" style="margin:0">${icon("lock", "icon-xs")} 本次问诊已结束，仍可查看历史记录与处方。</div></div>`
                : `
                <form class="chat-compose" id="message-form" data-id="${selected.id}">
                  <div class="compose-tools">
                    <button type="button" aria-label="添加附件">${icon("paperclip", "icon-xs")}</button>
                    <button type="button" aria-label="发送图片">${icon("image", "icon-xs")}</button>
                    <button type="button" data-action="consult-summary" data-id="${selected.id}" aria-label="生成病情摘要">${icon("sparkles", "icon-xs")}</button>
                  </div>
                  <div class="compose-row">
                    <textarea name="message" rows="1" required placeholder="${user.role === "DOCTOR" ? "回复患者，问诊内容将成为电子病历的一部分…" : "描述你的感受或补充问题…"}"></textarea>
                    <button class="btn btn-primary" type="submit" aria-label="发送">${icon("send", "icon-xs")}</button>
                  </div>
                </form>`
            }
          </section>`
          : `<section class="card chat-panel">${emptyState("message", "选择一个问诊会话", "左侧会话列表会展示你相关的全部问诊。")}</section>`
      }
    </div>`;
}

function adminConsultationsPageMarkup() {
  const items = [...state.consultations].sort(
    (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt),
  );
  return `
    ${pageHeading(
      "问诊管理",
      "查看平台全部问诊会话、接诊医生与当前状态。",
      `<span class="pill green">共 ${items.length} 条问诊</span>`,
    )}
    <div class="stat-grid">
      ${statCard("全部问诊", String(items.length), "次", "当前数据库实际记录", "message")}
      ${statCard("待接诊", String(items.filter((item) => item.status === "waiting").length), "次", "等待医生接受问诊", "clock", "amber")}
      ${statCard("问诊中", String(items.filter((item) => item.status === "active").length), "次", "正在图文沟通", "activity", "blue")}
      ${statCard("已结束", String(items.filter((item) => ["ended", "closed"].includes(item.status)).length), "次", "已完成或关闭", "checkCircle", "coral")}
    </div>
    <section class="card">
      <div class="side-card-head"><div><h3>问诊记录</h3><p class="text-small muted" style="margin:2px 0 0">按最近更新时间排序</p></div></div>
      <div class="table-wrap">
        ${
          items.length
            ? `<table class="data-table"><thead><tr><th>问诊编号</th><th>患者</th><th>接诊医生</th><th>科室</th><th>主诉</th><th>状态</th><th>最近更新</th><th>操作</th></tr></thead><tbody>${items
                .map(
                  (item) => `<tr>
                    <td>${esc(item.no)}</td>
                    <td>${esc(item.patientName)}</td>
                    <td>${esc(item.doctorName)}</td>
                    <td>${esc(item.department)}</td>
                    <td>${esc(item.chiefComplaint)}</td>
                    <td><span class="pill ${consultationStatus(item.status)[1]}">${consultationStatus(item.status)[0]}</span></td>
                    <td>${dateTime(item.updatedAt)}</td>
                    <td><button class="table-action" data-action="admin-view-consultation" data-id="${item.id}">查看详情</button></td>
                  </tr>`,
                )
                .join("")}</tbody></table>`
            : emptyState("message", "暂无问诊记录", "患者发起问诊后会显示在这里。")
        }
      </div>
    </section>`;
}

function adminConsultationModalMarkup(consultation) {
  return `
    <div class="modal-backdrop" data-action="backdrop-close">
      <section class="modal wide" role="dialog" aria-modal="true">
        <header class="modal-head">
          <div class="mini-health-icon" style="width:40px;height:40px">${icon("message")}</div>
          <div class="modal-head-copy"><h2>问诊详情</h2><p>${esc(consultation.no)} · ${esc(consultation.department)}</p></div>
          <button class="icon-btn" data-action="close-modal" aria-label="关闭">${icon("x")}</button>
        </header>
        <div class="modal-body">
          <div class="patient-summary">
            <div><span>患者</span><strong>${esc(consultation.patientName)}</strong></div>
            <div><span>接诊医生</span><strong>${esc(consultation.doctorName)}</strong></div>
            <div><span>状态</span><strong>${consultationStatus(consultation.status)[0]}</strong></div>
            <div><span>主诉</span><strong>${esc(consultation.chiefComplaint)}</strong></div>
            <div><span>持续时间</span><strong>${esc(consultation.symptomDuration)}</strong></div>
            <div><span>创建时间</span><strong>${dateTime(consultation.createdAt)}</strong></div>
          </div>
          <div class="modal-section">
            <div class="modal-section-title"><span>沟通记录</span><span class="muted text-small">${consultation.messages.length} 条消息</span></div>
            <div class="activity-list">
              ${consultation.messages.map((message) => `<div class="activity-item"><span class="activity-icon">${icon("message", "icon-xs")}</span><div class="activity-copy"><p><strong>${esc(message.senderName)}：</strong>${esc(message.content)}</p><span>${dateTime(message.time)}</span></div></div>`).join("") || emptyState("message", "暂无消息", "问诊尚未产生沟通记录。")}
            </div>
          </div>
          <div class="modal-actions"><button class="btn btn-secondary" data-action="close-modal">关闭</button></div>
        </div>
      </section>
    </div>`;
}

function rxCardMarkup(rx) {
  const date = new Date(rx.createdAt);
  const meta = RX_STATUS_META[rx.status];
  return `
    <article class="rx-card" data-action="open-rx" data-id="${rx.id}">
      <div class="rx-card-top">
        <div>
          <span class="rx-no">${esc(rx.no)}</span>
          <h3>${esc(rx.diagnosis || "待完善诊断")}</h3>
          <span class="muted text-small">${date.getMonth() + 1} 月 ${date.getDate()} 日 · ${esc(rx.department)}</span>
        </div>
        ${statusPill(rx.status)}
      </div>
      <div class="rx-doctor">
        ${avatar({ realName: rx.doctorName, role: "DOCTOR" }, "small doctor")}
        <div><strong>${esc(rx.doctorName)}</strong> <span>${esc(rx.doctorName === "陈屿" ? "副主任医师" : "开具医师")}</span></div>
        <span style="margin-left:auto">${rx.items.length} 种药品</span>
      </div>
      <div class="rx-drug-line"><span>${esc(rx.items[0]?.name || "尚未添加药品")}${rx.items.length > 1 ? ` 等 ${rx.items.length} 种` : ""}</span><strong>${rxTotal(rx)}</strong></div>
      <div class="rx-card-foot">
        <span>${rx.status === RX_STATUS.TRANSFERRED && rx.expireAt ? `有效期至 ${dateTime(rx.expireAt, { year: "numeric", month: "2-digit", day: "2-digit", hour: undefined, minute: undefined })}` : meta.label === "待选药房" ? "请患者自行选择药房" : meta.label === "待审核" ? "等待药师处理" : "查看处方详情"}</span>
        <span class="pill ${meta.tone} no-dot">${meta.step >= 0 ? `${meta.step + 1}/6` : "已终止"}</span>
      </div>
    </article>`;
}

function allPrescriptionsPageMarkup(user, reviewMode = false) {
  let items =
    user.role === "PATIENT"
      ? state.prescriptions.filter((item) => item.patientId === user.id)
      : user.role === "DOCTOR"
        ? state.prescriptions.filter((item) => item.doctorId === user.id)
        : state.prescriptions;
  if (reviewMode) items = items.filter((item) => item.status === RX_STATUS.PENDING_REVIEW);
  if (rxFilter !== "all") {
    const filterMap = {
      pharmacy: [RX_STATUS.PENDING_PHARMACY],
      pending: [RX_STATUS.PENDING_REVIEW],
      payment: [RX_STATUS.PENDING_PAYMENT],
      active: [RX_STATUS.DRAFT, RX_STATUS.PENDING_PHARMACY, RX_STATUS.PENDING_REVIEW, RX_STATUS.PENDING_PAYMENT, RX_STATUS.TRANSFERRED],
      draft: [RX_STATUS.DRAFT],
      transferred: [RX_STATUS.TRANSFERRED],
      completed: [RX_STATUS.DISPENSED],
      void: [RX_STATUS.VOID],
    };
    items = items.filter((item) => filterMap[rxFilter]?.includes(item.status));
  }
  if (listQuery) {
    const query = listQuery.toLowerCase();
    items = items.filter((item) =>
      `${item.no} ${item.diagnosis} ${item.patientName} ${item.doctorName}`.toLowerCase().includes(query),
    );
  }
  items.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  const pendingCount = state.prescriptions.filter((item) => item.status === RX_STATUS.PENDING_REVIEW).length;
  const title = reviewMode ? "待审处方" : user.role === "DOCTOR" ? "处方管理" : user.role === "PHARMACIST" ? "处方流转" : user.role === "ADMIN" ? "处方管理" : "我的处方";
  const subtitle = reviewMode
    ? "核对过敏史、用药指征与潜在相互作用后作出审核结论。"
    : user.role === "DOCTOR"
      ? "从草稿到药师审核，清晰追踪每一张处方。"
      : user.role === "PHARMACIST"
        ? "查看全量处方的审核、流转和核销记录。"
        : user.role === "ADMIN"
          ? "查看平台全部处方及其审核、流转和核销状态。"
        : "实时查看审核结果、目标药房与取药进度。";
  return `
    ${pageHeading(
      title,
      subtitle,
      user.role === "DOCTOR"
        ? `<button class="btn btn-primary" data-action="new-prescription">${icon("plus", "icon-xs")} 新建处方</button>`
        : user.role === "PHARMACIST"
          ? `<span class="pill green">${pendingCount} 张待审核</span>`
          : user.role === "ADMIN"
            ? ""
          : `<button class="btn btn-secondary" data-action="navigate" data-page="consultations">${icon("message", "icon-xs")} 联系医生</button>`,
    )}
    ${
      reviewMode
        ? reviewBanner()
        : ""
    }
    <section class="card">
      <div class="toolbar">
        <div class="toolbar-search">
          ${icon("search")}
          <input type="search" value="${esc(listQuery)}" data-action="filter-prescriptions" placeholder="搜索处方编号、诊断或患者" />
        </div>
        <div class="filter-pills">
          <button class="filter-pill ${rxFilter === "all" ? "active" : ""}" data-action="rx-filter" data-value="all">全部</button>
          ${user.role === "DOCTOR" ? `<button class="filter-pill ${rxFilter === "draft" ? "active" : ""}" data-action="rx-filter" data-value="draft">待开具</button>` : ""}
          <button class="filter-pill ${rxFilter === "pharmacy" ? "active" : ""}" data-action="rx-filter" data-value="pharmacy">待选药房</button>
          <button class="filter-pill ${rxFilter === "pending" ? "active" : ""}" data-action="rx-filter" data-value="pending">待审核</button>
          <button class="filter-pill ${rxFilter === "payment" ? "active" : ""}" data-action="rx-filter" data-value="payment">待支付</button>
          <button class="filter-pill ${rxFilter === "transferred" ? "active" : ""}" data-action="rx-filter" data-value="transferred">已流转</button>
          <button class="filter-pill ${rxFilter === "completed" ? "active" : ""}" data-action="rx-filter" data-value="completed">已核销</button>
          <button class="filter-pill ${rxFilter === "void" ? "active" : ""}" data-action="rx-filter" data-value="void">已作废</button>
        </div>
      </div>
      <div class="card-pad">
        ${
          items.length
            ? `<div class="rx-grid">${items.map((rx) => rxCardMarkup(rx)).join("")}</div>`
            : emptyState("file", "没有找到处方", listQuery ? "尝试更换搜索关键词或筛选条件。" : "当前筛选条件下暂无处方记录。")
        }
      </div>
    </section>`;
}

function usersPageMarkup() {
  const query = listQuery.toLowerCase();
  const users = state.users.filter(
    (user) =>
      (userRoleFilter === "ALL" || user.role === userRoleFilter) &&
      `${user.realName} ${user.username} ${roleConfig[user.role]?.label}`.toLowerCase().includes(query),
  );
  return `
    ${pageHeading(
      "用户管理",
      `当前数据库共有 ${state.users.length} 个账号，账号状态与注册信息实时同步。`,
      `<button class="btn btn-secondary" data-action="export-users">${icon("download", "icon-xs")} 导出用户</button>`,
    )}
    <section class="card">
      <div class="toolbar">
        <div class="toolbar-search">${icon("search")}<input type="search" value="${esc(listQuery)}" data-action="filter-users" placeholder="搜索姓名、账号或角色" /></div>
        <div class="filter-pills">
          <button class="filter-pill ${userRoleFilter === "ALL" ? "active" : ""}" data-action="filter-role" data-value="ALL">全部账户</button>
          <button class="filter-pill ${userRoleFilter === "PATIENT" ? "active" : ""}" data-action="filter-role" data-value="PATIENT">患者</button>
          <button class="filter-pill ${userRoleFilter === "DOCTOR" ? "active" : ""}" data-action="filter-role" data-value="DOCTOR">医生</button>
          <button class="filter-pill ${userRoleFilter === "PHARMACIST" ? "active" : ""}" data-action="filter-role" data-value="PHARMACIST">药师</button>
        </div>
      </div>
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr><th>用户</th><th>账号</th><th>角色</th><th>联系方式</th><th>最近活跃</th><th>状态</th><th>操作</th></tr></thead>
          <tbody>
            ${users
              .map(
                (user) => `
                <tr>
                  <td><div class="table-person">${avatar(user, "small")}<div>${esc(user.realName)}<span>${esc(user.patientNo || user.doctorNo || user.pharmacistNo || "平台管理员")}</span></div></div></td>
                  <td>${esc(user.username)}</td>
                  <td><span class="pill ${user.role === "DOCTOR" ? "blue" : user.role === "PHARMACIST" ? "teal" : user.role === "ADMIN" ? "gray" : "green"}">${esc(roleConfig[user.role].label)}</span></td>
                  <td>${esc(user.phone)}</td>
                  <td>${dateTime(user.lastActive)}</td>
                  <td>${
                    user.approvalStatus === "pending"
                      ? '<span class="pill amber">待审核</span>'
                      : user.approvalStatus === "rejected"
                        ? '<span class="pill red">审核未通过</span>'
                        : `<span class="pill ${user.status === 1 ? "green" : "red"}">${user.status === 1 ? "正常" : "停用"}</span>`
                  }</td>
                  <td>${
                    user.approvalStatus === "pending"
                      ? `<button class="table-action" data-action="review-registration" data-id="${user.id}">审核资质</button>`
                      : `<button class="table-action" data-action="toggle-user" data-id="${user.id}">${user.status === 1 ? "停用" : "启用"}</button>${user.role === "PHARMACIST" ? ` <button class="table-action" data-action="assign-pharmacy" data-id="${user.id}">分配药房</button>` : ""}`
                  }</td>
                </tr>`,
              )
              .join("")}
          </tbody>
        </table>
      </div>
    </section>`;
}

function drugsPageMarkup() {
  const query = listQuery.toLowerCase();
  const drugs = state.drugs.filter((drug) =>
    `${drug.name} ${drug.code} ${drug.manufacturer} ${drug.approvalNo}`.toLowerCase().includes(query),
  );
  return `
    ${pageHeading(
      "药品目录",
      "统一维护药品规格、资质、价格与禁忌信息，供医生开方时选择。",
      `<button class="btn btn-primary" data-action="open-add-drug">${icon("plus", "icon-xs")} 新增药品</button>`,
    )}
    <div class="stat-grid">
      ${statCard("药品总数", String(state.drugs.length), "种", `其中启用 <strong>${state.drugs.filter((item) => item.enabled).length}</strong> 种`, "pill")}
      ${statCard("处方药", String(state.drugs.filter((item) => item.type === 1).length), "种", "开方需填写明确指征", "file", "amber")}
      ${statCard("库存预警", String(state.drugs.filter((item) => item.stock < 300).length), "种", "低于安全库存阈值", "alert", "coral")}
      ${statCard("资质校验", "100", "%", "国药准字号已核验", "shield", "blue")}
    </div>
    <section class="card">
      <div class="toolbar">
        <div class="toolbar-search">${icon("search")}<input type="search" value="${esc(listQuery)}" data-action="filter-drugs" placeholder="搜索药品名称、编号或厂家" /></div>
        <div class="filter-pills">
          <button class="filter-pill active">全部</button>
          <button class="filter-pill">处方药</button>
          <button class="filter-pill">非处方药</button>
        </div>
        <button class="btn btn-secondary btn-sm push-right" data-action="export-drugs">${icon("download", "icon-xs")} 导出目录</button>
      </div>
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr><th>药品</th><th>药品编号</th><th>类型</th><th>规格</th><th>单价</th><th>库存</th><th>状态</th><th>操作</th></tr></thead>
          <tbody>
            ${drugs
              .map(
                (drug) => `
                <tr>
                  <td><div class="table-person"><span class="mini-health-icon" style="width:30px;height:30px">${icon("pill", "icon-xs")}</span><div>${esc(drug.name)}<span>${esc(drug.manufacturer)}</span></div></div></td>
                  <td>${esc(drug.code)}</td>
                  <td><span class="pill ${drug.type === 1 ? "amber" : "green"}">${drug.type === 1 ? "处方药" : "非处方药"}</span></td>
                  <td>${esc(drug.spec)}</td>
                  <td>${formatCurrency(drug.price)}</td>
                  <td><span class="${drug.stock < 300 ? "text-danger" : ""}">${drug.stock}</span></td>
                  <td><span class="pill ${drug.enabled ? "green" : "gray"}">${drug.enabled ? "已启用" : "已停用"}</span></td>
                  <td><button class="table-action" data-action="toggle-drug" data-id="${drug.id}">${drug.enabled ? "停用" : "启用"}</button></td>
                </tr>`,
              )
              .join("")}
          </tbody>
        </table>
      </div>
    </section>`;
}

function pharmaciesPageMarkup() {
  const onlineCount = state.pharmacies.filter((pharmacy) => pharmacy.status === 1).length;
  return `
    ${pageHeading("合作药房", "合作药房由药师注册时填写的药房资料经管理员审核后自动建立，并同步其上传的药品目录。")}
    <div class="rx-grid">
      ${state.pharmacies
        .map(
          (pharmacy) => `
          <article class="card card-pad">
            <div class="rx-card-top">
              <div class="mini-health-icon" style="width:44px;height:44px">${icon("building")}</div>
              <span class="pill ${pharmacy.status ? "green" : "gray"}">${pharmacy.status ? "对接正常" : "已停用"}</span>
            </div>
            <h3 style="margin:15px 0 4px;font-size:15px">${esc(pharmacy.name)}</h3>
            <p class="muted text-small" style="margin-bottom:15px">${esc(pharmacy.code)} · ${esc(pharmacy.licenseNo)}</p>
            <div class="mini-health-item" style="padding-top:0"><span class="mini-health-icon">${icon("map", "icon-xs")}</span><div><strong>${esc(pharmacy.address)}</strong><span>${esc(pharmacy.distance)} · ${esc(pharmacy.hours)}</span></div></div>
            <div class="mini-health-item"><span class="mini-health-icon">${icon("pill", "icon-xs")}</span><div><strong>${pharmacy.catalog?.length || 0} 种药品在册</strong><span>${pharmacy.catalog?.filter((item) => item.enabled && Number(item.stock) > 0).length || 0} 种当前有库存</span></div></div>
            <div class="rx-card-foot">
              <span>${pharmacy.catalog?.length || 0} 种药品 · ${pharmacy.inventoryUpdatedAt ? `库存更新于 ${dateTime(pharmacy.inventoryUpdatedAt)}` : "库存待更新"}</span>
              <button class="table-action" data-action="edit-pharmacy-inventory" data-id="${pharmacy.id}">更新库存</button>
              <button class="table-action text-danger" data-action="toggle-pharmacy" data-id="${pharmacy.id}">${pharmacy.status ? "停用药房" : "启用药房"}</button>
            </div>
          </article>`,
        )
        .join("")}
    </div>
    <section class="card" style="margin-top:20px">
      <div class="side-card-head"><div><h3>实际合作药房概览</h3><p class="text-small muted" style="margin:2px 0 0">数据来自药师注册审核和已同步药品目录</p></div><span class="pill ${onlineCount ? "green" : "gray"}">${onlineCount} 家在线</span></div>
      ${
        state.pharmacies.length
          ? `<div class="table-wrap"><table class="data-table"><thead><tr><th>药房</th><th>药品目录</th><th>当前有库存</th><th>关联药师</th><th>状态</th></tr></thead><tbody>${state.pharmacies
              .map((pharmacy) => {
                const pharmacists = state.users.filter(
                  (user) =>
                    user.role === "PHARMACIST" &&
                    user.pharmacyId === pharmacy.id &&
                    user.status === 1,
                );
                return `<tr><td>${esc(pharmacy.name)}<br><span class="muted text-small">${esc(pharmacy.code)}</span></td><td>${pharmacy.catalog?.length || 0} 种</td><td>${pharmacy.catalog?.filter((item) => item.enabled && Number(item.stock) > 0).length || 0} 种</td><td>${esc(pharmacists.map((item) => item.realName).join("、") || "暂无启用药师")}</td><td><span class="pill ${pharmacy.status ? "green" : "gray"}">${pharmacy.status ? "合作中" : "已停用"}</span></td></tr>`;
              })
              .join("")}</tbody></table></div>`
          : emptyState("building", "暂无合作药房", "药师注册提交药房资料并通过管理员审核后，合作药房会自动创建。")
      }
    </section>`;
}

function auditPageMarkup() {
  return `
    ${pageHeading(
      "操作记录",
      "查看登录、数据同步、资质审核和处方流转等关键操作。",
      `<button class="btn btn-secondary" data-action="refresh-audit">${icon("rotate", "icon-xs")} 刷新记录</button>`,
    )}
    <section class="card" id="audit-log-card">
      <div class="empty-state"><div class="empty-icon">${icon("activity", "icon-lg")}</div><h3>正在读取审计日志</h3><p>请稍候…</p></div>
    </section>`;
}

async function loadAuditLogsIntoPage() {
  const root = document.getElementById("audit-log-card");
  if (!root) return;
  try {
    const logs = await getAuditLogs(200);
    root.innerHTML = logs.length
      ? `<div class="table-wrap"><table class="data-table"><thead><tr><th>时间</th><th>操作账号</th><th>操作类型</th><th>详情</th><th>来源 IP</th></tr></thead><tbody>${logs
          .map((log) => {
            const user = state.users.find((item) => item.id === log.user_id);
            return `<tr><td>${dateTime(log.created_at)}</td><td>${esc(user?.realName || log.user_id || "系统")}</td><td><span class="pill teal">${esc(log.action)}</span></td><td>${esc(log.detail || "—")}</td><td>${esc(log.ip || "—")}</td></tr>`;
          })
          .join("")}</tbody></table></div>`
      : emptyState("activity", "暂无操作记录", "系统关键操作会记录在这里。");
  } catch (error) {
    root.innerHTML = emptyState("alert", "操作记录读取失败", error.message || "请稍后重试");
  }
}

function profilePageMarkup(user) {
  if (user.role === "ADMIN") {
    return `
      ${pageHeading("系统设置", "管理平台通用设置、安全策略与数据维护。")}
      <div class="profile-layout">
        <section class="card profile-card">
          ${avatar(user, "large")}
          <h3>${esc(user.realName)}</h3>
          <p>${esc(user.title)}</p>
          <span class="pill green">超级管理员</span>
          <div class="profile-meta">
            <div><span>账号</span><strong>${esc(user.username)}</strong></div>
            <div><span>最近登录</span><strong>${dateTime(user.lastActive)}</strong></div>
            <div><span>安全等级</span><strong>高</strong></div>
            <div><span>访问范围</span><strong>全平台</strong></div>
          </div>
        </section>
        <div class="stack-sm">
          <section class="card card-pad">
            <div class="section-head"><div><h3>安全与隐私</h3><p>当前已启用的数据保护能力</p></div><span class="pill green">已保护</span></div>
            <div class="settings-row"><span class="quick-icon">${icon("lock", "icon-xs")}</span><div class="settings-copy"><strong>敏感字段加密</strong><span>手机号、证件号与病史字段加密存储</span></div><label class="switch"><input type="checkbox" checked /><span></span></label></div>
            <div class="settings-row"><span class="quick-icon">${icon("shield", "icon-xs")}</span><div class="settings-copy"><strong>角色访问控制</strong><span>RBAC 四角色权限隔离</span></div><label class="switch"><input type="checkbox" checked /><span></span></label></div>
            <div class="settings-row"><span class="quick-icon">${icon("activity", "icon-xs")}</span><div class="settings-copy"><strong>操作审计日志</strong><span>记录处方关键状态变更</span></div><label class="switch"><input type="checkbox" checked /><span></span></label></div>
          </section>
          <section class="card card-pad">
            <div class="section-head"><div><h3>数据重置</h3><p>重置后仅保留管理员账号和平台基础配置</p></div></div>
            <div class="risk-alert"><span>${icon("alert", "icon-xs")}</span><div><strong>此操作会清除当前业务数据</strong><p>请确认不再需要当前用户、问诊、处方和审核记录。</p></div></div>
            <button class="btn btn-secondary" style="margin-top:14px" data-action="reset-demo">${icon("rotate", "icon-xs")} 重置系统数据</button>
          </section>
        </div>
      </div>`;
  }
  const extra =
    user.role === "PATIENT"
      ? [
          ["身份证号", user.idCardMasked || "未登记"],
          ["出生日期", user.birthDate || "未填写"],
          ["血型", user.bloodType],
          ["过敏记录", user.allergy],
          ["既往病史", user.medicalHistory],
          ["常用地址", user.address || "未填写"],
          ["档案更新", dateTime(user.profileUpdatedAt || user.lastActive)],
          ["最近活跃", dateTime(user.lastActive)],
        ]
      : user.role === "PHARMACIST"
        ? [
          ["执业编号", user.pharmacistNo],
          ["所属药房", user.pharmacyName || user.hospital || "未关联"],
          ["药房地址", user.pharmacyAddress || "未填写"],
          ["经营许可证", user.pharmacyLicenseNo || "未填写"],
          ["药品目录", `${state.pharmacies.find((item) => item.id === user.pharmacyId)?.catalog?.length || 0} 种`],
          ["最近更新", dateTime(user.reviewedAt || user.lastActive)],
        ]
        : [
          ["执业编号", user.doctorNo || user.pharmacistNo],
          ["所属科室", user.department || "未填写"],
          ["专业领域", user.specialty || "未填写"],
          ["最近更新", dateTime(user.reviewedAt || user.lastActive)],
        ];
  return `
    ${pageHeading(user.role === "PATIENT" ? "健康档案" : "个人资料", user.role === "PATIENT" ? "完善健康信息，帮助医生与药师做出更安全的判断。" : "管理执业资料与工作偏好。", user.role === "PATIENT" ? `<button class="btn btn-secondary" data-action="open-edit-profile">${icon("edit", "icon-xs")} 修改资料</button>` : "")}
    <div class="profile-layout">
      <section class="card profile-card">
        ${avatar(user, "large")}
        <h3>${esc(user.realName)}</h3>
        <p>${esc(user.title || user.patientNo)}</p>
        <span class="pill green">${user.role === "PATIENT" ? "健康档案已完善" : "执业资质已认证"}</span>
        <div class="profile-meta">
          <div><span>性别</span><strong>${esc(user.gender || "—")}</strong></div>
          <div><span>年龄</span><strong>${user.age ? `${user.age} 岁` : "—"}</strong></div>
          <div><span>手机号</span><strong>${esc(user.phone)}</strong></div>
          <div><span>编号</span><strong>${esc(user.patientNo || user.doctorNo || user.pharmacistNo)}</strong></div>
        </div>
      </section>
      <div class="stack">
        <section class="card card-pad">
          <div class="section-head"><div><h3>${user.role === "PATIENT" ? "核心健康信息" : "执业信息"}</h3><p>以上信息将用于问诊与用药安全校验</p></div><span class="pill teal">${icon("shield", "icon-xs")} 加密保护</span></div>
          <div class="detail-list">${extra.map(([label, value]) => `<div class="detail-item"><span>${esc(label)}</span><strong>${esc(value)}</strong></div>`).join("")}</div>
          ${user.role === "PATIENT" ? `<div class="risk-alert" style="margin-top:16px"><span>${icon("alert", "icon-xs")}</span><div><strong>重要过敏提示</strong><p>${esc(user.allergy)}。医生开方与药师审核时将自动显示该记录。</p></div></div>` : ""}
        </section>
        <section class="card card-pad">
          <div class="section-head"><div><h3>通知与隐私</h3><p>控制你接收的服务消息</p></div></div>
          <div class="settings-row"><span class="quick-icon">${icon("bell", "icon-xs")}</span><div class="settings-copy"><strong>问诊消息提醒</strong><span>医生回复与审核结果将及时通知</span></div><label class="switch"><input type="checkbox" checked /><span></span></label></div>
          <div class="settings-row"><span class="quick-icon">${icon("pill", "icon-xs")}</span><div class="settings-copy"><strong>用药提醒</strong><span>处方通过审核后提醒取药</span></div><label class="switch"><input type="checkbox" checked /><span></span></label></div>
          <div class="settings-row"><span class="quick-icon">${icon("lock", "icon-xs")}</span><div class="settings-copy"><strong>隐藏敏感信息</strong><span>截图与导出时自动脱敏</span></div><label class="switch"><input type="checkbox" checked /><span></span></label></div>
        </section>
      </div>
    </div>`;
}

function renderPage(user) {
  switch (activePage) {
    case "overview":
      if (user.role === "PATIENT") return patientOverviewMarkup(user);
      if (user.role === "DOCTOR") return doctorOverviewMarkup(user);
      if (user.role === "PHARMACIST") return pharmacistOverviewMarkup(user);
      return adminOverviewMarkup(user);
    case "triage":
      return triagePageMarkup(user);
    case "consultations":
      return consultationsPageMarkup(user);
    case "prescriptions":
      return allPrescriptionsPageMarkup(user);
    case "review":
      return allPrescriptionsPageMarkup(user, true);
    case "consultations-admin":
      return adminConsultationsPageMarkup();
    case "registrations":
      return registrationsPageMarkup();
    case "users":
      return usersPageMarkup();
    case "drugs":
      return drugsPageMarkup();
    case "pharmacies":
      return pharmaciesPageMarkup();
    case "audit":
      return auditPageMarkup();
    case "profile":
      return profilePageMarkup(user);
    default:
      return emptyState("home", "页面不存在", "返回首页继续使用灵枢。");
  }
}

function showToast(message, type = "success") {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icon(type === "error" ? "alert" : "check", "icon-xs")}</span>
    <span>${esc(message)}</span>`;
  toastRoot.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(8px)";
    setTimeout(() => toast.remove(), 200);
  }, 3200);
}

function closeModal() {
  modalRoot.innerHTML = "";
  selectedRxId = null;
  editorState = null;
  registrationDraft = null;
  selectedRegistrationId = null;
  passwordResetDraft = null;
  patientPharmacySelection = null;
  if (smsResendTimer) {
    clearInterval(smsResendTimer);
    smsResendTimer = null;
  }
}

function openRegistration() {
  registrationDraft = {
    step: 1,
    role: "PATIENT",
    username: "",
    password: "",
    confirmPassword: "",
    smsCode: "",
    codeSent: false,
    devCode: "",
    phoneVerified: false,
    verifiedPhone: "",
    realName: "",
    idCard: "",
    phone: "",
    gender: "未填写",
    age: "",
    address: "",
    mapLocation: null,
    institution: "",
    department: "",
    title: "",
    specialty: "",
    yearsExperience: "",
    licenseNo: "",
    pharmacyName: "",
    pharmacyAddress: "",
    pharmacyPhone: "",
    pharmacyLicenseNo: "",
    pharmacyMapLocation: null,
    catalogFileName: "",
    catalogFileType: "",
    drugCatalog: [],
    documentName: "",
    documentType: "",
    documentData: "",
    accepted: false,
    success: false,
    requiresApproval: false,
    error: "",
  };
  modalRoot.innerHTML = registrationMarkup();
}

function registrationStepsMarkup() {
  const labels = ["选择身份", "账号信息", registrationDraft.role === "PATIENT" ? "确认注册" : "资格材料"];
  return `
    <div class="registration-steps">
      ${labels
        .map(
          (label, index) => `
          <div class="registration-step ${registrationDraft.step > index + 1 ? "done" : ""} ${registrationDraft.step === index + 1 ? "current" : ""}">
            <span>${registrationDraft.step > index + 1 ? icon("check", "icon-xs") : index + 1}</span>
            <strong>${esc(label)}</strong>
          </div>`,
        )
        .join("")}
    </div>`;
}

function roleRegistrationCard(role, iconName, title, description) {
  return `
    <button type="button" class="registration-role ${registrationDraft.role === role ? "active" : ""}" data-action="registration-role" data-value="${role}">
      <span class="registration-role-icon">${icon(iconName)}</span>
      <strong>${esc(title)}</strong>
      <span>${esc(description)}</span>
      ${registrationDraft.role === role ? `<i>${icon("check", "icon-xs")}</i>` : ""}
    </button>`;
}

function registrationLocationPickerMarkup(target, location = null) {
  const toPoint = (value) => ({
    x: 44 + Number(value.x) * 63,
    y: 34 + Number(value.y) * 28,
  });
  const selectedPoint = location ? toPoint(location) : null;
  return `
    <div class="form-field full">
      <label>${target === "pharmacy" ? "在地图中标记药房位置" : "在地图中标记常用位置"}<span class="required">*</span></label>
      <div class="location-picker">
        <svg class="registration-location-map" viewBox="0 0 720 330" data-action="pick-registration-location" data-location-target="${target}" role="img" aria-label="点击地图选择${target === "pharmacy" ? "药房" : "家庭"}位置">
          <title>点击地图选择位置</title>
          <rect class="map-ground" x="18" y="16" width="684" height="298" rx="20" />
          <g class="map-roads">
            <path d="M70 56H650M70 142H650M70 228H650M160 38V292M330 38V292M500 38V292M620 38V292" />
            <path class="map-road-main" d="M42 186H678M405 30V306" />
          </g>
          ${registrationMapPlaces
            .map((place) => {
              const point = toPoint(place.location);
              if (place.type === "hospital") {
                return `<g class="map-hospital" transform="translate(${point.x} ${point.y})"><rect x="-11" y="-11" width="22" height="22" rx="6"/><path d="M-5 0H5M0-5V5"/></g><text class="map-label map-label-hospital" x="${point.x + 16}" y="${point.y + 4}">${esc(place.name)}</text>`;
              }
              return `<g class="map-pharmacy" transform="translate(${point.x} ${point.y})"><circle r="10"/><text x="0" y="4">药</text></g><text class="map-label" x="${point.x + 15}" y="${point.y - 10}">${esc(place.name)}</text>`;
            })
            .join("")}
          ${
            selectedPoint
              ? `<g class="location-picked" transform="translate(${selectedPoint.x} ${selectedPoint.y})"><circle r="15"/><circle r="6"/><path d="M-7-7 7 7M7-7-7 7"/></g><text class="map-label map-label-current" x="${selectedPoint.x + 17}" y="${selectedPoint.y + 19}">已选位置</text>`
              : `<text class="location-picker-hint" x="360" y="308" text-anchor="middle">点击地图标记位置</text>`
          }
        </svg>
        <div class="location-picker-copy">
          <strong>${location ? `已选坐标：X ${location.x.toFixed(1)} / Y ${location.y.toFixed(1)}` : "尚未选择地图位置"}</strong>
          <span>点击地图任意位置即可标记。坐标用于后续计算患者与药房距离。</span>
          <button type="button" class="btn btn-secondary btn-sm" data-action="clear-registration-location" data-location-target="${target}">清除选点</button>
        </div>
      </div>
    </div>`;
}

function registrationMarkup() {
  const draft = registrationDraft;
  if (!draft) return "";
  const professional = draft.role !== "PATIENT";
  return `
    <div class="modal-backdrop" data-action="backdrop-close">
      <section class="modal registration-modal ${draft.success ? "narrow" : "wide"}" role="dialog" aria-modal="true" aria-labelledby="registration-title">
        <header class="modal-head">
          <div class="mini-health-icon" style="width:40px;height:40px">${icon(draft.success ? "checkCircle" : "user")}</div>
          <div class="modal-head-copy">
            <h2 id="registration-title">${draft.success ? (draft.requiresApproval ? "注册申请已提交" : "账号创建成功") : "创建灵枢账号"}</h2>
            <p>${draft.success ? "请留意账号状态通知" : "管理员账号由平台预置，无需注册"}</p>
          </div>
          <button class="icon-btn" data-action="close-modal" aria-label="关闭">${icon("x")}</button>
        </header>
        <div class="modal-body">
          ${
            draft.success
              ? `
                <div class="registration-success">
                  <div class="registration-success-icon">${icon(draft.requiresApproval ? "clock" : "checkCircle", "icon-lg")}</div>
                  <h3>${draft.requiresApproval ? "资质材料已进入审核队列" : "患者账号创建成功"}</h3>
                  <p>${draft.requiresApproval ? "管理员将核对你的执业机构、资格证书和上传材料。审核通过后，即可使用刚才创建的账号登录医生或药师工作台。" : "现在可以使用刚创建的账号登录灵枢，开始在线问诊。"}</p>
                  <div class="registration-result-box">
                    <span>登录账号</span><strong>${esc(draft.username)}</strong>
                    <span>当前状态</span><strong>${draft.requiresApproval ? "待资质审核" : "正常可用"}</strong>
                  </div>
                  <button class="btn btn-primary btn-block" data-action="registration-return-login">返回登录</button>
                </div>`
              : `
                ${registrationStepsMarkup()}
                ${
                  draft.step === 1
                    ? `
                      <div class="registration-panel">
                        <div class="registration-panel-title"><span>01</span><div><h3>选择你的身份</h3><p>不同身份对应不同的注册资料与权限。</p></div></div>
                        <div class="registration-role-grid">
                          ${roleRegistrationCard("PATIENT", "user", "患者", "注册后可立即使用在线问诊与处方服务")}
                          ${roleRegistrationCard("DOCTOR", "stethoscope", "医生", "提交执业资质，管理员审核通过后可接诊开方")}
                          ${roleRegistrationCard("PHARMACIST", "shield", "药师", "提交药学资质，审核通过后进入审方中心")}
                        </div>
                        <div class="registration-admin-note">${icon("lock", "icon-xs")} 管理员账号由平台预置，不开放自助注册。</div>
                      </div>`
                    : draft.step === 2
                      ? `
                        <div class="registration-panel">
                          <div class="registration-panel-title"><span>02</span><div><h3>验证手机号并填写信息</h3><p>登录账号将在注册成功后由系统自动分配。</p></div></div>
                          <div class="registration-account-note">${icon("user", "icon-xs")} 系统将根据身份自动生成唯一的灵枢登录账号。</div>
                          <div class="form-grid">
                            <div class="form-field"><label>真实姓名<span class="required">*</span></label><input data-register-field="realName" value="${esc(draft.realName)}" placeholder="请输入真实姓名" /></div>
                            <div class="form-field"><label>身份证号<span class="required">*</span></label><input data-register-field="idCard" value="${esc(draft.idCard)}" placeholder="18 位居民身份证号" inputmode="text" maxlength="18" autocomplete="off" /><span class="field-hint">系统会校验出生日期和校验码，仅保存不可逆摘要与脱敏号码。</span></div>
                            <div class="form-field full">
                              <label>手机号<span class="required">*</span></label>
                              <div class="verification-field">
                                <input data-register-field="phone" value="${esc(draft.phone)}" placeholder="11 位手机号" inputmode="numeric" />
                                <button type="button" class="btn btn-secondary btn-sm" data-action="send-register-code">${draft.codeSent ? "重新发送" : "获取验证码"}</button>
                              </div>
                            </div>
                            <div class="form-field full">
                              <label>短信验证码<span class="required">*</span></label>
                              <div class="verification-field">
                                <input data-register-field="smsCode" value="${esc(draft.smsCode)}" placeholder="输入 6 位验证码" inputmode="numeric" maxlength="6" />
                                <button type="button" class="btn ${draft.phoneVerified ? "btn-soft" : "btn-secondary"} btn-sm" data-action="verify-register-code">${draft.phoneVerified ? `${icon("check", "icon-xs")} 已验证` : "验证手机号"}</button>
                              </div>
                              ${draft.devCode ? `<span class="demo-code-note">本地测试验证码：<strong>${esc(draft.devCode)}</strong>（生产环境将通过短信发送）</span>` : ""}
                            </div>
                            <div class="form-field full"><label>常用地址<span class="required">*</span></label><input data-register-field="address" value="${esc(draft.address)}" placeholder="用于处方药房距离推荐，例如：上海市静安区某路 100 号" /></div>
                            ${draft.role === "PATIENT" ? registrationLocationPickerMarkup("patient", draft.mapLocation) : ""}
                            <div class="form-field"><label>性别</label><select data-register-field="gender"><option ${draft.gender === "未填写" ? "selected" : ""}>未填写</option><option ${draft.gender === "女" ? "selected" : ""}>女</option><option ${draft.gender === "男" ? "selected" : ""}>男</option></select></div>
                            <div class="form-field"><label>年龄</label><input data-register-field="age" value="${esc(draft.age)}" type="number" min="1" max="120" placeholder="选填" /></div>
                            <div class="form-field"><label>登录密码<span class="required">*</span></label><input data-register-field="password" value="${esc(draft.password)}" type="password" autocomplete="new-password" placeholder="至少 8 位" /></div>
                            <div class="form-field"><label>确认密码<span class="required">*</span></label><input data-register-field="confirmPassword" value="${esc(draft.confirmPassword)}" type="password" autocomplete="new-password" placeholder="再次输入密码" /></div>
                          </div>
                        </div>`
                      : `
                        <div class="registration-panel">
                          <div class="registration-panel-title"><span>03</span><div><h3>${professional ? "提交职业资质" : "确认注册信息"}</h3><p>${professional ? "医生与药师资料将在管理员审核通过后启用。" : "确认信息无误后即可创建账号。"}</p></div></div>
                          ${
                            professional
                              ? `
                                <div class="professional-notice">${icon("shield", "icon-xs")}<div><strong>资质审核说明</strong><span>请确保上传材料清晰、完整且与账号实名一致。审核期间账号暂不可登录。</span></div></div>
                                <div class="form-grid">
                                  ${
                                    draft.role === "DOCTOR"
                                      ? `
                                        <div class="form-field full"><label>执业机构<span class="required">*</span></label><input data-register-field="institution" value="${esc(draft.institution)}" placeholder="例如：灵枢互联网医院" /></div>
                                        <div class="form-field"><label>所属科室<span class="required">*</span></label><input data-register-field="department" value="${esc(draft.department)}" placeholder="例如：呼吸内科" /></div>
                                      `
                                      : `
                                        <div class="form-field full"><label>所属药房名称<span class="required">*</span></label><input data-register-field="pharmacyName" value="${esc(draft.pharmacyName)}" placeholder="例如：灵枢健康药房 · 静安店" /></div>
                                        <div class="form-field full"><label>药房地址<span class="required">*</span></label><input data-register-field="pharmacyAddress" value="${esc(draft.pharmacyAddress)}" placeholder="详细街道、门牌号" /></div>
                                        ${registrationLocationPickerMarkup("pharmacy", draft.pharmacyMapLocation)}
                                        <div class="form-field"><label>药房联系电话<span class="required">*</span></label><input data-register-field="pharmacyPhone" value="${esc(draft.pharmacyPhone || draft.phone)}" placeholder="药房电话" /></div>
                                        <div class="form-field"><label>药品经营许可证<span class="required">*</span></label><input data-register-field="pharmacyLicenseNo" value="${esc(draft.pharmacyLicenseNo)}" placeholder="经营许可证编号" /></div>
                                      `
                                  }
                                  <div class="form-field"><label>职称</label><input data-register-field="title" value="${esc(draft.title)}" placeholder="${draft.role === "DOCTOR" ? "主治医师 / 副主任医师" : "主管药师 / 执业药师"}" /></div>
                                  <div class="form-field"><label>资格证编号<span class="required">*</span></label><input data-register-field="licenseNo" value="${esc(draft.licenseNo)}" placeholder="执业资格证书编号" /></div>
                                  <div class="form-field"><label>从业年限</label><input data-register-field="yearsExperience" value="${esc(draft.yearsExperience)}" type="number" min="0" max="60" placeholder="年" /></div>
                                  <div class="form-field full"><label>${draft.role === "DOCTOR" ? "擅长领域" : "药学专长"}</label><input data-register-field="specialty" value="${esc(draft.specialty)}" placeholder="简要填写专业方向" /></div>
                                </div>
                                <div class="document-upload">
                                  <input type="file" id="registration-document" accept="image/png,image/jpeg,application/pdf" data-action="registration-document" />
                                  <label for="registration-document">
                                    <span>${icon(draft.documentName ? "checkCircle" : "file")}</span>
                                    <div><strong>${draft.documentName ? esc(draft.documentName) : "上传资格证书或执业证件"}</strong><small>${draft.documentName ? "材料已读取，可重新选择" : "支持 JPG、PNG、PDF，单个文件不超过 1.5MB"}</small></div>
                                  </label>
                                </div>
                                ${
                                  draft.role === "PHARMACIST"
                                    ? `
                                      <div class="document-upload">
                                        <input type="file" id="registration-catalog" accept=".xlsx,.csv" />
                                        <label for="registration-catalog">
                                          <span>${icon(draft.catalogFileName ? "checkCircle" : "file")}</span>
                                          <div><strong>${draft.catalogFileName ? esc(draft.catalogFileName) : "上传药品目录 Excel 表格"}</strong><small>${draft.drugCatalog.length ? `已解析 ${draft.drugCatalog.length} 种药品` : "支持 .xlsx 或 .csv，需包含药品编号、名称、规格、厂家、批准文号、类型、单价、库存"}</small></div>
                                        </label>
                                      </div>`
                                    : ""
                                }
                              `
                              : `
                                <div class="registration-summary-card">
                                  <div><span>身份</span><strong>患者</strong></div>
                                  <div><span>登录账号</span><strong>注册成功后自动分配</strong></div>
                                  <div><span>姓名</span><strong>${esc(draft.realName)}</strong></div>
                                  <div><span>身份证号</span><strong>${esc(validateResidentIdCard(draft.idCard).masked || "—")}</strong></div>
                                  <div><span>手机号</span><strong>${esc(draft.phone)}</strong></div>
                                </div>
                                <div class="professional-notice">${icon("shield", "icon-xs")}<div><strong>隐私保护</strong><span>健康信息仅用于问诊、处方审核与平台安全校验。</span></div></div>`
                          }
                          <label class="registration-consent"><input type="checkbox" data-register-field="accepted" ${draft.accepted ? "checked" : ""} /><span>我已阅读并同意灵枢用户协议与隐私政策，确认提交信息真实有效。</span></label>
                        </div>`
                }
                <div class="form-error ${draft.error ? "show" : ""}" id="registration-error">${esc(draft.error)}</div>
                <div class="registration-actions">
                  ${draft.step > 1 ? `<button class="btn btn-secondary" data-action="registration-back">上一步</button>` : `<span></span>`}
                  ${
                    draft.step < 3
                      ? `<button class="btn btn-primary" data-action="registration-next">下一步 ${icon("arrow", "icon-xs")}</button>`
                      : `<button class="btn btn-primary" data-action="submit-registration">${icon("checkCircle", "icon-xs")} 提交注册</button>`
                  }
                </div>`
          }
        </div>
      </section>
    </div>`;
}

function syncRegistrationDraft() {
  if (!registrationDraft) return;
  document.querySelectorAll("[data-register-field]").forEach((field) => {
    const key = field.dataset.registerField;
    registrationDraft[key] = field.type === "checkbox" ? field.checked : field.value;
  });
}

function validateRegistrationAccount() {
  syncRegistrationDraft();
  const draft = registrationDraft;
  if (draft.realName.trim().length < 2) return "请填写真实姓名";
  draft.idCard = String(draft.idCard || "").trim().toUpperCase();
  const identity = validateResidentIdCard(draft.idCard);
  if (!identity.valid) return identity.reason;
  if (!/^1\d{10}$/.test(draft.phone)) return "请输入 11 位手机号";
  if (draft.address.trim().length < 5) return "请填写用于药房推荐的常用地址";
  if (draft.role === "PATIENT" && !draft.mapLocation) {
    return "请在地图中标记你的常用位置";
  }
  if (draft.password.length < 8) return "密码至少需要 8 位";
  if (draft.password !== draft.confirmPassword) return "两次输入的密码不一致";
  return "";
}

function startSmsCountdown() {
  if (smsResendTimer) clearInterval(smsResendTimer);
  let seconds = 60;
  const buttons = document.querySelectorAll('[data-action="send-register-code"], [data-action="send-reset-code"]');
  buttons.forEach((button) => {
    button.disabled = true;
    button.dataset.originalText = button.textContent;
    button.textContent = `${seconds}s 后重发`;
  });
  smsResendTimer = setInterval(() => {
    seconds -= 1;
    document
      .querySelectorAll('[data-action="send-register-code"], [data-action="send-reset-code"]')
      .forEach((button) => {
        button.textContent = seconds > 0 ? `${seconds}s 后重发` : button.dataset.originalText || "重新获取";
        if (seconds <= 0) {
          button.disabled = false;
          button.dataset.originalText = "";
        }
      });
    if (seconds <= 0) {
      clearInterval(smsResendTimer);
      smsResendTimer = null;
    }
  }, 1000);
}

async function sendRegistrationCode() {
  syncRegistrationDraft();
  if (!/^1\d{10}$/.test(registrationDraft.phone)) {
    registrationDraft.error = "请先填写正确的 11 位手机号";
    modalRoot.innerHTML = registrationMarkup();
    return;
  }
  try {
    const result = await sendPhoneVerificationCode(registrationDraft.phone, "register");
    registrationDraft.codeSent = true;
    registrationDraft.devCode = result.devCode || "";
    registrationDraft.phoneVerified = false;
    registrationDraft.verifiedPhone = "";
    registrationDraft.error = "";
    modalRoot.innerHTML = registrationMarkup();
    startSmsCountdown();
    showToast(result.devCode ? `短信已发送，本地测试验证码：${result.devCode}` : "验证码已发送");
  } catch (error) {
    registrationDraft.error = error.message || "验证码发送失败";
    modalRoot.innerHTML = registrationMarkup();
  }
}

async function verifyRegistrationPhone(silent = false) {
  syncRegistrationDraft();
  if (!/^1\d{10}$/.test(registrationDraft.phone)) {
    registrationDraft.error = "请填写正确的 11 位手机号";
    modalRoot.innerHTML = registrationMarkup();
    return false;
  }
  if (!/^\d{6}$/.test(registrationDraft.smsCode)) {
    registrationDraft.error = "请输入 6 位短信验证码";
    modalRoot.innerHTML = registrationMarkup();
    return false;
  }
  try {
    await verifyPhoneVerificationCode(registrationDraft.phone, "register", registrationDraft.smsCode);
    registrationDraft.phoneVerified = true;
    registrationDraft.verifiedPhone = registrationDraft.phone;
    registrationDraft.error = "";
    modalRoot.innerHTML = registrationMarkup();
    if (!silent) showToast("手机号验证成功");
    return true;
  } catch (error) {
    registrationDraft.phoneVerified = false;
    registrationDraft.error = error.message || "验证码验证失败";
    modalRoot.innerHTML = registrationMarkup();
    return false;
  }
}

async function handleRegistrationNext() {
  if (registrationDraft.step === 1) {
    registrationDraft.step = 2;
    registrationDraft.error = "";
    modalRoot.innerHTML = registrationMarkup();
    return;
  }
  if (registrationDraft.step === 2) {
    const error = validateRegistrationAccount();
    if (error) {
      registrationDraft.error = error;
      modalRoot.innerHTML = registrationMarkup();
      return;
    }
    if (!registrationDraft.phoneVerified || registrationDraft.verifiedPhone !== registrationDraft.phone) {
      const verified = await verifyRegistrationPhone(true);
      if (!verified) return;
    }
    registrationDraft.step = 3;
    registrationDraft.error = "";
    modalRoot.innerHTML = registrationMarkup();
  }
}

function handleRegistrationBack() {
  syncRegistrationDraft();
  registrationDraft.step = Math.max(1, registrationDraft.step - 1);
  registrationDraft.error = "";
  modalRoot.innerHTML = registrationMarkup();
}

async function handleRegistrationFile(input) {
  const file = input.files?.[0];
  if (!file) return;
  syncRegistrationDraft();
  if (!["image/jpeg", "image/png", "application/pdf"].includes(file.type)) {
    registrationDraft.error = "仅支持 JPG、PNG 或 PDF 格式";
    modalRoot.innerHTML = registrationMarkup();
    return;
  }
  if (file.size > 1.5 * 1024 * 1024) {
    registrationDraft.error = "资质材料不能超过 1.5MB";
    modalRoot.innerHTML = registrationMarkup();
    return;
  }
  const data = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("读取资质材料失败"));
    reader.readAsDataURL(file);
  }).catch((error) => {
    registrationDraft.error = error.message;
    return "";
  });
  registrationDraft.documentName = file.name;
  registrationDraft.documentType = file.type;
  registrationDraft.documentData = data;
  modalRoot.innerHTML = registrationMarkup();
}

function parseCsvCatalog(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (char === '"' && quoted && next === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell);
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  row.push(cell);
  if (row.some((value) => value.trim())) rows.push(row);
  return rows;
}

async function inflateZipEntry(bytes) {
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function readXlsxEntries(buffer) {
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);
  let eocd = -1;
  for (let offset = bytes.length - 22; offset >= Math.max(0, bytes.length - 65557); offset -= 1) {
    if (view.getUint32(offset, true) === 0x06054b50) {
      eocd = offset;
      break;
    }
  }
  if (eocd < 0) throw new Error("Excel 文件结构无效");
  const entryCount = view.getUint16(eocd + 10, true);
  let central = view.getUint32(eocd + 16, true);
  const decoder = new TextDecoder();
  const entries = {};
  for (let index = 0; index < entryCount; index += 1) {
    if (view.getUint32(central, true) !== 0x02014b50) break;
    const method = view.getUint16(central + 10, true);
    const compressedSize = view.getUint32(central + 20, true);
    const nameLength = view.getUint16(central + 28, true);
    const extraLength = view.getUint16(central + 30, true);
    const commentLength = view.getUint16(central + 32, true);
    const localOffset = view.getUint32(central + 42, true);
    const name = decoder.decode(bytes.slice(central + 46, central + 46 + nameLength));
    if (["xl/sharedStrings.xml", "xl/worksheets/sheet1.xml"].includes(name)) {
      const localNameLength = view.getUint16(localOffset + 26, true);
      const localExtraLength = view.getUint16(localOffset + 28, true);
      const start = localOffset + 30 + localNameLength + localExtraLength;
      const compressed = bytes.slice(start, start + compressedSize);
      entries[name] = method === 0 ? compressed : await inflateZipEntry(compressed);
    }
    central += 46 + nameLength + extraLength + commentLength;
  }
  return {
    sheet: decoder.decode(entries["xl/worksheets/sheet1.xml"] || new Uint8Array()),
    shared: decoder.decode(entries["xl/sharedStrings.xml"] || new Uint8Array()),
  };
}

function parseXlsxRows({ sheet, shared }) {
  const parser = new DOMParser();
  const sharedDoc = parser.parseFromString(shared || "<sst></sst>", "application/xml");
  const sharedStrings = [...sharedDoc.getElementsByTagName("si")].map((item) =>
    [...item.getElementsByTagName("t")].map((text) => text.textContent || "").join(""),
  );
  const sheetDoc = parser.parseFromString(sheet, "application/xml");
  const rows = [];
  for (const row of [...sheetDoc.getElementsByTagName("row")]) {
    const values = [];
    for (const cell of [...row.getElementsByTagName("c")]) {
      const reference = cell.getAttribute("r") || "A1";
      const letters = reference.match(/[A-Z]+/)?.[0] || "A";
      const column = [...letters].reduce(
        (total, letter) => total * 26 + letter.charCodeAt(0) - 64,
        0,
      ) - 1;
      const type = cell.getAttribute("t");
      let value = "";
      if (type === "inlineStr") {
        value = [...cell.getElementsByTagName("t")].map((item) => item.textContent || "").join("");
      } else {
        const raw = cell.getElementsByTagName("v")[0]?.textContent || "";
        value = type === "s" ? sharedStrings[Number(raw)] || "" : raw;
      }
      values[column] = value;
    }
    if (values.some((value) => String(value || "").trim())) rows.push(values);
  }
  return rows;
}

function normalizeDrugCatalogRows(rows) {
  if (!rows.length) return [];
  const aliases = {
    code: ["药品编号", "编号", "编码", "drugcode"],
    name: ["药品名称", "名称", "name"],
    spec: ["规格", "包装规格", "spec"],
    manufacturer: ["生产厂家", "厂家", "manufacturer"],
    approvalNo: ["批准文号", "国药准字", "approvalno"],
    type: ["药品类型", "类型", "type"],
    price: ["单价", "价格", "单价（元）", "price"],
    stock: ["库存", "数量", "stock"],
    contraindication: ["禁忌与注意事项", "禁忌", "注意事项", "contraindication"],
  };
  const headers = rows[0].map((header) => String(header || "").trim().toLowerCase());
  const indexes = {};
  for (const [key, names] of Object.entries(aliases)) {
    indexes[key] = headers.findIndex((header) =>
      names.some((name) => header === name.toLowerCase() || header.includes(name.toLowerCase())),
    );
  }
  if (indexes.name < 0) throw new Error("药品目录缺少“药品名称”列");
  return rows
    .slice(1)
    .map((row) => {
      const get = (key) => (indexes[key] >= 0 ? String(row[indexes[key]] || "").trim() : "");
      return {
        code: get("code") || `DRG-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
        name: get("name"),
        spec: get("spec"),
        manufacturer: get("manufacturer"),
        approvalNo: get("approvalNo"),
        type: get("type"),
        price: Number(get("price")) || 0,
        stock: Number(get("stock")) || 0,
        contraindication: get("contraindication"),
      };
    })
    .filter((item) => item.name);
}

async function handlePharmacyCatalogFile(input) {
  const file = input.files?.[0];
  if (!file) return;
  syncRegistrationDraft();
  try {
    let rows;
    if (file.name.toLowerCase().endsWith(".csv")) {
      rows = parseCsvCatalog(await file.text());
    } else if (file.name.toLowerCase().endsWith(".xlsx")) {
      rows = parseXlsxRows(await readXlsxEntries(await file.arrayBuffer()));
    } else {
      throw new Error("请上传 .xlsx 或 .csv 格式的药品目录");
    }
    const drugCatalog = normalizeDrugCatalogRows(rows);
    if (!drugCatalog.length) throw new Error("药品目录中没有有效数据");
    registrationDraft.drugCatalog = drugCatalog;
    registrationDraft.catalogFileName = file.name;
    registrationDraft.catalogFileType = file.type || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    registrationDraft.error = "";
    modalRoot.innerHTML = registrationMarkup();
    showToast(`已读取 ${drugCatalog.length} 种药品`);
  } catch (error) {
    registrationDraft.error = error.message || "药品目录解析失败";
    modalRoot.innerHTML = registrationMarkup();
  }
}

async function submitRegistrationFlow() {
  syncRegistrationDraft();
  const draft = registrationDraft;
  const accountError = validateRegistrationAccount();
  const error =
    accountError ||
    (!draft.phoneVerified || draft.verifiedPhone !== draft.phone ? "请先完成手机号验证" : "") ||
    (draft.role === "DOCTOR" && !draft.institution.trim() ? "请填写执业机构" : "") ||
    (draft.role === "DOCTOR" && !draft.department.trim() ? "请填写所属科室" : "") ||
    (draft.role === "PHARMACIST" && !draft.pharmacyName.trim() ? "请填写所属药房名称" : "") ||
    (draft.role === "PHARMACIST" && !draft.pharmacyAddress.trim() ? "请填写药房地址" : "") ||
    (draft.role === "PHARMACIST" && !draft.pharmacyMapLocation ? "请在地图中标记药房位置" : "") ||
    (draft.role === "PHARMACIST" && !draft.pharmacyLicenseNo.trim() ? "请填写药品经营许可证编号" : "") ||
    (draft.role === "PHARMACIST" && !draft.drugCatalog.length ? "请上传并解析药品目录 Excel" : "") ||
    (draft.role !== "PATIENT" && !draft.licenseNo.trim() ? "请填写资格证书编号" : "") ||
    (draft.role !== "PATIENT" && !draft.documentData ? "请上传资质材料" : "") ||
    (!draft.accepted ? "请阅读并同意用户协议与隐私政策" : "");
  if (error) {
    draft.error = error;
    modalRoot.innerHTML = registrationMarkup();
    return;
  }
  const button = document.querySelector('[data-action="submit-registration"]');
  if (button) {
    button.disabled = true;
    button.innerHTML = `${icon("activity", "icon-xs")} 正在提交…`;
  }
  try {
    const payload = {
      role: draft.role,
      password: draft.password,
      realName: draft.realName.trim(),
      idCard: draft.idCard.trim(),
      phone: draft.phone.trim(),
      smsCode: draft.smsCode.trim(),
      gender: draft.gender,
      age: Number(draft.age) || null,
      address: draft.address.trim(),
      mapLocation: draft.mapLocation,
    };
    if (draft.role !== "PATIENT") {
      if (
        draft.role === "PHARMACIST" &&
        (!draft.pharmacyName.trim() ||
          !draft.pharmacyAddress.trim() ||
          !draft.pharmacyLicenseNo.trim() ||
          !draft.drugCatalog.length)
      ) {
        throw new Error("请完整填写药房信息并上传可解析的药品目录 Excel");
      }
      payload.qualification = {
        institution: draft.role === "PHARMACIST" ? draft.pharmacyName.trim() : draft.institution.trim(),
        department: draft.role === "PHARMACIST" ? "药房" : draft.department.trim(),
        title: draft.title.trim(),
        specialty: draft.specialty.trim(),
        yearsExperience: Number(draft.yearsExperience) || 0,
        licenseNo: draft.licenseNo.trim(),
        documentName: draft.documentName,
        documentType: draft.documentType,
        documentData: draft.documentData,
        ...(draft.role === "PHARMACIST"
          ? {
              pharmacyName: draft.pharmacyName.trim(),
              pharmacyAddress: draft.pharmacyAddress.trim(),
              pharmacyPhone: draft.pharmacyPhone.trim(),
              pharmacyLicenseNo: draft.pharmacyLicenseNo.trim(),
              pharmacyMapLocation: draft.pharmacyMapLocation,
              catalogFileName: draft.catalogFileName,
              drugCatalog: draft.drugCatalog,
            }
          : {}),
      };
    }
    const result = await registerAccount(payload);
    draft.username = result.user.username;
    draft.success = true;
    draft.requiresApproval = Boolean(result.requiresApproval);
    draft.error = "";
    modalRoot.innerHTML = registrationMarkup();
  } catch (caught) {
    draft.error = caught.message || "注册失败，请稍后重试";
    modalRoot.innerHTML = registrationMarkup();
  }
}

function registrationsPageMarkup() {
  const registrations = state.registrations || [];
  const pending = registrations.filter((item) => item.status === "pending");
  const processed = registrations.filter((item) => item.status !== "pending");
  return `
    ${pageHeading(
      "账号审核",
      "审核医生和药师提交的执业资质。通过后账号自动启用。",
      `<span class="pill ${pending.length ? "amber" : "green"}">${pending.length ? `${pending.length} 条待审核` : "全部已处理"}</span>`,
    )}
    <div class="stat-grid">
      ${statCard("待审核申请", String(pending.length), "条", "医生与药师执业资质", "clock", "amber")}
      ${statCard("今日已通过", String(processed.filter((item) => item.status === "approved").length), "条", "账号已启用", "checkCircle")}
      ${statCard("审核未通过", String(processed.filter((item) => item.status === "rejected").length), "条", "已记录审核意见", "alert", "coral")}
      ${statCard("审核规范", "实名 + 证件", "", "双项材料核验", "shield", "blue")}
    </div>
    <section class="card">
      <div class="side-card-head"><div><h3>待审核申请</h3><p class="text-small muted" style="margin:2px 0 0">按提交时间排序，请核对姓名、执业机构与资格证书</p></div></div>
      <div class="table-wrap">
        ${
          pending.length
            ? `
              <table class="data-table">
                <thead><tr><th>申请人</th><th>申请角色</th><th>执业机构</th><th>资格证书编号</th><th>提交时间</th><th>状态</th><th>操作</th></tr></thead>
                <tbody>
                  ${pending
                    .map(
                      (item) => `
                      <tr>
                        <td><div class="table-person">${avatar({ realName: item.realName, role: item.role }, "small")}<div>${esc(item.realName)}<span>${esc(item.username)} · ${esc(item.phone)}</span></div></div></td>
                        <td><span class="pill ${item.role === "DOCTOR" ? "blue" : "teal"}">${item.role === "DOCTOR" ? "医生" : "药师"}</span></td>
                        <td>${esc(item.institution)}<br><span class="muted text-small">${esc(item.department || "—")}</span></td>
                        <td>${esc(item.licenseNo)}</td>
                        <td>${dateTime(item.submittedAt)}</td>
                        <td><span class="pill amber">待审核</span></td>
                        <td><button class="table-action" data-action="review-registration" data-id="${item.userId}">查看并审核</button></td>
                      </tr>`,
                    )
                    .join("")}
                </tbody>
              </table>`
            : emptyState("checkCircle", "暂无待审核申请", "医生或药师提交注册材料后，会出现在这里。")
        }
      </div>
    </section>
    ${
      processed.length
        ? `
        <section class="card" style="margin-top:20px">
          <div class="side-card-head"><h3>最近审核记录</h3></div>
          <div class="table-wrap">
            <table class="data-table">
              <thead><tr><th>申请人</th><th>角色</th><th>审核结果</th><th>审核时间</th><th>审核意见</th></tr></thead>
              <tbody>
                ${processed
                  .map(
                    (item) => `
                    <tr><td>${esc(item.realName)}</td><td>${item.role === "DOCTOR" ? "医生" : "药师"}</td><td><span class="pill ${item.status === "approved" ? "green" : "red"}">${item.status === "approved" ? "已通过" : "未通过"}</span></td><td>${dateTime(item.reviewedAt)}</td><td>${esc(item.reviewReason || "资质核验通过")}</td></tr>`,
                  )
                  .join("")}
              </tbody>
            </table>
          </div>
        </section>`
        : ""
    }`;
}

function registrationReviewModalMarkup(registration) {
  return `
    <div class="modal-backdrop" data-action="backdrop-close">
      <section class="modal wide" role="dialog" aria-modal="true" aria-labelledby="registration-review-title">
        <header class="modal-head">
          <div class="mini-health-icon" style="width:40px;height:40px">${icon("shield")}</div>
          <div class="modal-head-copy"><h2 id="registration-review-title">职业资质审核</h2><p>${esc(registration.realName)} · ${registration.role === "DOCTOR" ? "医生账号" : "药师账号"}</p></div>
          <span class="pill amber">待审核</span>
          <button class="icon-btn" data-action="close-modal" aria-label="关闭">${icon("x")}</button>
        </header>
        <div class="modal-body">
          <div class="patient-summary">
            <div><span>申请人</span><strong>${esc(registration.realName)}</strong></div>
            <div><span>登录账号</span><strong>${esc(registration.username)}</strong></div>
            <div><span>手机号</span><strong>${esc(registration.phone)}</strong></div>
            <div><span>申请角色</span><strong>${registration.role === "DOCTOR" ? "医生" : "药师"}</strong></div>
            <div><span>提交时间</span><strong>${dateTime(registration.submittedAt)}</strong></div>
            <div><span>从业年限</span><strong>${esc(registration.yearsExperience || 0)} 年</strong></div>
          </div>
          <div class="modal-section">
            <div class="modal-section-title"><span>执业信息</span></div>
            <div class="detail-list">
              <div class="detail-item"><span>执业机构</span><strong>${esc(registration.institution)}</strong></div>
              <div class="detail-item"><span>${registration.role === "DOCTOR" ? "所属科室" : "所属药房"}</span><strong>${esc(registration.department || "—")}</strong></div>
              <div class="detail-item"><span>职称</span><strong>${esc(registration.title || "—")}</strong></div>
              <div class="detail-item"><span>资格证编号</span><strong>${esc(registration.licenseNo)}</strong></div>
              <div class="detail-item"><span>专业方向</span><strong>${esc(registration.specialty || "—")}</strong></div>
              <div class="detail-item"><span>材料文件</span><strong>${esc(registration.documentName || "—")}</strong></div>
              ${registration.role === "PHARMACIST" ? `<div class="detail-item"><span>所属药房</span><strong>${esc(registration.pharmacyName || "—")}</strong></div><div class="detail-item"><span>药房地址</span><strong>${esc(registration.pharmacyAddress || "—")}</strong></div><div class="detail-item"><span>药品经营许可证</span><strong>${esc(registration.pharmacyLicenseNo || "—")}</strong></div><div class="detail-item"><span>药品目录</span><strong>${esc(registration.catalogFileName || "—")} · ${registration.drugCatalog?.length || 0} 种</strong></div>` : ""}
            </div>
            <button class="btn btn-secondary btn-block" style="margin-top:12px" data-action="preview-qualification" data-id="${registration.userId}">${icon("eye", "icon-xs")} 查看已上传资质材料</button>
            ${registration.role === "PHARMACIST" ? `<button class="btn btn-secondary btn-block" style="margin-top:8px" data-action="preview-drug-catalog" data-id="${registration.userId}">${icon("pill", "icon-xs")} 查看药品目录明细</button>` : ""}
          </div>
          <div class="modal-section">
            <div class="modal-section-title"><span>审核结论</span></div>
            <div class="review-radio">
              <label class="review-choice"><input type="radio" name="registration-decision" value="approve" checked />${icon("checkCircle", "icon-xs")} 通过并启用账号</label>
              <label class="review-choice"><input type="radio" name="registration-decision" value="reject" />${icon("x", "icon-xs")} 驳回申请</label>
            </div>
            <div class="form-field" style="margin-top:12px"><label for="registration-review-reason">审核意见</label><textarea id="registration-review-reason" style="min-height:76px" placeholder="通过时可选填；驳回时必须说明原因"></textarea></div>
            <label class="checkbox-line" style="margin-top:12px"><input type="checkbox" id="registration-review-confirm" /> 我已核对申请人实名信息、执业机构与资格证书</label>
            <div class="form-error" id="registration-review-error"></div>
          </div>
          <div class="modal-actions">
            <button class="btn btn-secondary" data-action="close-modal">取消</button>
            <button class="btn btn-primary" data-action="submit-registration-review" data-id="${registration.userId}">${icon("shield", "icon-xs")} 提交审核结论</button>
          </div>
        </div>
      </section>
    </div>`;
}

function openRegistrationReview(userId) {
  const registration = (state.registrations || []).find((item) => item.userId === userId);
  if (!registration) {
    showToast("未找到该注册申请", "error");
    return;
  }
  selectedRegistrationId = userId;
  modalRoot.innerHTML = registrationReviewModalMarkup(registration);
}

async function submitRegistrationReview(userId) {
  const decision = document.querySelector('input[name="registration-decision"]:checked')?.value;
  const reason = document.getElementById("registration-review-reason")?.value.trim() || "";
  const confirmed = document.getElementById("registration-review-confirm")?.checked;
  const error = document.getElementById("registration-review-error");
  if (!confirmed) {
    error.textContent = "请先确认已完成材料核验";
    error.classList.add("show");
    return;
  }
  if (decision === "reject" && !reason) {
    error.textContent = "驳回时必须填写审核意见";
    error.classList.add("show");
    return;
  }
  try {
    await reviewRegistration(userId, decision, reason);
    state = await loadState();
    closeModal();
    activePage = "registrations";
    render();
    showToast(decision === "approve" ? "资质审核通过，账号已启用" : "申请已驳回");
  } catch (caught) {
    error.textContent = caught.message || "审核失败";
    error.classList.add("show");
  }
}

async function previewQualification(userId) {
  try {
    const result = await getQualificationDocument(userId);
    const record = result.data;
    if (!record.documentData) {
      showToast("该申请没有可预览的电子材料", "error");
      return;
    }
    const content =
      record.documentType === "application/pdf"
        ? `<iframe class="qualification-preview-frame" src="${record.documentData}" title="资质材料 PDF"></iframe>`
        : `<img class="qualification-preview-image" src="${record.documentData}" alt="资质材料" />`;
    modalRoot.innerHTML = `
      <div class="modal-backdrop" data-action="backdrop-close">
        <section class="modal wide" role="dialog" aria-modal="true" aria-labelledby="qualification-preview-title">
          <header class="modal-head">
            <div class="modal-head-copy"><h2 id="qualification-preview-title">${esc(record.documentName)}</h2><p>${esc(record.institution)} · ${esc(record.licenseNo)}</p></div>
            <button class="icon-btn" data-action="close-modal" aria-label="关闭">${icon("x")}</button>
          </header>
          <div class="modal-body">${content}</div>
        </section>
      </div>`;
  } catch (error) {
    showToast(error.message || "无法读取资质材料", "error");
  }
}

function previewRegistrationDrugCatalog(userId) {
  const registration = (state.registrations || []).find((item) => item.userId === userId);
  if (!registration) return;
  const catalog = registration.drugCatalog || [];
  modalRoot.innerHTML = `
    <div class="modal-backdrop" data-action="backdrop-close">
      <section class="modal wide" role="dialog" aria-modal="true">
        <header class="modal-head">
          <div class="mini-health-icon" style="width:40px;height:40px">${icon("pill")}</div>
          <div class="modal-head-copy"><h2>药品目录审核</h2><p>${esc(registration.pharmacyName || "")} · ${catalog.length} 种药品</p></div>
          <button class="icon-btn" data-action="close-modal" aria-label="关闭">${icon("x")}</button>
        </header>
        <div class="modal-body">
          ${catalog.length ? `<div class="table-wrap"><table class="data-table"><thead><tr><th>编号</th><th>药品名称</th><th>规格</th><th>厂家</th><th>批准文号</th><th>类型</th><th>单价</th><th>库存</th><th>禁忌与注意事项</th></tr></thead><tbody>${catalog.map((drug) => `<tr><td>${esc(drug.code)}</td><td>${esc(drug.name)}</td><td>${esc(drug.spec)}</td><td>${esc(drug.manufacturer)}</td><td>${esc(drug.approvalNo)}</td><td>${esc(drug.type)}</td><td>${formatCurrency(drug.price)}</td><td>${esc(drug.stock)}</td><td>${esc(drug.contraindication || "暂无特别说明")}</td></tr>`).join("")}</tbody></table></div>` : emptyState("pill", "没有药品目录", "药师未上传有效目录。")}
          <div class="modal-actions"><button class="btn btn-primary" data-action="close-modal">关闭</button></div>
        </div>
      </section>
    </div>`;
}

function qualificationResubmitMarkup(user) {
  const registration =
    (state.registrations || []).find((item) => item.userId === user.id) || {};
  if (!qualificationResubmitDraft) {
    qualificationResubmitDraft = {
      institution: registration.institution || user.hospital || "",
      department: registration.department || user.department || "",
      title: registration.title || user.title || "",
      specialty: registration.specialty || user.specialty || "",
      yearsExperience: registration.yearsExperience || "",
      licenseNo: registration.licenseNo || user.licenseNo || "",
      pharmacyName: registration.pharmacyName || user.pharmacyName || "",
      pharmacyAddress: registration.pharmacyAddress || user.pharmacyAddress || "",
      pharmacyPhone: registration.pharmacyPhone || user.pharmacyPhone || "",
      pharmacyLicenseNo: registration.pharmacyLicenseNo || user.pharmacyLicenseNo || "",
      catalogFileName: registration.catalogFileName || "",
      drugCatalog: registration.drugCatalog || [],
      documentName: registration.documentName || "",
      documentType: registration.documentType || "",
      documentData: "",
      error: "",
    };
  }
  const draft = qualificationResubmitDraft;
  const professionalLabel = user.role === "DOCTOR" ? "医生" : "药师";
  return `
    <div class="resubmit-screen">
      <header class="resubmit-topbar">
        <div class="sidebar-brand">${brandMark()}<div class="brand-name">灵枢</div></div>
        <button class="btn btn-secondary btn-sm" data-action="logout">${icon("logout", "icon-xs")} 退出登录</button>
      </header>
      <main class="card resubmit-card">
        <div class="resubmit-heading">
          <span class="pill red">资质审核未通过</span>
          <h1>重新提交${professionalLabel}资质</h1>
          <p>${esc(user.realName)}，你的原账号仍然保留，无需重复注册或更换手机号。</p>
        </div>
        ${user.reviewReason ? `<div class="risk-alert red"><span>${icon("alert", "icon-xs")}</span><div><strong>管理员审核意见</strong><p>${esc(user.reviewReason)}</p></div></div>` : ""}
        <div class="professional-notice" style="margin-top:16px">${icon("shield", "icon-xs")}<div><strong>重新提交说明</strong><span>请根据审核意见修正执业信息，并重新上传清晰、有效的资格证明材料。提交后账号将重新进入待审核状态，审核期间暂时不能登录工作台。</span></div></div>
        <div class="form-grid" style="margin-top:18px">
          <div class="form-field full"><label>${user.role === "DOCTOR" ? "执业机构" : "所属药房名称"}<span class="required">*</span></label><input data-resubmit-field="${user.role === "DOCTOR" ? "institution" : "pharmacyName"}" value="${esc(user.role === "DOCTOR" ? draft.institution : draft.pharmacyName)}" /></div>
          ${user.role === "DOCTOR" ? `<div class="form-field"><label>所属科室<span class="required">*</span></label><input data-resubmit-field="department" value="${esc(draft.department)}" /></div>` : `<div class="form-field"><label>药房地址<span class="required">*</span></label><input data-resubmit-field="pharmacyAddress" value="${esc(draft.pharmacyAddress)}" /></div><div class="form-field"><label>药房经营许可证<span class="required">*</span></label><input data-resubmit-field="pharmacyLicenseNo" value="${esc(draft.pharmacyLicenseNo)}" /></div><div class="form-field"><label>药房联系电话</label><input data-resubmit-field="pharmacyPhone" value="${esc(draft.pharmacyPhone)}" /></div>`}
          <div class="form-field"><label>职称</label><input data-resubmit-field="title" value="${esc(draft.title)}" /></div>
          <div class="form-field"><label>资格证书编号<span class="required">*</span></label><input data-resubmit-field="licenseNo" value="${esc(draft.licenseNo)}" /></div>
          <div class="form-field"><label>从业年限</label><input data-resubmit-field="yearsExperience" type="number" min="0" max="60" value="${esc(draft.yearsExperience)}" /></div>
          <div class="form-field full"><label>专业方向</label><input data-resubmit-field="specialty" value="${esc(draft.specialty)}" /></div>
        </div>
        <div class="document-upload">
          <input type="file" id="resubmit-document" accept="image/png,image/jpeg,application/pdf" />
          <label for="resubmit-document">
            <span>${icon(draft.documentData ? "checkCircle" : "file")}</span>
            <div><strong>${draft.documentData ? esc(draft.documentName) : "重新上传资格证书或执业证件"}</strong><small>${draft.documentData ? "新材料已读取，可重新选择" : draft.documentName ? `原文件：${esc(draft.documentName)}，请重新选择以确认有效` : "支持 JPG、PNG、PDF，不超过 1.5MB"}</small></div>
          </label>
        </div>
        ${user.role === "PHARMACIST" ? `<div class="document-upload"><input type="file" id="resubmit-catalog" accept=".xlsx,.csv" /><label for="resubmit-catalog"><span>${icon(draft.drugCatalog?.length ? "checkCircle" : "file")}</span><div><strong>${draft.catalogFileName ? esc(draft.catalogFileName) : "重新上传药品目录 Excel"}</strong><small>${draft.drugCatalog?.length ? `已保留 ${draft.drugCatalog.length} 种药品，可重新上传覆盖` : "支持 .xlsx 或 .csv"}</small></div></label></div>` : ""}
        <div class="form-error ${draft.error ? "show" : ""}" id="resubmit-error">${esc(draft.error)}</div>
        <div class="modal-actions"><button class="btn btn-secondary" data-action="logout">取消</button><button class="btn btn-primary" data-action="submit-qualification-resubmit">${icon("send", "icon-xs")} 重新提交审核</button></div>
      </main>
    </div>`;
}

function syncQualificationResubmitDraft() {
  document.querySelectorAll("[data-resubmit-field]").forEach((field) => {
    qualificationResubmitDraft[field.dataset.resubmitField] = field.value;
  });
}

async function handleQualificationResubmitFile(input) {
  const file = input.files?.[0];
  if (!file) return;
  syncQualificationResubmitDraft();
  if (!["image/jpeg", "image/png", "application/pdf"].includes(file.type)) {
    qualificationResubmitDraft.error = "仅支持 JPG、PNG 或 PDF 格式";
    render();
    return;
  }
  if (file.size > 1.5 * 1024 * 1024) {
    qualificationResubmitDraft.error = "资质材料不能超过 1.5MB";
    render();
    return;
  }
  const data = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("读取资质材料失败"));
    reader.readAsDataURL(file);
  }).catch((error) => {
    qualificationResubmitDraft.error = error.message;
    return "";
  });
  qualificationResubmitDraft.documentName = file.name;
  qualificationResubmitDraft.documentType = file.type;
  qualificationResubmitDraft.documentData = data;
  qualificationResubmitDraft.error = "";
  render();
}

async function handleResubmitCatalogFile(input) {
  const file = input.files?.[0];
  if (!file) return;
  syncQualificationResubmitDraft();
  try {
    let rows;
    if (file.name.toLowerCase().endsWith(".csv")) {
      rows = parseCsvCatalog(await file.text());
    } else if (file.name.toLowerCase().endsWith(".xlsx")) {
      rows = parseXlsxRows(await readXlsxEntries(await file.arrayBuffer()));
    } else {
      throw new Error("请上传 .xlsx 或 .csv 格式的药品目录");
    }
    const catalog = normalizeDrugCatalogRows(rows);
    if (!catalog.length) throw new Error("药品目录中没有有效数据");
    qualificationResubmitDraft.drugCatalog = catalog;
    qualificationResubmitDraft.catalogFileName = file.name;
    qualificationResubmitDraft.error = "";
    render();
    showToast(`已读取 ${catalog.length} 种药品`);
  } catch (error) {
    qualificationResubmitDraft.error = error.message || "药品目录解析失败";
    render();
  }
}

async function submitQualificationResubmit() {
  syncQualificationResubmitDraft();
  const draft = qualificationResubmitDraft;
  const isPharmacist = userRoleIsPharmacist();
  const error =
    (!isPharmacist && !draft.institution.trim() ? "请填写执业机构" : "") ||
    (!isPharmacist && !draft.department.trim() ? "请填写所属科室" : "") ||
    (!draft.licenseNo.trim() ? "请填写资格证书编号" : "") ||
    (isPharmacist && (!draft.pharmacyName.trim() || !draft.pharmacyAddress.trim() || !draft.drugCatalog.length) ? "请完整填写药房信息并上传药品目录" : "") ||
    (!draft.documentData ? "请重新上传有效资质材料" : "");
  if (error) {
    draft.error = error;
    render();
    return;
  }
  try {
    await resubmitQualification({
      qualification: {
        institution: isPharmacist ? draft.pharmacyName.trim() : draft.institution.trim(),
        department: isPharmacist ? "药房" : draft.department.trim(),
        title: draft.title.trim(),
        specialty: draft.specialty.trim(),
        yearsExperience: Number(draft.yearsExperience) || 0,
        licenseNo: draft.licenseNo.trim(),
        documentName: draft.documentName,
        documentType: draft.documentType,
        documentData: draft.documentData,
        ...(isPharmacist
          ? {
              pharmacyName: draft.pharmacyName.trim(),
              pharmacyAddress: draft.pharmacyAddress.trim(),
              pharmacyPhone: draft.pharmacyPhone.trim(),
              pharmacyLicenseNo: draft.pharmacyLicenseNo.trim(),
              catalogFileName: draft.catalogFileName,
              drugCatalog: draft.drugCatalog,
            }
          : {}),
      },
    });
    qualificationResubmitMode = false;
    qualificationResubmitDraft = null;
    session = null;
    state = null;
    activePage = null;
    render();
    showToast("资质已重新提交，请等待管理员审核");
  } catch (caught) {
    draft.error = caught.message || "资质重新提交失败";
    render();
  }
}

function userRoleIsPharmacist() {
  return currentUser()?.role === "PHARMACIST";
}

function openPasswordReset() {
  passwordResetDraft = {
    phone: "",
    smsCode: "",
    devCode: "",
    codeSent: false,
    newPassword: "",
    confirmPassword: "",
    success: false,
    username: "",
    error: "",
  };
  modalRoot.innerHTML = passwordResetMarkup();
}

function passwordResetMarkup() {
  const draft = passwordResetDraft;
  if (!draft) return "";
  return `
    <div class="modal-backdrop" data-action="backdrop-close">
      <section class="modal narrow" role="dialog" aria-modal="true" aria-labelledby="password-reset-title">
        <header class="modal-head">
          <div class="mini-health-icon" style="width:40px;height:40px">${icon("lock")}</div>
          <div class="modal-head-copy">
            <h2 id="password-reset-title">${draft.success ? "密码重置成功" : "忘记密码"}</h2>
            <p>${draft.success ? "请使用新密码重新登录" : "通过注册手机号验证身份"}</p>
          </div>
          <button class="icon-btn" data-action="close-modal" aria-label="关闭">${icon("x")}</button>
        </header>
        <div class="modal-body">
          ${
            draft.success
              ? `
                <div class="registration-success">
                  <div class="registration-success-icon">${icon("checkCircle", "icon-lg")}</div>
                  <h3>新密码已生效</h3>
                  <p>为了账号安全，原登录会话已全部失效，请使用新密码重新登录。</p>
                  <div class="registration-result-box">
                    <span>登录账号</span><strong>${esc(draft.username)}</strong>
                    <span>状态</span><strong>可正常登录</strong>
                  </div>
                  <button class="btn btn-primary btn-block" data-action="password-reset-return">返回登录</button>
                </div>`
              : `
                <div class="professional-notice">${icon("shield", "icon-xs")}<div><strong>手机号身份验证</strong><span>验证码 5 分钟内有效，同一手机号 60 秒内只能发送一次。</span></div></div>
                <div class="form-field">
                  <label>注册手机号<span class="required">*</span></label>
                  <div class="verification-field">
                    <input data-reset-field="phone" value="${esc(draft.phone)}" placeholder="请输入注册手机号" inputmode="numeric" />
                    <button type="button" class="btn btn-secondary btn-sm" data-action="send-reset-code">${draft.codeSent ? "重新发送" : "获取验证码"}</button>
                  </div>
                </div>
                <div class="form-field" style="margin-top:14px">
                  <label>短信验证码<span class="required">*</span></label>
                  <input data-reset-field="smsCode" value="${esc(draft.smsCode)}" placeholder="输入 6 位验证码" inputmode="numeric" maxlength="6" />
                  ${draft.devCode ? `<span class="demo-code-note">本地测试验证码：<strong>${esc(draft.devCode)}</strong>（生产环境将通过短信发送）</span>` : ""}
                </div>
                <div class="form-grid" style="margin-top:14px">
                  <div class="form-field full"><label>新密码<span class="required">*</span></label><input data-reset-field="newPassword" value="${esc(draft.newPassword)}" type="password" autocomplete="new-password" placeholder="至少 8 位" /></div>
                  <div class="form-field full"><label>确认新密码<span class="required">*</span></label><input data-reset-field="confirmPassword" value="${esc(draft.confirmPassword)}" type="password" autocomplete="new-password" placeholder="再次输入新密码" /></div>
                </div>
                <div class="form-error ${draft.error ? "show" : ""}" id="password-reset-error">${esc(draft.error)}</div>
                <div class="modal-actions">
                  <button class="btn btn-secondary" data-action="close-modal">取消</button>
                  <button class="btn btn-primary" data-action="submit-password-reset">${icon("lock", "icon-xs")} 重置密码</button>
                </div>`
          }
        </div>
      </section>
    </div>`;
}

function syncPasswordResetDraft() {
  document.querySelectorAll("[data-reset-field]").forEach((field) => {
    passwordResetDraft[field.dataset.resetField] = field.value;
  });
}

async function sendPasswordResetCode() {
  syncPasswordResetDraft();
  if (!/^1\d{10}$/.test(passwordResetDraft.phone)) {
    passwordResetDraft.error = "请输入正确的 11 位注册手机号";
    modalRoot.innerHTML = passwordResetMarkup();
    return;
  }
  try {
    const result = await sendPhoneVerificationCode(passwordResetDraft.phone, "reset");
    passwordResetDraft.codeSent = true;
    passwordResetDraft.devCode = result.devCode || "";
    passwordResetDraft.error = "";
    modalRoot.innerHTML = passwordResetMarkup();
    startSmsCountdown();
    showToast(result.devCode ? `重置验证码已发送：${result.devCode}` : "重置验证码已发送");
  } catch (error) {
    passwordResetDraft.error = error.message || "验证码发送失败";
    modalRoot.innerHTML = passwordResetMarkup();
  }
}

async function submitPasswordReset() {
  syncPasswordResetDraft();
  const draft = passwordResetDraft;
  const error =
    (!/^1\d{10}$/.test(draft.phone) ? "请输入正确的注册手机号" : "") ||
    (!/^\d{6}$/.test(draft.smsCode) ? "请输入 6 位短信验证码" : "") ||
    (draft.newPassword.length < 8 ? "新密码至少需要 8 位" : "") ||
    (draft.newPassword !== draft.confirmPassword ? "两次输入的新密码不一致" : "");
  if (error) {
    draft.error = error;
    modalRoot.innerHTML = passwordResetMarkup();
    return;
  }
  try {
    const result = await resetPasswordWithSms({
      phone: draft.phone,
      code: draft.smsCode,
      newPassword: draft.newPassword,
      confirmPassword: draft.confirmPassword,
    });
    draft.success = true;
    draft.username = result.account.username;
    draft.error = "";
    modalRoot.innerHTML = passwordResetMarkup();
  } catch (caught) {
    draft.error = caught.message || "密码重置失败";
    modalRoot.innerHTML = passwordResetMarkup();
  }
}

function stepFlow(status) {
  const step = RX_STATUS_META[status]?.step ?? -1;
  const labels = ["待开具", "待选药房", "待审核", "待支付", "已流转", "已核销"];
  return `
    <div class="step-flow">
      ${labels
        .map(
          (label, index) => `
          <div class="step ${step >= index ? "done" : ""} ${step === index ? "current" : ""}">
            <div class="step-dot">${step > index ? icon("check", "icon-xs") : ""}</div>
            <span>${label}</span>
          </div>`,
        )
        .join("")}
    </div>`;
}

function pharmacyById(id) {
  return state.pharmacies.find((item) => item.id === id);
}

function rxModalMarkup(rx) {
  const user = currentUser();
  const patient = patientOf(rx.patientId);
  const pharmacy = pharmacyById(rx.pharmacyId);
  const assignedPharmacy =
    user.role === "PHARMACIST"
      ? state.pharmacies.find((item) => item.id === user.pharmacyId)
      : null;
  const ownPharmacyActive = assignedPharmacy?.status === 1;
  const isAllergyRisk = patient?.allergy && !patient.allergy.includes("无");
  const canReview =
    user.role === "PHARMACIST" &&
    rx.status === RX_STATUS.PENDING_REVIEW &&
    ownPharmacyActive;
  const canSelectPharmacy =
    user.role === "PATIENT" && rx.status === RX_STATUS.PENDING_PHARMACY;
  const canPay = user.role === "PATIENT" && rx.status === RX_STATUS.PENDING_PAYMENT;
  const canDispense =
    user.role === "PHARMACIST" &&
    rx.status === RX_STATUS.TRANSFERRED &&
    ownPharmacyActive &&
    rx.pharmacyId === assignedPharmacy?.id;
  const canEdit = user.role === "DOCTOR" && rx.status === RX_STATUS.DRAFT;
  const showPickup = rx.status === RX_STATUS.TRANSFERRED && rx.pickupCode;
  const drugChecks = rx.items.map((item) => ({
    item,
    drug: state.drugs.find((drug) => drug.id === item.drugId),
  }));
  const incomplete =
    !rx.diagnosis ||
    !rx.items.length ||
    rx.items.some((item) => !item.dosage || !item.frequency || !(Number(item.quantity) > 0));
  const checkedRisks = drugChecks.filter(
    ({ drug }) => drug && (!drug.enabled || drug.stock < 300),
  );
  const recommendations = pharmacyRecommendations(
    state.pharmacies,
    rx.items,
    patient?.address || "",
    state.drugs,
    patient?.mapLocation || null,
  );
  const recommended = recommendations.find((item) => item.available);
  const patientSelectedPharmacyId = canSelectPharmacy
    ? patientPharmacySelection?.rxId === rx.id
      ? patientPharmacySelection.pharmacyId
      : recommended?.pharmacy.id || recommendations.find((item) => item.available)?.pharmacy.id || null
    : rx.pharmacyId;
  const patientPaymentPharmacy = pharmacyById(patientSelectedPharmacyId);
  const payableQuote = patientPaymentPharmacy
    ? quotePrescriptionAtPharmacy(
        patientPaymentPharmacy,
        rx.items,
        state.drugs,
        patient?.address || "",
        patient?.mapLocation || null,
      )
    : null;
  const payableTotal = payableQuote?.available
    ? formatCurrency(payableQuote.estimatedPrice)
    : rxTotal(rx);
  const patientPharmacyOptions = recommendations
    .map(
      (item) =>
        `<option value="${item.pharmacy.id}" ${item.pharmacy.id === patientSelectedPharmacyId ? "selected" : ""} ${item.available ? "" : "disabled"}>${esc(item.pharmacy.name)} · ${esc(item.pharmacy.address)} · ${item.distanceKm.toFixed(2)}km · ${item.available ? formatCurrency(item.estimatedPrice) : `缺 ${item.missingDrugNames.join("、")}`}</option>`,
    )
    .join("");
  const hasAvailablePharmacy = recommendations.some((item) => item.available);
  return `
    <div class="modal-backdrop" data-action="backdrop-close">
      <section class="modal wide" role="dialog" aria-modal="true" aria-labelledby="rx-dialog-title">
        <header class="modal-head">
          <div class="mini-health-icon" style="width:40px;height:40px">${icon("file")}</div>
          <div class="modal-head-copy">
            <h2 id="rx-dialog-title">电子处方详情</h2>
            <p>${esc(rx.no)} · ${dateTime(rx.createdAt)}</p>
          </div>
          ${statusPill(rx.status)}
          <button class="icon-btn" data-action="close-modal" aria-label="关闭">${icon("x")}</button>
        </header>
        <div class="modal-body">
          ${rx.status !== RX_STATUS.VOID ? stepFlow(rx.status) : `<div class="risk-alert red"><span>${icon("x", "icon-xs")}</span><div><strong>处方已作废</strong><p>${esc(rx.rejectReason || "处方未通过本次审核，请咨询开具医生。")}</p></div></div>`}
          <div class="modal-section">
            <div class="modal-section-title"><span>患者与诊断</span>${rx.status === RX_STATUS.PENDING_REVIEW ? '<span class="pill blue">待药师审核</span>' : ""}</div>
            <div class="patient-summary">
              <div><span>患者</span><strong>${esc(rx.patientName)} · ${esc(patient?.gender || "")}${patient?.age ? ` · ${patient.age}岁` : ""}</strong></div>
              <div><span>就诊科室</span><strong>${esc(rx.department)}</strong></div>
              <div><span>开具医生</span><strong>${esc(rx.doctorName)}</strong></div>
              <div><span>临床诊断</span><strong>${esc(rx.diagnosis || "待医生填写")}</strong></div>
              <div><span>过敏史</span><strong class="${isAllergyRisk ? "text-danger" : ""}">${esc(rx.allergySnapshot || patient?.allergy || "暂无记录")}</strong></div>
              <div><span>处方金额</span><strong>${rxTotal(rx)}</strong></div>
            </div>
            ${
              isAllergyRisk
                ? `<div class="risk-alert ${rx.patientName === "林晓雨" ? "red" : ""}"><span>${icon("alert", "icon-xs")}</span><div><strong>过敏史核验提示</strong><p>患者存在“${esc(patient.allergy)}”记录，请核对处方中是否包含相关禁忌药品。</p></div></div>`
                : ""
            }
            ${
              user.role === "PHARMACIST" && rx.status === RX_STATUS.PENDING_REVIEW && !ownPharmacyActive
                ? `<div class="risk-alert red"><span>${icon("alert", "icon-xs")}</span><div><strong>所属药房已停用</strong><p>管理员恢复药房后才能继续审核处方。</p></div></div>`
                : user.role === "PHARMACIST" && rx.status === RX_STATUS.TRANSFERRED && rx.pharmacyId !== assignedPharmacy?.id
                  ? `<div class="risk-alert red"><span>${icon("shield", "icon-xs")}</span><div><strong>不属于当前药房</strong><p>该处方已流转至${esc(pharmacy?.name || "其他药房")}，当前药师不能核销。</p></div></div>`
                  : ""
            }
            ${
              recommended
                ? `<div class="professional-notice" style="margin-top:12px">${icon("building", "icon-xs")}<div><strong>系统推荐药房：${esc(recommended.pharmacy.name)}</strong><span>已排除缺药药房 · ${recommended.distanceKm.toFixed(1)}km · 处方实际药费 ${formatCurrency(recommended.estimatedPrice)} · 综合评分按距离 60%、价格 40%。</span></div></div>`
                : recommendations.length
                  ? `<div class="risk-alert red" style="margin-top:12px">${icon("alert", "icon-xs")}<div><strong>暂无药房可配齐全部药品</strong><p>${esc(recommendations[0].missingDrugNames.join("、"))} 等药品库存不足，请联系医生调整处方。</p></div></div>`
                  : `<div class="risk-alert" style="margin-top:12px">${icon("building", "icon-xs")}<div><strong>暂无可用合作药房</strong><p>管理员审核药师资质并导入药品目录后，系统才会生成药房推荐。</p></div></div>`
            }
          </div>
          ${
            rx.status !== RX_STATUS.DRAFT && rx.status !== RX_STATUS.VOID
              ? `<div class="modal-section">
                  <div class="modal-section-title"><span>药房距离示意</span><span class="text-small muted">地图距离优先，缺药药房不参与推荐</span></div>
                  ${serviceMapMarkup({
                    patientId: rx.patientId,
                    recommendedPharmacyId:
                      patientSelectedPharmacyId ||
                      recommended?.pharmacy.id ||
                      rx.pharmacyId ||
                      null,
                  })}
                </div>`
              : ""
          }
          <div class="modal-section">
            <div class="modal-section-title"><span>处方明细</span><span class="text-small muted">共 ${rx.items.length} 种药品</span></div>
            ${
              rx.items.length
                ? `
                <table class="rx-table">
                  <thead><tr><th>药品</th><th>规格</th><th>数量</th><th>用法</th><th>频次</th><th>小计</th></tr></thead>
                  <tbody>
                    ${rx.items
                      .map(
                        (item) => `
                        <tr>
                          <td><strong>${esc(item.name)}</strong></td>
                          <td>${esc(item.spec || "—")}</td>
                          <td>${esc(item.quantity)}</td>
                          <td>${esc(item.dosage)}</td>
                          <td>${esc(item.frequency)}</td>
                          <td>${formatCurrency(Number(item.price) * Number(item.quantity))}</td>
                        </tr>`,
                      )
                      .join("")}
                  </tbody>
                </table>
                <div class="rx-total">合计 <strong>${rxTotal(rx)}</strong></div>
                <div style="display:flex;gap:8px;align-items:center;margin-top:10px">
                  <span class="pill ${incomplete ? "red" : "green"}">${incomplete ? "处方信息不完整" : "处方完整性检查通过"}</span>
                  <span class="pill ${checkedRisks.length ? "amber" : "teal"}">${checkedRisks.length ? `${checkedRisks.length} 项药品状态提示` : "药品状态正常"}</span>
                </div>
                ${
                  checkedRisks.length
                    ? `<div class="risk-alert"><span>${icon("alert", "icon-xs")}</span><div><strong>药品状态提示</strong><p>${checkedRisks.map(({ item, drug }) => `${esc(item.name)}${!drug.enabled ? "已停用" : `库存 ${drug.stock}`}`).join("；")}</p></div></div>`
                    : ""
                }
                <div class="mini-health-item"><span class="mini-health-icon">${icon("shield", "icon-xs")}</span><div><strong>药品禁忌与注意事项</strong><span>${drugChecks.map(({ item, drug }) => `${esc(item.name)}：${esc(drug?.contraindication || "暂无特别说明")}`).join("；")}</span></div></div>`
                : `<div class="empty-state" style="min-height:150px"><p>处方草稿尚未添加药品。</p></div>`
            }
          </div>
          ${
            rx.reviewNote
              ? `<div class="modal-section"><div class="modal-section-title"><span>医生说明</span></div><p class="muted text-small" style="margin:0;line-height:1.8">${esc(rx.reviewNote)}</p></div>`
              : ""
          }
          <div class="modal-section">
            <div class="modal-section-title"><span>处方与审核历史</span></div>
            <div class="activity-list">
              <div class="activity-item"><span class="activity-icon">${icon("file", "icon-xs")}</span><div class="activity-copy"><p>处方已创建</p><span>${dateTime(rx.createdAt)}</span></div></div>
              ${rx.submittedAt ? `<div class="activity-item"><span class="activity-icon">${icon("send", "icon-xs")}</span><div class="activity-copy"><p>医生完成处方，等待患者选择药房</p><span>${dateTime(rx.submittedAt)}</span></div></div>` : ""}
              ${rx.pharmacySelectedAt ? `<div class="activity-item"><span class="activity-icon">${icon("building", "icon-xs")}</span><div class="activity-copy"><p>患者选择${esc(pharmacy?.name || "取药药房")}</p><span>${dateTime(rx.pharmacySelectedAt)}</span></div></div>` : ""}
              ${rx.reviewedAt ? `<div class="activity-item"><span class="activity-icon">${icon(rx.status === RX_STATUS.VOID ? "alert" : "checkCircle", "icon-xs")}</span><div class="activity-copy"><p>${rx.status === RX_STATUS.VOID ? `药师驳回：${esc(rx.rejectReason || "未填写原因")}` : "药师审核通过"}</p><span>${dateTime(rx.reviewedAt)}</span></div></div>` : ""}
              ${rx.transferredAt ? `<div class="activity-item"><span class="activity-icon">${icon("package", "icon-xs")}</span><div class="activity-copy"><p>处方已流转至${esc(pharmacy?.name || "合作药房")}</p><span>${dateTime(rx.transferredAt)}</span></div></div>` : ""}
              ${rx.verifiedAt ? `<div class="activity-item"><span class="activity-icon">${icon("checkCircle", "icon-xs")}</span><div class="activity-copy"><p>药房完成取药核销</p><span>${dateTime(rx.verifiedAt)}</span></div></div>` : ""}
            </div>
          </div>
          ${
            showPickup
              ? `
              <div class="modal-section">
                <div class="pickup-card">
                  <p>取药码 · ${esc(pharmacy?.name || "目标药房")}</p>
                  <strong>${esc(rx.pickupCode)}</strong>
                  <span>${esc(pharmacy?.address || "")} · 有效期至 ${dateTime(rx.expireAt)}</span>
                </div>
              </div>`
              : ""
          }
          ${
            canSelectPharmacy
              ? `
              <div class="modal-section">
                <div class="modal-section-title"><span>选择取药药房</span><span class="pill blue">待选择</span></div>
                <div class="professional-notice">${icon("building", "icon-xs")}<div><strong>系统推荐：${esc(recommended?.pharmacy.name || "暂无可配齐药房")}</strong><span>${recommended ? `距患者家 ${recommended.distanceKm.toFixed(2)}km · 预计药费 ${formatCurrency(recommended.estimatedPrice)}` : "请查看其他药房或联系医生调整处方"}</span></div></div>
                <div class="form-field" style="margin-top:12px">
                  <label for="patient-pharmacy-choice">自行选择药房</label>
                  <select id="patient-pharmacy-choice" data-action="select-patient-pharmacy" data-rx-id="${rx.id}">${patientPharmacyOptions}</select>
                  <span class="field-hint">选择后处方只会发送给该药房的药师审核，此时还不扣款。</span>
                </div>
                ${hasAvailablePharmacy ? "" : `<div class="risk-alert red">${icon("alert", "icon-xs")}<div><strong>当前没有可配齐处方的药房</strong><p>请联系医生调整处方后再选择药房。</p></div></div>`}
                <div class="rx-total">所选药房预计药费 <strong>${payableTotal}</strong></div>
              </div>`
              : ""
          }
          ${
            canPay
              ? `
              <div class="modal-section">
                <div class="modal-section-title"><span>药费支付</span><span class="pill amber">待支付</span></div>
                <div class="professional-notice">${icon("building", "icon-xs")}<div><strong>审核药房：${esc(patientPaymentPharmacy?.name || "待确认")}</strong><span>${esc(patientPaymentPharmacy?.address || "")} · 该药房已审核处方，支付后生成取药码</span></div></div>
                <div class="form-field" style="margin-top:12px"><label>支付方式</label><select id="rx-payment-method"><option value="微信支付">微信支付</option><option value="支付宝">支付宝</option><option value="医保支付">医保支付</option></select></div>
                <div class="rx-total">待支付药费 <strong>${payableTotal}</strong></div>
              </div>`
              : ""
          }
          ${
            canReview
              ? `
              <div class="modal-section">
                <div class="modal-section-title"><span>审核结论</span><span class="text-small muted">请确认已核对全部用药风险</span></div>
                <div class="professional-notice">${icon("building", "icon-xs")}<div><strong>患者已选择：${esc(pharmacy?.name || assignedPharmacy?.name || "待确认")}</strong><span>${esc(pharmacy?.address || assignedPharmacy?.address || "")} · 审核通过后患者再支付药费</span></div></div>
                <div class="review-radio">
                  <label class="review-choice"><input type="radio" name="review-decision" value="approve" checked />${icon("checkCircle", "icon-xs")} 审核通过，等待患者支付</label>
                  <label class="review-choice"><input type="radio" name="review-decision" value="reject" />${icon("x", "icon-xs")} 驳回处方</label>
                </div>
                <input id="review-pharmacy" type="hidden" value="${esc(rx.pharmacyId || "")}" />
                <div class="form-field" style="margin-top:12px">
                  <label for="review-reason">审核意见 / 驳回原因</label>
                  <textarea id="review-reason" style="min-height:74px" placeholder="审核通过可选填；驳回时必填。"></textarea>
                </div>
                <label class="checkbox-line" style="margin-top:12px"><input type="checkbox" id="review-confirm" /> 我已核对诊断、过敏史、药品禁忌与用法用量</label>
                <div class="form-error" id="review-error"></div>
              </div>`
              : ""
          }
          ${
            canDispense
              ? `
              <div class="modal-section">
                <div class="modal-section-title"><span>药房核销</span><span class="pill teal">已流转</span></div>
                <div class="form-field">
                  <label for="dispense-code">输入患者取药码</label>
                  <input id="dispense-code" placeholder="例如：${esc(rx.pickupCode)}" />
                  <span class="field-hint">核销后处方状态将更新为“已核销”，操作不可重复。</span>
                </div>
              </div>`
              : ""
          }
          <div class="modal-actions">
            ${canEdit ? `<button class="btn btn-secondary push-left" data-action="edit-rx" data-id="${rx.id}">${icon("edit", "icon-xs")} 继续编辑</button>` : ""}
            ${rx.status === RX_STATUS.PENDING_PHARMACY && user.role === "DOCTOR" ? `<span class="muted push-left text-small">处方已锁定，等待患者选择药房</span>` : ""}
            ${rx.status === RX_STATUS.PENDING_REVIEW && user.role === "DOCTOR" ? `<span class="muted push-left text-small">处方已锁定，等待药师处理</span>` : ""}
            <button class="btn btn-secondary" data-action="close-modal">关闭</button>
            ${canSelectPharmacy ? `<button class="btn btn-primary" data-action="select-prescription-pharmacy" data-id="${rx.id}" ${hasAvailablePharmacy ? "" : "disabled"}>${icon("building", "icon-xs")} 确认药房并提交审核</button>` : ""}
            ${canReview ? `<button class="btn btn-primary" data-action="perform-review" data-id="${rx.id}">${icon("shield", "icon-xs")} 提交审核结论</button>` : ""}
            ${canPay ? `<button class="btn btn-primary" data-action="pay-prescription" data-id="${rx.id}">${icon("bag", "icon-xs")} 支付药费</button>` : ""}
            ${canDispense ? `<button class="btn btn-primary" data-action="complete-dispense" data-id="${rx.id}">${icon("checkCircle", "icon-xs")} 确认核销</button>` : ""}
          </div>
        </div>
      </section>
    </div>`;
}

function openRxModal(rxId) {
  const rx = state.prescriptions.find((item) => item.id === rxId);
  if (!rx) {
    showToast("未找到该处方", "error");
    return;
  }
  selectedRxId = rxId;
  modalRoot.innerHTML = rxModalMarkup(rx);
}

function syncEditorFromDOM() {
  if (!editorState) return;
  const diagnosis = document.getElementById("rx-diagnosis");
  const note = document.getElementById("rx-note");
  if (diagnosis) editorState.diagnosis = diagnosis.value;
  if (note) editorState.reviewNote = note.value;
  const consultation = document.getElementById("rx-consultation");
  if (consultation) editorState.consultationId = consultation.value;
  document.querySelectorAll("[data-editor-row]").forEach((row) => {
    const index = Number(row.dataset.editorRow);
    const item = editorState.items[index];
    if (!item) return;
    item.drugId = row.querySelector('[data-field="drugId"]')?.value || item.drugId;
    item.quantity = row.querySelector('[data-field="quantity"]')?.value || item.quantity;
    item.dosage = row.querySelector('[data-field="dosage"]')?.value || "";
    item.frequency = row.querySelector('[data-field="frequency"]')?.value || "";
  });
}

function pharmaciesOfferingDrug(drug) {
  return state.pharmacies.filter(
    (pharmacy) =>
      pharmacy.status === 1 &&
      (pharmacy.catalog || []).some(
        (offer) =>
          offer.drugId === drug.id &&
          offer.enabled !== false &&
          Number(offer.stock) >= 1,
      ),
  );
}

function drugOptionSearchText(drug) {
  const pharmacyNames = pharmaciesOfferingDrug(drug).map((pharmacy) => pharmacy.name);
  return [
    drug.name,
    drug.code,
    drug.spec,
    drug.manufacturer,
    drug.approvalNo,
    drug.contraindication,
    ...pharmacyNames,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function editorMarkup() {
  const user = currentUser();
  const availableConsults = state.consultations.filter(
    (item) =>
      item.doctorId === user.id &&
      item.status !== "closed" &&
      !state.prescriptions.some(
        (rxItem) =>
          rxItem.consultationId === item.id &&
          rxItem.status !== RX_STATUS.VOID &&
          (!editorState.id || rxItem.id !== editorState.id),
      ),
  );
  const consultation = availableConsults.find((item) => item.id === editorState.consultationId);
  const patient = consultation ? patientOf(consultation.patientId) : null;
  const liveTotal = prescriptionTotal(editorState.items);
  const enabledDrugs = state.drugs.filter(
    (drug) => drug.enabled && Number(drug.stock) > 0,
  );
  const catalogPharmacies = state.pharmacies.filter(
    (pharmacy) => pharmacy.status === 1,
  );
  return `
    <div class="modal-backdrop" data-action="backdrop-close">
      <section class="modal wide" role="dialog" aria-modal="true" aria-labelledby="rx-editor-title">
        <header class="modal-head">
          <div class="mini-health-icon" style="width:40px;height:40px">${icon("file")}</div>
          <div class="modal-head-copy"><h2 id="rx-editor-title">${editorState.id ? "编辑处方" : "新建电子处方"}</h2><p>${editorState.id ? esc(editorState.no) : "从问诊记录创建新的处方草稿"}</p></div>
          <span class="pill amber">待开具</span>
          <button class="icon-btn" data-action="close-modal" aria-label="关闭">${icon("x")}</button>
        </header>
        <div class="modal-body">
          ${
            editorState.id && selectedRxId
              ? ""
              : `
              <div class="form-field full" style="margin-bottom:16px">
                <label for="rx-consultation">关联问诊</label>
                <select id="rx-consultation">
                  ${availableConsults
                    .map(
                      (item) =>
                        `<option value="${item.id}" ${item.id === editorState.consultationId ? "selected" : ""}>${esc(item.patientName)} · ${esc(item.chiefComplaint)} · ${esc(consultationStatus(item.status)[0])}</option>`,
                    )
                    .join("")}
                </select>
              </div>`
          }
          <div class="patient-summary">
            <div><span>患者</span><strong>${esc(patient?.realName || consultation?.patientName || "—")}</strong></div>
            <div><span>过敏史</span><strong class="text-danger">${esc(patient?.allergy || "暂无记录")}</strong></div>
            <div><span>问诊主诉</span><strong>${esc(consultation?.chiefComplaint || "—")}</strong></div>
          </div>
          <div class="risk-alert"><span>${icon("alert", "icon-xs")}</span><div><strong>用药安全提醒</strong><p>开方前请核实过敏史、肝肾功能与特殊人群信息。药师将在流转前再次审核。</p></div></div>
          <div class="form-grid" style="margin-top:18px">
            <div class="form-field full">
              <label for="rx-diagnosis">诊断结论<span class="required">*</span></label>
              <input id="rx-diagnosis" value="${esc(editorState.diagnosis)}" placeholder="请输入本次临床诊断" />
            </div>
            <div class="form-field full">
              <label for="rx-note">医生说明</label>
              <textarea id="rx-note" style="min-height:74px" placeholder="可补充病情判断、复诊建议等">${esc(editorState.reviewNote || "")}</textarea>
            </div>
          </div>
          <div class="modal-section">
            <div class="modal-section-title"><span>药品明细</span><span class="text-small muted">共 ${editorState.items.length} 种 · ${formatCurrency(liveTotal)}</span></div>
            <div class="prescription-items-editor" id="rx-item-editor">
              ${
                editorState.items.length
                  ? editorState.items
                      .map(
                        (item, index) => `
                        <div class="drug-editor-row" data-editor-row="${index}">
                          <select data-field="drugId" aria-label="药品">
                            ${enabledDrugs.map((drug) => `<option value="${drug.id}" ${drug.id === item.drugId ? "selected" : ""}>${esc(drug.name)} · ${esc(drug.spec)} · ${formatCurrency(drug.price)}</option>`).join("")}
                          </select>
                          <input data-field="quantity" value="${esc(item.quantity)}" type="number" min="1" max="99" aria-label="数量" />
                          <input data-field="dosage" value="${esc(item.dosage)}" placeholder="每次用量" aria-label="用法用量" />
                          <input data-field="frequency" value="${esc(item.frequency)}" placeholder="服用频次" aria-label="服用频次" />
                          <button type="button" data-action="remove-rx-item" data-index="${index}" aria-label="移除">${icon("trash", "icon-xs")}</button>
                        </div>`,
                      )
                      .join("")
                  : `<div class="empty-state" style="min-height:130px"><p>请从下方目录添加药品。</p></div>`
              }
            </div>
            <div class="add-drug-row">
              <input id="drug-search" data-action="filter-rx-drugs" placeholder="搜索药品、厂家、批准文号或药房" />
              <select id="new-drug-select">
                ${enabledDrugs
                  .map((drug) => {
                    const pharmacyCount = pharmaciesOfferingDrug(drug).length;
                    return `<option value="${drug.id}" data-search="${esc(drugOptionSearchText(drug))}">${esc(drug.name)} · ${esc(drug.spec)} · ${formatCurrency(drug.price)}${pharmacyCount ? ` · ${pharmacyCount} 家药房可供` : " · 综合库存可供"}</option>`;
                  })
                  .join("")}
              </select>
              <button type="button" class="btn btn-secondary btn-sm" data-action="add-rx-item">${icon("plus", "icon-xs")} 添加</button>
            </div>
            <div class="rx-catalog-panel">
              <div class="rx-catalog-head">
                <strong>合作药房药品目录</strong>
                <span>${catalogPharmacies.length} 家药房 · ${enabledDrugs.length} 种可开药品 · 可按药品名称、厂家、批准文号或药房搜索</span>
              </div>
              ${
                catalogPharmacies.length
                  ? `<div class="rx-catalog-grid">${catalogPharmacies
                      .map(
                        (pharmacy) => `
                        <div class="rx-catalog-card">
                          <strong>${esc(pharmacy.name)}</strong>
                          <span>${esc(pharmacy.address)}</span>
                          <small>${esc(pharmacy.catalog?.length || 0)} 种药品在库 · ${esc(pharmacy.catalog?.slice(0, 4).map((item) => item.name).join("、") || "目录待同步")}</small>
                        </div>`,
                      )
                      .join("")}</div>`
                  : `<div class="professional-notice" style="margin-top:12px">${icon("building", "icon-xs")}<div><strong>暂无合作药房</strong><span>药师资质审核通过并同步药品目录后，药品会显示在这里。</span></div></div>`
              }
            </div>
          </div>
          <div class="form-error" id="rx-editor-error"></div>
          <div class="modal-actions">
            <button class="btn btn-secondary push-left" data-action="save-rx">保存草稿</button>
            <button class="btn btn-primary" data-action="submit-rx-editor">${icon("arrowUp", "icon-xs")} 提交药师审核</button>
          </div>
        </div>
      </section>
    </div>`;
}

function openRxEditor(rxId = null, consultationId = null) {
  const user = currentUser();
  if (user.role !== "DOCTOR") {
    showToast("当前角色无法开具处方", "error");
    return;
  }
  const rx = rxId ? state.prescriptions.find((item) => item.id === rxId) : null;
  if (rx) {
    selectedRxId = rx.id;
    editorState = {
      id: rx.id,
      no: rx.no,
      consultationId: rx.consultationId,
      diagnosis: rx.diagnosis || "",
      reviewNote: rx.reviewNote || "",
      items: rx.items.map((item) => ({ ...item })),
      recommendedPharmacyId: rx.recommendedPharmacyId || null,
    };
  } else {
    const available = state.consultations.filter(
      (item) => item.doctorId === user.id && !state.prescriptions.some((rxItem) => rxItem.consultationId === item.id && rxItem.status !== RX_STATUS.VOID),
    );
    if (!consultationId && !available.length) {
      const draft = state.prescriptions.find(
        (item) => item.doctorId === user.id && item.status === RX_STATUS.DRAFT,
      );
      if (draft) {
        openRxEditor(draft.id);
        showToast("已打开待完善的处方草稿");
      } else {
        showToast("暂无待开方问诊，请先接诊或结束一次问诊", "error");
      }
      return;
    }
    const chosen = consultationId || available[0]?.id || state.consultations.find((item) => item.doctorId === user.id)?.id;
    selectedRxId = null;
    editorState = {
      id: null,
      no: null,
      consultationId: chosen || "",
      diagnosis: chosen ? state.consultations.find((item) => item.id === chosen)?.chiefComplaint || "" : "",
      reviewNote: "",
      items: [],
      recommendedPharmacyId: null,
    };
  }
  modalRoot.innerHTML = editorMarkup();
}

function savePrescriptionDraft(submitForReview) {
  syncEditorFromDOM();
  const errorBox = document.getElementById("rx-editor-error");
  if (!editorState.consultationId) {
    if (errorBox) {
      errorBox.textContent = "请选择关联问诊";
      errorBox.classList.add("show");
    }
    return;
  }
  const consultation = state.consultations.find((item) => item.id === editorState.consultationId);
  const patient = patientOf(consultation?.patientId);
  const user = currentUser();
  const items = editorState.items.map((item) => {
    const drug = state.drugs.find((entry) => entry.id === item.drugId) || state.drugs[0];
    return {
      drugId: drug.id,
      name: drug.name,
      spec: drug.spec,
      quantity: Number(item.quantity),
      dosage: item.dosage,
      frequency: item.frequency,
      price: drug.price,
    };
  });
  const duplicate = items.some((item, index) => items.findIndex((other) => other.drugId === item.drugId) !== index);
  if (duplicate) {
    errorBox.textContent = "同一药品不能重复添加";
    errorBox.classList.add("show");
    return;
  }
  const recommendations = pharmacyRecommendations(
    state.pharmacies,
    items,
    patient?.address || "",
    state.drugs,
    patient?.mapLocation || null,
  );
  const recommendedPharmacyId = recommendations[0]?.pharmacy.id || null;
  const recommendedPharmacy = state.pharmacies.find(
    (item) => item.id === recommendedPharmacyId,
  );
  const existing = editorState.id ? state.prescriptions.find((item) => item.id === editorState.id) : null;
  let draft = {
    ...(existing || {}),
    id: existing?.id || `rx-${Date.now()}`,
    no: existing?.no || `RX20261124${String(86 + state.prescriptions.length).padStart(4, "0")}`,
    consultationId: consultation.id,
    patientId: consultation.patientId,
    patientName: patient?.realName || consultation.patientName,
    doctorId: user.id,
    doctorName: user.realName,
    department: user.department,
    diagnosis: editorState.diagnosis.trim(),
    reviewNote: editorState.reviewNote.trim(),
    status: RX_STATUS.DRAFT,
    createdAt: existing?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: existing?.version || 0,
    items,
    allergySnapshot: patient?.allergy || "无已知过敏",
    recommendedPharmacyId,
    recommendedPharmacyName: recommendedPharmacy?.name || null,
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
  if (submitForReview) {
    const issues = validatePrescriptionDraft(draft);
    if (issues.length) {
      errorBox.textContent = issues[0];
      errorBox.classList.add("show");
      return;
    }
    try {
      draft = transitionPrescription(draft, "submit");
    } catch (error) {
      errorBox.textContent = error.message;
      errorBox.classList.add("show");
      return;
    }
  }
  if (existing) {
    state.prescriptions = state.prescriptions.map((item) => (item.id === existing.id ? draft : item));
  } else {
    state.prescriptions.push(draft);
  }
  state.notifications.unshift({
    id: `note-${Date.now()}`,
    role: "PATIENT",
    icon: "file",
    title: submitForReview ? "处方已完成，请选择取药药房" : "医生保存了处方草稿",
    content:
      submitForReview
        ? `${draft.no} 已开具，请查看推荐药房并自行选择。`
        : `${draft.no} · ${draft.patientName}`,
    time: "刚刚",
    unread: true,
  });
  persist();
  closeModal();
  rxFilter = "all";
  activePage = "prescriptions";
  render();
  showToast(
    submitForReview ? "处方已开具，等待患者选择药房" : "处方草稿已保存",
  );
}

async function selectPrescriptionPharmacy(rxId) {
  const rx = state.prescriptions.find((item) => item.id === rxId);
  if (!rx || rx.status !== RX_STATUS.PENDING_PHARMACY) return;
  const selectedPharmacyId = document.getElementById(
    "patient-pharmacy-choice",
  )?.value;
  const selectedPharmacy = pharmacyById(selectedPharmacyId);
  const patient = patientOf(rx.patientId);
  const recommendations = pharmacyRecommendations(
    state.pharmacies,
    rx.items,
    patient?.address || "",
    state.drugs,
    patient?.mapLocation || null,
  );
  const quote = recommendations.find(
    (item) => item.pharmacy.id === selectedPharmacyId,
  );
  if (!selectedPharmacy || selectedPharmacy.status !== 1 || !quote?.available) {
    showToast("所选药房无法配齐该处方，请选择其他药房", "error");
    return;
  }
  try {
    const next = transitionPrescription(rx, "select_pharmacy", {
      pharmacyId: selectedPharmacy.id,
    });
    next.pharmacyRecommendations = recommendations.map((item) => ({
      pharmacyId: item.pharmacy.id,
      pharmacyName: item.pharmacy.name,
      distanceKm: item.distanceKm,
      estimatedPrice: item.estimatedPrice,
      available: item.available,
      missingDrugNames: item.missingDrugNames,
      score: item.score,
    }));
    next.selectedPharmacyQuote = {
      estimatedPrice: quote.estimatedPrice,
      distanceKm: quote.distanceKm,
      items: quote.quoteItems,
    };
    state.prescriptions = state.prescriptions.map((item) =>
      item.id === next.id ? next : item,
    );
    const saved = await saveState(state);
    state = saved.state;
    closeModal();
    render();
    showToast(`已选择${selectedPharmacy.name}，处方已提交该药房药师审核`);
  } catch (error) {
    state = await loadState().catch(() => state);
    render();
    showToast(error.message || "药房选择失败", "error");
  }
}

function performReview(rxId) {
  const rx = state.prescriptions.find((item) => item.id === rxId);
  if (!rx) return;
  const decision = document.querySelector('input[name="review-decision"]:checked')?.value;
  const reason = document.getElementById("review-reason")?.value || "";
  const pharmacyId = document.getElementById("review-pharmacy")?.value;
  const confirmed = document.getElementById("review-confirm")?.checked;
  const error = document.getElementById("review-error");
  if (!confirmed) {
    error.textContent = "请先确认已完成用药安全核对";
    error.classList.add("show");
    return;
  }
  try {
    if (decision === "reject" && !reason.trim()) throw new Error("驳回处方时必须填写审核意见");
    let next =
      decision === "reject"
        ? transitionPrescription(rx, "reject", { reason, pharmacistId: session.userId })
        : transitionPrescription(rx, "approve", { pharmacyId, pharmacistId: session.userId });
    if (decision !== "reject") {
      const patient = patientOf(rx.patientId);
      const targetPharmacy = pharmacyById(pharmacyId);
      const quote = targetPharmacy
        ? quotePrescriptionAtPharmacy(
            targetPharmacy,
            rx.items,
            state.drugs,
            patient?.address || "",
            patient?.mapLocation || null,
          )
        : null;
      if (!quote?.available) {
        throw new Error(
          `该药房无法配齐处方${quote?.missingDrugNames?.length ? `：缺少 ${quote.missingDrugNames.join("、")}` : ""}`,
        );
      }
      next = {
        ...next,
        pharmacyQuote: {
          estimatedPrice: quote.estimatedPrice,
          distanceKm: quote.distanceKm,
          items: quote.quoteItems,
        },
      };
    }
    next.reviewComment = reason.trim();
    state.prescriptions = state.prescriptions.map((item) => (item.id === rx.id ? next : item));
    state.notifications.unshift({
      id: `note-${Date.now()}`,
      role: "PATIENT",
      icon: decision === "approve" ? "pill" : "alert",
      title: decision === "approve" ? "处方审核通过，等待支付" : "处方需要医生调整",
      content:
        decision === "approve"
          ? `${rx.no} 已完成药师审核，请支付药费后前往${pharmacyById(pharmacyId)?.name || "目标药房"}取药。`
          : `${rx.no} 未通过审核，请查看药师意见。`,
      time: "刚刚",
      unread: true,
    });
    persist();
    closeModal();
    activePage = "review";
    render();
    showToast(decision === "approve" ? "审核通过，等待患者支付药费" : "处方已驳回并作废");
  } catch (caught) {
    error.textContent = caught.message;
    error.classList.add("show");
  }
}

async function completeDispense(rxId) {
  const rx = state.prescriptions.find((item) => item.id === rxId);
  const code = document.getElementById("dispense-code")?.value.trim();
  if (!rx) return;
  if (!code || code !== rx.pickupCode) {
    showToast("取药码不匹配，请重新核对", "error");
    return;
  }
  const pharmacy = pharmacyById(rx.pharmacyId);
  if (!pharmacy || pharmacy.status !== 1) {
    showToast("所属药房已停用，暂时不能核销处方", "error");
    return;
  }
  try {
    const next = transitionPrescription(rx, "dispense", { pickupCode: code });
    state.prescriptions = state.prescriptions.map((item) => (item.id === rx.id ? next : item));
    const saved = await saveState(state);
    state = saved.state;
    closeModal();
    render();
    showToast("取药核销完成，药品库存已扣减并提醒管理员");
  } catch (error) {
    state = await loadState().catch(() => state);
    showToast(error.message, "error");
    render();
    openRxModal(rxId);
  }
}

function patientDetailsModalMarkup(patient) {
  return `
    <div class="modal-backdrop" data-action="backdrop-close">
      <section class="modal" role="dialog" aria-modal="true" aria-labelledby="patient-detail-title">
        <header class="modal-head">
          ${avatar(patient, "large")}
          <div class="modal-head-copy"><h2 id="patient-detail-title">${esc(patient?.realName || "患者资料")}</h2><p>${esc(patient?.patientNo || "患者健康档案")}</p></div>
          <button class="icon-btn" data-action="close-modal" aria-label="关闭">${icon("x")}</button>
        </header>
        <div class="modal-body">
          <div class="detail-list">
            <div class="detail-item"><span>性别</span><strong>${esc(patient?.gender || "未填写")}</strong></div>
            <div class="detail-item"><span>年龄</span><strong>${patient?.age ? `${patient.age} 岁` : "未填写"}</strong></div>
            <div class="detail-item"><span>血型</span><strong>${esc(patient?.bloodType || "未填写")}</strong></div>
            <div class="detail-item"><span>手机号</span><strong>${esc(patient?.phone || "—")}</strong></div>
            <div class="detail-item"><span>过敏记录</span><strong class="text-danger">${esc(patient?.allergy || "暂无记录")}</strong></div>
            <div class="detail-item"><span>既往病史</span><strong>${esc(patient?.medicalHistory || "暂无记录")}</strong></div>
            <div class="detail-item"><span>常用地址</span><strong>${esc(patient?.address || "未填写")}</strong></div>
          </div>
          <div class="risk-alert" style="margin-top:16px">${icon("shield", "icon-xs")}<div><strong>医疗信息已加密</strong><p>以上资料仅用于当前问诊与处方安全核验。</p></div></div>
          <div class="modal-actions"><button class="btn btn-primary" data-action="close-modal">关闭</button></div>
        </div>
      </section>
    </div>`;
}

function openPaymentModal(consultationId) {
  const consultation = state.consultations.find((item) => item.id === consultationId);
  if (!consultation) return;
  const doctor = state.users.find((item) => item.id === consultation.doctorId);
  modalRoot.innerHTML = `
    <div class="modal-backdrop" data-action="backdrop-close">
      <section class="modal narrow" role="dialog" aria-modal="true">
        <header class="modal-head">
          <div class="mini-health-icon" style="width:40px;height:40px">${icon("bag")}</div>
          <div class="modal-head-copy"><h2>支付问诊费用</h2><p>支付成功后医生才能接诊</p></div>
          <button class="icon-btn" data-action="close-modal" aria-label="关闭">${icon("x")}</button>
        </header>
        <div class="modal-body">
          <div class="patient-summary">
            <div><span>接诊医生</span><strong>${esc(doctor?.realName || consultation.doctorName)}</strong></div>
            <div><span>科室</span><strong>${esc(consultation.department)}</strong></div>
            <div><span>问诊方式</span><strong>在线图文问诊</strong></div>
          </div>
          <div class="risk-alert">${icon("shield", "icon-xs")}<div><strong>支付说明</strong><p>本次支付仅用于在线问诊服务。未支付前医生不会看到该问诊。</p></div></div>
          <div class="form-field" style="margin-top:14px"><label>支付方式</label><select id="payment-method"><option value="微信支付">微信支付</option><option value="支付宝">支付宝</option><option value="医保支付">医保支付</option></select></div>
          <div class="rx-total" style="padding:18px 0">应付金额 <strong>${formatCurrency(consultation.consultationFee)}</strong></div>
          <div class="modal-actions"><button class="btn btn-secondary" data-action="close-modal">稍后支付</button><button class="btn btn-primary" data-action="pay-consultation" data-id="${consultation.id}">${icon("checkCircle", "icon-xs")} 确认支付</button></div>
        </div>
      </section>
    </div>`;
}

function summaryModalMarkup(consultation) {
  const patient = patientOf(consultation.patientId);
  const summary = summarizeConsultation(consultation, patient || {});
  const status = consultationStatus(consultation.status);
  return `
    <div class="modal-backdrop" data-action="backdrop-close">
      <section class="modal" role="dialog" aria-modal="true" aria-labelledby="summary-title">
        <header class="modal-head">
          <div class="mini-health-icon" style="width:40px;height:40px">${icon("sparkles")}</div>
          <div class="modal-head-copy"><h2 id="summary-title">AI 病情摘要</h2><p>基于本次问诊对话自动整理</p></div>
          <button class="icon-btn" data-action="close-modal" aria-label="关闭">${icon("x")}</button>
        </header>
        <div class="modal-body">
          <div class="patient-summary">
            <div><span>患者</span><strong>${esc(summary.patientName)}</strong></div>
            <div><span>问诊科室</span><strong>${esc(summary.department)}</strong></div>
            <div><span>症状持续</span><strong>${esc(summary.duration)}</strong></div>
            <div><span>当前状态</span><strong>${esc(status[0])}</strong></div>
            <div><span>对话消息</span><strong>${summary.messageCount} 条</strong></div>
          </div>
          <div class="modal-section">
            <div class="modal-section-title"><span>患者主诉</span><span class="pill teal">对话原文</span></div>
            <p style="font-size:12px;line-height:1.8">${esc(summary.chiefComplaint)}。症状持续时间：${esc(summary.duration)}。</p>
            ${
              summary.patientUpdates.length
                ? `<div class="detail-list" style="margin-top:10px">${summary.patientUpdates.map((content) => `<div class="detail-item"><span>患者补充</span><strong>${esc(content)}</strong></div>`).join("")}</div>`
                : `<p class="muted text-small" style="margin-top:8px">患者暂未补充其他消息。</p>`
            }
          </div>
          <div class="modal-section">
            <div class="modal-section-title"><span>对话提取要点</span><span class="text-small muted">不补充未提及的信息</span></div>
            <div class="detail-list">
              <div class="detail-item"><span>已提及症状</span><strong>${summary.symptoms.length ? esc(summary.symptoms.join("、")) : "现有对话未提取到明确症状关键词"}</strong></div>
              <div class="detail-item"><span>患者自述体温</span><strong>${summary.temperatures.length ? esc([...new Set(summary.temperatures)].join("℃、") + "℃") : "现有对话未记录"}</strong></div>
              <div class="detail-item"><span>危险信号关键词</span><strong>${summary.redFlags.length ? esc(summary.redFlags.join("、")) : "现有对话未出现已记录的危险信号关键词"}</strong></div>
              <div class="detail-item"><span>过敏史</span><strong class="${summary.allergy.includes("无") ? "" : "text-danger"}">${esc(summary.allergy)}</strong></div>
              <div class="detail-item"><span>既往病史</span><strong>${esc(summary.medicalHistory)}</strong></div>
              <div class="detail-item"><span>医生回复</span><strong>${summary.doctorResponses.length ? esc(summary.doctorResponses.join("；")) : "医生尚未回复"}</strong></div>
            </div>
          </div>
          <div class="risk-alert ${summary.redFlags.length ? "red" : ""}"><span>${icon(summary.redFlags.length ? "alert" : "shield", "icon-xs")}</span><div><strong>${summary.redFlags.length ? "实际对话中出现需关注内容" : "摘要基于现有对话提取"}</strong><p>${summary.redFlags.length ? `已提取：${esc(summary.redFlags.join("、"))}。请立即结合患者当前情况判断处置。` : "未提及不等于不存在，摘要不会补充患者未填写或未发送的内容，诊断与处置仍须由医生确认。"}</p></div></div>
          <div class="modal-actions"><button class="btn btn-primary" data-action="close-modal">我已核阅</button></div>
        </div>
      </section>
    </div>`;
}

function searchModalMarkup() {
  return `
    <div class="modal-backdrop" data-action="backdrop-close">
      <section class="modal search-dialog" role="dialog" aria-modal="true" aria-labelledby="search-title">
        <header class="modal-head">
          <div class="modal-head-copy"><h2 id="search-title">全局搜索</h2><p>快速查找医生、药品、用户或处方</p></div>
          <button class="icon-btn" data-action="close-modal" aria-label="关闭">${icon("x")}</button>
        </header>
        <div class="modal-body">
          <div class="global-search-input">${icon("search")}<input id="global-search" autofocus placeholder="输入关键词…" value="${esc(searchQuery)}" /></div>
          <div class="search-results" id="search-results">${searchResultsMarkup(searchQuery)}</div>
        </div>
      </section>
    </div>`;
}

function searchResultsMarkup(query) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return `
      <div class="search-result" data-action="navigate-modal" data-page="prescriptions"><span class="quick-icon">${icon("file", "icon-xs")}</span><div><strong>查看我的处方</strong><span>追踪审核、流转和核销状态</span></div></div>
      <div class="search-result" data-action="navigate-modal" data-page="consultations"><span class="quick-icon">${icon("message", "icon-xs")}</span><div><strong>进入在线问诊</strong><span>继续与医生沟通</span></div></div>
      <div class="search-result" data-action="navigate-modal" data-page="profile"><span class="quick-icon">${icon("user", "icon-xs")}</span><div><strong>健康档案</strong><span>查看过敏与既往病史</span></div></div>`;
  }
  const results = [];
  state.users
    .filter((user) => `${user.realName} ${user.username} ${user.department || ""}`.toLowerCase().includes(normalized))
    .slice(0, 3)
    .forEach((user) =>
      results.push({
        icon: user.role === "DOCTOR" ? "stethoscope" : "user",
        title: user.realName,
        subtitle: `${roleConfig[user.role].label} · ${user.department || user.username}`,
        action: "search-person",
        id: user.id,
      }),
    );
  state.drugs
    .filter((drug) => `${drug.name} ${drug.code} ${drug.manufacturer}`.toLowerCase().includes(normalized))
    .slice(0, 3)
    .forEach((drug) =>
      results.push({
        icon: "pill",
        title: drug.name,
        subtitle: `${drug.code} · ${drug.spec} · ${formatCurrency(drug.price)}`,
        action: "search-drug",
        id: drug.id,
      }),
    );
  state.prescriptions
    .filter((rx) => `${rx.no} ${rx.diagnosis} ${rx.patientName}`.toLowerCase().includes(normalized))
    .slice(0, 3)
    .forEach((rx) =>
      results.push({
        icon: "file",
        title: rx.no,
        subtitle: `${rx.patientName} · ${RX_STATUS_META[rx.status].label} · ${rx.diagnosis || "待完善诊断"}`,
        action: "open-rx",
        id: rx.id,
      }),
    );
  if (!results.length) return emptyState("search", "没有找到相关内容", "尝试搜索姓名、药品名称或处方编号。");
  return results
    .map(
      (result) => `
      <div class="search-result" data-action="${result.action}" data-id="${result.id}">
        <span class="quick-icon">${icon(result.icon, "icon-xs")}</span>
        <div><strong>${esc(result.title)}</strong><span>${esc(result.subtitle)}</span></div>
        ${icon("arrow", "icon-xs")}
      </div>`,
    )
    .join("");
}

function addDrugModalMarkup() {
  return `
    <div class="modal-backdrop" data-action="backdrop-close">
      <section class="modal" role="dialog" aria-modal="true" aria-labelledby="add-drug-title">
        <header class="modal-head">
          <div class="mini-health-icon" style="width:40px;height:40px">${icon("pill")}</div>
          <div class="modal-head-copy"><h2 id="add-drug-title">新增药品</h2><p>录入后会立即出现在医生开方目录中</p></div>
          <button class="icon-btn" data-action="close-modal" aria-label="关闭">${icon("x")}</button>
        </header>
        <div class="modal-body">
          <form id="add-drug-form">
            <div class="form-grid">
              <div class="form-field full"><label for="drug-name">药品名称<span class="required">*</span></label><input id="drug-name" name="name" required placeholder="通用名称" /></div>
              <div class="form-field"><label for="drug-code">药品编号<span class="required">*</span></label><input id="drug-code" name="code" required value="LS-A0${String(state.drugs.length + 18).padStart(3, "0")}" /></div>
              <div class="form-field"><label for="drug-type">药品类型</label><select id="drug-type" name="type"><option value="2">非处方药</option><option value="1">处方药</option></select></div>
              <div class="form-field"><label for="drug-spec">规格<span class="required">*</span></label><input id="drug-spec" name="spec" required placeholder="如：0.5g × 12 片" /></div>
              <div class="form-field"><label for="drug-price">单价（元）</label><input id="drug-price" name="price" type="number" min="0.01" step="0.01" value="19.90" required /></div>
              <div class="form-field full"><label for="drug-manufacturer">生产厂家<span class="required">*</span></label><input id="drug-manufacturer" name="manufacturer" required placeholder="药品生产企业" /></div>
              <div class="form-field full"><label for="drug-approval">批准文号<span class="required">*</span></label><input id="drug-approval" name="approvalNo" required placeholder="国药准字H2026…" /></div>
              <div class="form-field full"><label for="drug-contra">禁忌与注意事项</label><textarea id="drug-contra" name="contraindication" style="min-height:84px" placeholder="用于药师审核与医生开方时提示"></textarea></div>
            </div>
            <div class="modal-actions"><button type="button" class="btn btn-secondary" data-action="close-modal">取消</button><button type="button" class="btn btn-primary" data-action="submit-add-drug">${icon("plus", "icon-xs")} 保存药品</button></div>
          </form>
        </div>
      </section>
    </div>`;
}

function addPharmacyModalMarkup() {
  return `
    <div class="modal-backdrop" data-action="backdrop-close">
      <section class="modal" role="dialog" aria-modal="true" aria-labelledby="add-pharmacy-title">
        <header class="modal-head">
          <div class="mini-health-icon" style="width:40px;height:40px">${icon("building")}</div>
          <div class="modal-head-copy"><h2 id="add-pharmacy-title">新增合作药房</h2><p>保存后即可在药师审核通过时选择该药房</p></div>
          <button class="icon-btn" data-action="close-modal" aria-label="关闭">${icon("x")}</button>
        </header>
        <div class="modal-body">
          <form id="add-pharmacy-form">
            <div class="form-grid">
              <div class="form-field full"><label for="pharmacy-name">药房名称<span class="required">*</span></label><input id="pharmacy-name" name="name" required placeholder="例如：灵枢健康药房 · 浦东店" /></div>
              <div class="form-field"><label for="pharmacy-code">药房编号<span class="required">*</span></label><input id="pharmacy-code" name="code" required value="PH-SH-${String(state.pharmacies.length + 1).padStart(3, "0")}" /></div>
              <div class="form-field"><label for="pharmacy-license">经营许可证编号<span class="required">*</span></label><input id="pharmacy-license" name="licenseNo" required placeholder="药品经营许可证编号" /></div>
              <div class="form-field"><label for="pharmacy-phone">联系电话</label><input id="pharmacy-phone" name="phone" placeholder="021-0000 0000" /></div>
              <div class="form-field"><label for="pharmacy-hours">营业时间</label><input id="pharmacy-hours" name="hours" value="09:00—21:00" /></div>
              <div class="form-field full"><label for="pharmacy-address">药房地址<span class="required">*</span></label><input id="pharmacy-address" name="address" required placeholder="街道、门牌号及楼层" /></div>
              <div class="form-field full"><label for="pharmacy-endpoint">处方流转接口地址</label><input id="pharmacy-endpoint" name="endpoint" placeholder="https://api.example.com/pharmacy" /><span class="field-hint">可暂时留空，后续在药房信息中补充。</span></div>
              <div class="form-field full"><label for="pharmacy-distance">距离说明</label><input id="pharmacy-distance" name="distance" placeholder="例如：3.5km" /></div>
            </div>
            <div class="modal-actions">
              <button type="button" class="btn btn-secondary" data-action="close-modal">取消</button>
              <button type="button" class="btn btn-primary" data-action="submit-add-pharmacy">${icon("plus", "icon-xs")} 保存药房</button>
            </div>
          </form>
        </div>
      </section>
    </div>`;
}

function editProfileModalMarkup(user) {
  return `
    <div class="modal-backdrop" data-action="backdrop-close">
      <section class="modal" role="dialog" aria-modal="true" aria-labelledby="edit-profile-title">
        <header class="modal-head">
          <div class="mini-health-icon" style="width:40px;height:40px">${icon("user")}</div>
          <div class="modal-head-copy"><h2 id="edit-profile-title">修改个人资料</h2><p>健康信息会用于问诊与处方安全校验</p></div>
          <button class="icon-btn" data-action="close-modal" aria-label="关闭">${icon("x")}</button>
        </header>
        <div class="modal-body">
          <form id="edit-profile-form">
            <div class="form-grid">
              <div class="form-field"><label>姓名</label><input name="realName" value="${esc(user.realName)}" required /></div>
              <div class="form-field"><label>性别</label><select name="gender"><option ${user.gender === "女" ? "selected" : ""}>女</option><option ${user.gender === "男" ? "selected" : ""}>男</option><option ${user.gender === "未填写" ? "selected" : ""}>未填写</option></select></div>
              <div class="form-field"><label>年龄</label><input name="age" type="number" min="1" max="120" value="${esc(user.age || "")}" /></div>
              <div class="form-field"><label>血型</label><input name="bloodType" value="${esc(user.bloodType || "")}" placeholder="例如：A 型" /></div>
              <div class="form-field full"><label>身份证号</label><input value="${esc(user.idCardMasked || "未登记")}" readonly aria-describedby="identity-readonly-hint" /><span class="field-hint" id="identity-readonly-hint">身份证号在注册时核验，健康档案中仅展示脱敏号码。</span></div>
              <div class="form-field full"><label>过敏记录</label><input name="allergy" value="${esc(user.allergy || "")}" placeholder="如无过敏请填写“无已知过敏”" /></div>
              <div class="form-field full"><label>既往病史</label><textarea name="medicalHistory" style="min-height:80px">${esc(user.medicalHistory || "")}</textarea></div>
              <div class="form-field full"><label>常用地址<span class="required">*</span></label><input name="address" required minlength="5" value="${esc(user.address || "")}" placeholder="用于药房距离推荐" /></div>
            </div>
            <div class="modal-actions"><button type="button" class="btn btn-secondary" data-action="close-modal">取消</button><button type="button" class="btn btn-primary" data-action="submit-profile">保存资料</button></div>
          </form>
        </div>
      </section>
    </div>`;
}

function pharmacyInventoryModalMarkup(pharmacy) {
  const catalog = pharmacy.catalog || [];
  return `
    <div class="modal-backdrop" data-action="backdrop-close">
      <section class="modal wide" role="dialog" aria-modal="true" aria-labelledby="pharmacy-inventory-title">
        <header class="modal-head">
          <div class="mini-health-icon" style="width:40px;height:40px">${icon("pill")}</div>
          <div class="modal-head-copy"><h2 id="pharmacy-inventory-title">更新药房药品库存</h2><p>${esc(pharmacy.name)} · 库存以本药房目录为准</p></div>
          <button class="icon-btn" data-action="close-modal" aria-label="关闭">${icon("x")}</button>
        </header>
        <div class="modal-body">
          <div class="professional-notice">${icon("activity", "icon-xs")}<div><strong>库存会自动扣减</strong><span>药师核销患者取药后，系统会按处方数量扣减对应药品库存；管理员可在这里补录实际库存。</span></div></div>
          ${
            catalog.length
              ? `<div class="table-wrap" style="margin-top:14px"><table class="data-table"><thead><tr><th>药品</th><th>规格</th><th>单价</th><th>当前库存</th><th>更新库存</th></tr></thead><tbody>${catalog
                  .map(
                    (item) => `<tr data-inventory-row="${esc(item.drugId)}"><td>${esc(item.name)}</td><td>${esc(item.spec)}</td><td>${formatCurrency(item.price)}</td><td>${esc(item.stock)}</td><td><input class="inventory-input" type="number" min="0" step="1" value="${esc(item.stock)}" data-inventory-drug-id="${esc(item.drugId)}" aria-label="${esc(item.name)}库存" /></td></tr>`,
                  )
                  .join("")}</tbody></table></div>`
              : emptyState("pill", "药房目录为空", "请先由药师提交药品目录并完成审核。")
          }
          <div class="modal-actions"><button class="btn btn-secondary" data-action="close-modal">取消</button><button class="btn btn-primary" data-action="save-pharmacy-inventory" data-id="${pharmacy.id}" ${catalog.length ? "" : "disabled"}>${icon("checkCircle", "icon-xs")} 保存库存</button></div>
        </div>
      </section>
    </div>`;
}

async function savePharmacyInventory(pharmacyId) {
  const pharmacy = pharmacyById(pharmacyId);
  if (!pharmacy) return;
  const updates = new Map();
  for (const input of document.querySelectorAll("[data-inventory-drug-id]")) {
    const stock = Number(input.value);
    if (!Number.isInteger(stock) || stock < 0) {
      showToast("库存必须填写为非负整数", "error");
      input.focus();
      return;
    }
    updates.set(input.dataset.inventoryDrugId, stock);
  }
  const now = new Date().toISOString();
  pharmacy.catalog = (pharmacy.catalog || []).map((item) => {
    if (!updates.has(item.drugId)) return item;
    const stock = updates.get(item.drugId);
    return { ...item, stock, enabled: stock > 0, updatedAt: now };
  });
  pharmacy.catalogUpdatedAt = now;
  pharmacy.inventoryUpdatedAt = now;

  for (const [drugId, stock] of updates) {
    const drug = state.drugs.find((item) => item.id === drugId);
    if (!drug) continue;
    drug.pharmacyOffers = (drug.pharmacyOffers || []).map((offer) =>
      offer.pharmacyId === pharmacy.id
        ? { ...offer, stock, enabled: stock > 0, updatedAt: now }
        : offer,
    );
    drug.stock = drug.pharmacyOffers.reduce(
      (total, offer) => total + Math.max(0, Number(offer.stock) || 0),
      0,
    );
    drug.enabled = drug.stock > 0;
    drug.lastStockUpdatedAt = now;
  }
  try {
    const saved = await saveState(state);
    state = saved.state;
    closeModal();
    render();
    showToast("药房药品库存已更新，管理员可实时查看");
  } catch (error) {
    state = await loadState().catch(() => state);
    render();
    showToast(error.message || "库存更新失败", "error");
  }
}

function assignPharmacyModalMarkup(user) {
  return `
    <div class="modal-backdrop" data-action="backdrop-close">
      <section class="modal narrow" role="dialog" aria-modal="true">
        <header class="modal-head">
          <div class="modal-head-copy"><h2>分配所属药房</h2><p>${esc(user.realName)} · ${esc(user.pharmacistNo || "药师")}</p></div>
          <button class="icon-btn" data-action="close-modal" aria-label="关闭">${icon("x")}</button>
        </header>
        <div class="modal-body">
          <div class="form-field"><label>所属药房</label><select id="assigned-pharmacy">${state.pharmacies.filter((item) => item.status).map((item) => `<option value="${item.id}" ${user.pharmacyId === item.id ? "selected" : ""}>${esc(item.name)}</option>`).join("")}</select></div>
          <div class="modal-actions"><button class="btn btn-secondary" data-action="close-modal">取消</button><button class="btn btn-primary" data-action="submit-assign-pharmacy" data-id="${user.id}">保存归属</button></div>
        </div>
      </section>
    </div>`;
}

function saveProfileFromForm(form) {
  if (!form.reportValidity()) return;
  const user = currentUser();
  const data = Object.fromEntries(new FormData(form));
  if (user.role === "PATIENT" && String(data.address || "").trim().length < 5) {
    showToast("请填写至少 5 个字符的常用地址", "error");
    return;
  }
  user.realName = String(data.realName || "").trim();
  user.gender = data.gender;
  user.age = Number(data.age) || null;
  user.bloodType = String(data.bloodType || "").trim();
  user.allergy = String(data.allergy || "").trim();
  user.medicalHistory = String(data.medicalHistory || "").trim();
  user.address = String(data.address || "").trim();
  persist();
  closeModal();
  render();
  showToast("个人资料已更新");
}

async function loginAs(username, password) {
  try {
    const result = await apiLogin(username, password);
    lastLoginCode = "";
    lastLoginError = "";
    const user = result.user;
    session = {
      userId: user.id,
      role: user.role,
      loginAt: new Date().toISOString(),
      expiresAt: result.expiresAt,
    };
    state = await loadState();
    activePage = roleConfig[user.role].home;
    notificationsOpen = false;
    triageResult = null;
    selectedTriageDoctorId = null;
    rxFilter = "all";
    userRoleFilter = "ALL";
    listQuery = "";
    render();
    startStateSync();
    showToast(`欢迎回来，${user.realName}`);
    return true;
  } catch (error) {
    lastLoginError = error.message || "登录失败";
    lastLoginCode = error.code || "";
    showToast(error.message || "登录失败，请检查账号与密码", "error");
    return false;
  }
}

async function handleLogin(form) {
  const identifier = form.identifier?.value.trim();
  const password = form.password?.value;
  const error = document.getElementById("login-error");
  const success = await loginAs(identifier, password);
  if (success) {
    loginAttempts = 0;
    return;
  }
  if (lastLoginCode === "INVALID_CREDENTIALS") loginAttempts += 1;
  if (error) {
    error.textContent = lastLoginError || "账号或密码不正确，请检查后重试。";
    error.classList.add("show");
  }
  if (loginAttempts >= 5) {
    form.querySelectorAll("input, button").forEach((element) => (element.disabled = true));
  }
}

function sendMessage(form) {
  const consultation = state.consultations.find((item) => item.id === form.dataset.id);
  const content = form.message.value.trim();
  const user = currentUser();
  if (!consultation || !content) return;
  if (consultation.paymentStatus !== "paid" || consultation.status === "awaiting_payment") {
    showToast("请先支付问诊费，支付成功后医生才能接诊并开始对话", "error");
    return;
  }
  consultation.messages.push({
    id: `msg-${Date.now()}`,
    sender: user.role === "PATIENT" ? "patient" : "doctor",
    senderName: user.realName,
    content,
    time: new Date().toISOString(),
  });
  consultation.updatedAt = new Date().toISOString();
  consultation.status = "active";
  persist();
  render();
}

function startTriageConsultation() {
  const user = currentUser();
  if (!triageResult) return;
  const requestedDoctorId = document.querySelector(
    '[data-action="start-triage-consult"]',
  )?.dataset.doctorId;
  const doctor = recommendedDoctorsForTriage(triageResult).find(
    (item) => item.id === (requestedDoctorId || selectedTriageDoctorId),
  );
  if (!doctor) {
    showToast(
      `当前${triageResult.department}及备选科室暂无可接诊医生，请稍后再试`,
      "error",
    );
    return;
  }
  const symptoms = document.getElementById("triage-symptoms")?.value.trim() || state.triageSessions[0]?.symptoms || "身体不适";
  const duration = document.getElementById("triage-duration")?.value || "3天";
  const existing = state.consultations.find(
    (item) =>
      item.patientId === user.id &&
      item.doctorId === doctor.id &&
      ["awaiting_payment", "waiting", "active"].includes(item.status),
  );
  let consultation = existing;
  if (!consultation) {
    consultation = {
      id: `c-${Date.now()}`,
      no: `CS20261124${String(state.consultations.length + 30).padStart(4, "0")}`,
      patientId: user.id,
      patientName: user.realName,
      doctorId: doctor.id,
      doctorName: doctor.realName,
      department: doctor.department || triageResult.department,
      chiefComplaint: symptoms,
      symptomDuration: duration,
      status: "awaiting_payment",
      paymentStatus: "unpaid",
      consultationFee: Number(doctor.consultFee) || 29.9,
      patientAddress: user.address || "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      unread: 1,
      messages: [
        {
          id: `msg-${Date.now()}`,
          sender: "patient",
          senderName: user.realName,
          content: symptoms,
          time: new Date().toISOString(),
        },
      ],
    };
    state.consultations.push(consultation);
  }
  state.triageSessions.unshift({
    id: `triage-${Date.now()}`,
    patientId: user.id,
    symptoms,
    duration,
    department: triageResult.department,
    riskLevel: triageResult.riskLevel,
    createdAt: new Date().toISOString(),
  });
  persist();
  selectedConsultation = consultation.id;
  activePage = "consultations";
  triageResult = null;
  selectedTriageDoctorId = null;
  render();
  if (consultation.status === "awaiting_payment") {
    openPaymentModal(consultation.id);
  } else {
    showToast(`已为你匹配${doctor.realName}医生`);
  }
}

function downloadCsv(filename, rows) {
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
  showToast(`已导出 ${filename}`);
}

function renderFilteredPage(action) {
  const value = listQuery;
  render();
  const input = document.querySelector(`[data-action="${action}"]`);
  if (input) {
    input.focus();
    input.setSelectionRange?.(value.length, value.length);
  }
}

function saveDrugFromForm(form) {
  if (!form.reportValidity()) return;
  const data = Object.fromEntries(new FormData(form));
  if (state.drugs.some((drug) => drug.code === data.code || drug.approvalNo === data.approvalNo)) {
    showToast("药品编号或批准文号已存在", "error");
    return;
  }
  state.drugs.unshift({
    id: `drg-${Date.now()}`,
    code: data.code.trim(),
    name: data.name.trim(),
    spec: data.spec.trim(),
    manufacturer: data.manufacturer.trim(),
    approvalNo: data.approvalNo.trim(),
    type: Number(data.type),
    price: Number(data.price),
    contraindication: data.contraindication.trim() || "暂无特别说明",
    enabled: true,
    stock: 500,
  });
  persist();
  closeModal();
  activePage = "drugs";
  listQuery = "";
  render();
  showToast(`${data.name}已加入药品目录`);
}

function savePharmacyFromForm(form) {
  if (!form.reportValidity()) return;
  const data = Object.fromEntries(new FormData(form));
  if (
    state.pharmacies.some(
      (pharmacy) => pharmacy.code === data.code || pharmacy.licenseNo === data.licenseNo,
    )
  ) {
    showToast("药房编号或经营许可证编号已存在", "error");
    return;
  }
  const endpoint = data.endpoint?.trim() || "";
  if (endpoint && !/^https?:\/\//i.test(endpoint)) {
    showToast("接口地址必须以 http:// 或 https:// 开头", "error");
    return;
  }
  state.pharmacies.unshift({
    id: `ph-${Date.now()}`,
    code: data.code.trim(),
    name: data.name.trim(),
    address: data.address.trim(),
    phone: data.phone.trim(),
    licenseNo: data.licenseNo.trim(),
    status: 1,
    endpoint,
    distance: data.distance.trim(),
    hours: data.hours.trim() || "09:00—21:00",
  });
  persist();
  closeModal();
  activePage = "pharmacies";
  listQuery = "";
  render();
  showToast(`${data.name}已加入合作药房`);
}

async function handleClick(event) {
  const target = event.target.closest("[data-action]");
  if (!target) return;
  const action = target.dataset.action;

  if (action === "backdrop-close") {
    if (event.target === target) closeModal();
    return;
  }

  switch (action) {
    case "navigate":
      activePage = target.dataset.page;
      sidebarOpen = false;
      notificationsOpen = false;
      listQuery = "";
      if (activePage === "prescriptions" || activePage === "review") rxFilter = "all";
      render();
      window.scrollTo({ top: 0, behavior: "smooth" });
      break;
    case "navigate-modal":
      closeModal();
      activePage = target.dataset.page;
      render();
      break;
    case "open-register":
      openRegistration();
      break;
    case "registration-role":
      registrationDraft.role = target.dataset.value;
      registrationDraft.error = "";
      modalRoot.innerHTML = registrationMarkup();
      break;
    case "send-register-code":
      sendRegistrationCode();
      break;
    case "verify-register-code":
      verifyRegistrationPhone();
      break;
    case "registration-next":
      handleRegistrationNext();
      break;
    case "registration-back":
      handleRegistrationBack();
      break;
    case "pick-registration-location": {
      syncRegistrationDraft();
      const rect = target.getBoundingClientRect();
      const x = Math.min(10, Math.max(0, ((event.clientX - rect.left) / rect.width) * 10));
      const y = Math.min(10, Math.max(0, ((event.clientY - rect.top) / rect.height) * 10));
      const location = {
        x: Number(x.toFixed(1)),
        y: Number(y.toFixed(1)),
      };
      if (target.dataset.locationTarget === "pharmacy") {
        registrationDraft.pharmacyMapLocation = location;
      } else {
        registrationDraft.mapLocation = location;
      }
      registrationDraft.error = "";
      modalRoot.innerHTML = registrationMarkup();
      break;
    }
    case "clear-registration-location":
      syncRegistrationDraft();
      if (target.dataset.locationTarget === "pharmacy") {
        registrationDraft.pharmacyMapLocation = null;
      } else {
        registrationDraft.mapLocation = null;
      }
      modalRoot.innerHTML = registrationMarkup();
      break;
    case "submit-registration":
      submitRegistrationFlow();
      break;
    case "registration-return-login":
      {
        const requiresApproval = Boolean(registrationDraft?.requiresApproval);
      closeModal();
      render();
      showToast(
        requiresApproval
          ? "资质审核通过后即可登录"
          : "账号创建成功，请使用新账号登录",
      );
      }
      break;
    case "review-registration":
      openRegistrationReview(target.dataset.id);
      break;
    case "submit-registration-review":
      submitRegistrationReview(target.dataset.id);
      break;
    case "preview-qualification":
      previewQualification(target.dataset.id);
      break;
    case "preview-drug-catalog":
      previewRegistrationDrugCatalog(target.dataset.id);
      break;
    case "retry-bootstrap":
      bootstrapApplication();
      break;
    case "toggle-password": {
      const input = document.getElementById("login-password");
      if (input) {
        input.type = input.type === "password" ? "text" : "password";
        target.innerHTML = icon(input.type === "password" ? "eye" : "eyeOff", "icon-xs");
      }
      break;
    }
    case "login-mode":
      loginMode = target.dataset.mode === "phone" ? "phone" : "account";
      render();
      break;
    case "forgot-password":
      openPasswordReset();
      break;
    case "send-reset-code":
      sendPasswordResetCode();
      break;
    case "submit-password-reset":
      submitPasswordReset();
      break;
    case "password-reset-return":
      closeModal();
      render();
      showToast("请使用新密码登录");
      break;
    case "logout":
      await apiLogout();
      stopStateSync();
      session = null;
      state = null;
      activePage = null;
      loginMode = "account";
      qualificationResubmitMode = false;
      qualificationResubmitDraft = null;
      closeModal();
      render();
      break;
    case "refresh-state": {
      const refreshed = await refreshSharedState({ force: true, notify: true });
      showToast(refreshed ? "问诊数据已刷新" : "当前已是最新数据");
      break;
    }
    case "open-sidebar":
      sidebarOpen = true;
      render();
      break;
    case "close-sidebar":
      sidebarOpen = false;
      render();
      break;
    case "toggle-notifications":
      notificationsOpen = !notificationsOpen;
      render();
      break;
    case "read-all":
      state.notifications.forEach((item) => {
        if (item.role === currentUser().role) item.unread = false;
      });
      persist();
      notificationsOpen = false;
      render();
      showToast("通知已全部标记为已读");
      break;
    case "open-search":
      searchQuery = "";
      modalRoot.innerHTML = searchModalMarkup();
      requestAnimationFrame(() => document.getElementById("global-search")?.focus());
      break;
    case "fill-symptom": {
      const textarea = document.getElementById("triage-symptoms");
      if (textarea) {
        textarea.value = textarea.value ? `${textarea.value}、${target.dataset.value}` : target.dataset.value;
        textarea.focus();
      }
      break;
    }
    case "severity": {
      const input = document.getElementById("triage-severity");
      if (input) input.value = target.dataset.value;
      target.closest(".choice-row")?.querySelectorAll(".choice-chip").forEach((item) => item.classList.remove("active"));
      target.classList.add("active");
      break;
    }
    case "reset-triage":
      triageResult = null;
      selectedTriageDoctorId = null;
      render();
      break;
    case "select-triage-doctor": {
      const doctor = recommendedDoctorsForTriage(triageResult).find(
        (item) => item.id === target.dataset.doctorId,
      );
      if (!doctor) return;
      selectedTriageDoctorId = doctor.id;
      const resultRoot = document.getElementById("triage-result");
      if (resultRoot) resultRoot.innerHTML = triageResultMarkup();
      break;
    }
    case "start-triage-consult":
      startTriageConsultation();
      break;
    case "select-consultation":
      selectedConsultation = target.dataset.id;
      render();
      break;
    case "open-consultation":
      selectedConsultation = target.dataset.id;
      activePage = "consultations";
      render();
      break;
    case "consult-filter": {
      const value = target.dataset.value;
      target.closest(".filter-pills")?.querySelectorAll(".filter-pill").forEach((item) => item.classList.remove("active"));
      target.classList.add("active");
      document.querySelectorAll(".convo-item").forEach((item) => {
        const status = item.querySelector(".pill")?.textContent.trim();
        item.classList.toggle("hidden", value === "active" ? status !== "问诊中" : value === "waiting" ? status !== "待接诊" : false);
      });
      break;
    }
    case "consult-summary": {
      const consultation = state.consultations.find((item) => item.id === target.dataset.id);
      if (consultation) modalRoot.innerHTML = summaryModalMarkup(consultation);
      break;
    }
    case "patient-details": {
      const patient = patientOf(target.dataset.id) || currentUser();
      if (patient) modalRoot.innerHTML = patientDetailsModalMarkup(patient);
      break;
    }
    case "admin-view-consultation": {
      const consultation = state.consultations.find((item) => item.id === target.dataset.id);
      if (consultation) modalRoot.innerHTML = adminConsultationModalMarkup(consultation);
      break;
    }
    case "accept-consultation": {
      const consultation = state.consultations.find((item) => item.id === target.dataset.id);
      if (!consultation) return;
      if (consultation.paymentStatus !== "paid" || consultation.status !== "waiting") {
        showToast("该问诊尚未完成支付，暂不能接诊", "error");
        return;
      }
      consultation.status = "active";
      consultation.startedAt = new Date().toISOString();
      consultation.updatedAt = new Date().toISOString();
      persist();
      render();
      showToast("已接受问诊，可以开始图文沟通");
      break;
    }
    case "open-payment":
      openPaymentModal(target.dataset.id);
      break;
    case "pay-consultation": {
      const consultation = state.consultations.find((item) => item.id === target.dataset.id);
      if (!consultation) return;
      consultation.status = "waiting";
      consultation.paymentStatus = "paid";
      consultation.paymentMethod = document.getElementById("payment-method")?.value || "在线支付";
      consultation.paidAt = new Date().toISOString();
      consultation.transactionNo = `PAY${Date.now()}`;
      consultation.updatedAt = new Date().toISOString();
      persist();
      closeModal();
      render();
      showToast("支付成功，问诊已发送给医生");
      break;
    }
    case "finish-consult": {
      const consultation = state.consultations.find((item) => item.id === target.dataset.id);
      if (!consultation) return;
      const existing = state.prescriptions.find(
        (rx) => rx.consultationId === consultation.id && rx.status !== RX_STATUS.VOID,
      );
      consultation.status = "ended";
      consultation.updatedAt = new Date().toISOString();
      persist();
      if (existing) {
        render();
        openRxModal(existing.id);
        showToast("问诊已结束，正在打开关联处方");
      } else {
        render();
        openRxEditor(null, consultation.id);
        showToast("问诊已结束，请完成本次处方");
      }
      break;
    }
    case "prescription-from-consult": {
      const rx = state.prescriptions.find(
        (item) => item.consultationId === target.dataset.id && item.status !== RX_STATUS.VOID,
      );
      if (rx) openRxModal(rx.id);
      else openRxEditor(null, target.dataset.id);
      break;
    }
    case "new-prescription":
      openRxEditor();
      break;
    case "open-rx":
      if (modalRoot.innerHTML) closeModal();
      openRxModal(target.dataset.id);
      break;
    case "close-modal":
      closeModal();
      break;
    case "rx-filter":
      rxFilter = target.dataset.value;
      render();
      break;
    case "edit-rx":
      openRxEditor(target.dataset.id);
      break;
    case "add-rx-item": {
      syncEditorFromDOM();
      const drugId = document.getElementById("new-drug-select")?.value;
      const drug = state.drugs.find((item) => item.id === drugId);
      if (!drug) return;
      if (editorState.items.some((item) => item.drugId === drug.id)) {
        showToast("该药品已在处方中", "error");
        return;
      }
      editorState.items.push({
        drugId: drug.id,
        name: drug.name,
        spec: drug.spec,
        price: drug.price,
        quantity: 1,
        dosage: drug.spec.includes("袋") ? "1 袋" : "1 片",
        frequency: "每日 2 次",
      });
      modalRoot.innerHTML = editorMarkup();
      break;
    }
    case "remove-rx-item":
      syncEditorFromDOM();
      editorState.items.splice(Number(target.dataset.index), 1);
      modalRoot.innerHTML = editorMarkup();
      break;
    case "save-rx":
      savePrescriptionDraft(false);
      break;
    case "submit-rx-editor":
      savePrescriptionDraft(true);
      break;
    case "perform-review":
      performReview(target.dataset.id);
      break;
    case "select-prescription-pharmacy":
      await selectPrescriptionPharmacy(target.dataset.id);
      break;
    case "pay-prescription": {
      const rx = state.prescriptions.find((item) => item.id === target.dataset.id);
      if (!rx) return;
      try {
        const method = document.getElementById("rx-payment-method")?.value || "在线支付";
        const selectedPharmacyId =
          document.getElementById("patient-pharmacy-choice")?.value ||
          rx.pharmacyId;
        const selectedPharmacy = pharmacyById(selectedPharmacyId);
        const patient = patientOf(rx.patientId);
        const selectedQuote = selectedPharmacy
          ? quotePrescriptionAtPharmacy(
              selectedPharmacy,
              rx.items,
              state.drugs,
              patient?.address || "",
              patient?.mapLocation || null,
            )
          : null;
        if (!selectedPharmacy || selectedPharmacy.status !== 1 || !selectedQuote?.available) {
          throw new Error("所选药房无法配齐该处方，请选择其他药房");
        }
        const next = transitionPrescription(rx, "pay", {
          paymentMethod: method,
          pickupCode: `LS-${Math.floor(1000 + Math.random() * 9000)}`,
          transactionNo: `RXPAY${Date.now()}`,
        });
        next.pharmacyId = selectedPharmacy.id;
        next.pharmacyQuote = {
          estimatedPrice: selectedQuote.estimatedPrice,
          distanceKm: selectedQuote.distanceKm,
          items: selectedQuote.quoteItems,
        };
        next.pharmacySelectedAt = new Date().toISOString();
        state.prescriptions = state.prescriptions.map((item) =>
          item.id === next.id ? next : item,
        );
        state.notifications.unshift({
          id: `note-${Date.now()}`,
          role: "PHARMACIST",
          icon: "bag",
          title: "患者已完成处方支付",
          content: `${rx.no} 已支付药费，患者选择${selectedPharmacy.name}取药。`,
          time: "刚刚",
          unread: true,
        });
        persist();
        closeModal();
        render();
        showToast(`支付成功，取药码 ${next.pickupCode}`);
      } catch (error) {
        showToast(error.message, "error");
      }
      break;
    }
    case "complete-dispense":
      await completeDispense(target.dataset.id);
      break;
    case "open-add-drug":
      modalRoot.innerHTML = addDrugModalMarkup();
      break;
    case "open-add-pharmacy":
      modalRoot.innerHTML = addPharmacyModalMarkup();
      break;
    case "edit-pharmacy-inventory": {
      const pharmacy = pharmacyById(target.dataset.id);
      if (pharmacy) modalRoot.innerHTML = pharmacyInventoryModalMarkup(pharmacy);
      break;
    }
    case "save-pharmacy-inventory":
      await savePharmacyInventory(target.dataset.id);
      break;
    case "refresh-audit":
      loadAuditLogsIntoPage();
      break;
    case "open-edit-profile":
      modalRoot.innerHTML = editProfileModalMarkup(currentUser());
      break;
    case "assign-pharmacy": {
      const user = state.users.find((item) => item.id === target.dataset.id);
      if (user) modalRoot.innerHTML = assignPharmacyModalMarkup(user);
      break;
    }
    case "submit-assign-pharmacy": {
      const user = state.users.find((item) => item.id === target.dataset.id);
      const pharmacyId = document.getElementById("assigned-pharmacy")?.value;
      if (!user) return;
      user.pharmacyId = pharmacyId;
      persist();
      closeModal();
      render();
      showToast(`已分配至${pharmacyById(pharmacyId)?.name || "所选药房"}`);
      break;
    }
    case "submit-add-drug": {
      const form = document.getElementById("add-drug-form");
      if (form) saveDrugFromForm(form);
      break;
    }
    case "submit-add-pharmacy": {
      const form = document.getElementById("add-pharmacy-form");
      if (form) savePharmacyFromForm(form);
      break;
    }
    case "submit-profile": {
      const form = document.getElementById("edit-profile-form");
      if (form) saveProfileFromForm(form);
      break;
    }
    case "submit-qualification-resubmit":
      submitQualificationResubmit();
      break;
    case "toggle-user": {
      const user = state.users.find((item) => item.id === target.dataset.id);
      if (!user) return;
      if (user.id === currentUser().id) {
        showToast("不能停用当前登录账号", "error");
        return;
      }
      user.status = user.status === 1 ? 0 : 1;
      persist();
      render();
      showToast(`${user.realName}的账号已${user.status === 1 ? "启用" : "停用"}`);
      break;
    }
    case "toggle-drug": {
      const drug = state.drugs.find((item) => item.id === target.dataset.id);
      if (!drug) return;
      drug.enabled = !drug.enabled;
      persist();
      render();
      showToast(`${drug.name}已${drug.enabled ? "启用" : "停用"}`);
      break;
    }
    case "toggle-pharmacy": {
      const pharmacy = state.pharmacies.find((item) => item.id === target.dataset.id);
      if (!pharmacy) return;
      if (
        pharmacy.status === 1 &&
        !window.confirm(
          `停用“${pharmacy.name}”后，该药房将停止接收新处方，关联药师也不能审核或核销。确认停用吗？`,
        )
      ) {
        return;
      }
      pharmacy.status = pharmacy.status ? 0 : 1;
      state.notifications.unshift({
        id: `note-${Date.now()}`,
        role: "PHARMACIST",
        icon: pharmacy.status ? "checkCircle" : "alert",
        title: pharmacy.status ? "所属药房已启用" : "所属药房已停用",
        content: pharmacy.status
          ? `${pharmacy.name} 已恢复合作，可以继续审核处方。`
          : `${pharmacy.name} 已被管理员停用，暂时不能审核或核销处方。`,
        time: "刚刚",
        unread: true,
      });
      persist();
      render();
      showToast(`${pharmacy.name}已${pharmacy.status ? "启用" : "停用"}`);
      break;
    }
    case "filter-role":
      userRoleFilter = target.dataset.value;
      render();
      break;
    case "reset-demo":
      if (window.confirm("确定重置全部业务数据吗？该操作将恢复系统初始状态。")) {
        try {
          await resetState();
        } catch (error) {
          showToast(error.message || "重置失败", "error");
          break;
        }
        state = null;
        session = null;
        activePage = null;
        rxFilter = "all";
        listQuery = "";
        render();
        showToast("系统数据已重置，请重新登录");
      }
      break;
    case "export-users":
      downloadCsv("灵枢用户列表.csv", [
        ["姓名", "账号", "角色", "手机号", "状态"],
        ...state.users.map((user) => [user.realName, user.username, roleConfig[user.role].label, user.phone, user.status ? "正常" : "停用"]),
      ]);
      break;
    case "export-drugs":
      downloadCsv("灵枢药品目录.csv", [
        ["药品编号", "药品名称", "规格", "生产厂家", "单价", "库存", "状态"],
        ...state.drugs.map((drug) => [drug.code, drug.name, drug.spec, drug.manufacturer, drug.price, drug.stock, drug.enabled ? "启用" : "停用"]),
      ]);
      break;
    case "search-drug":
      if (currentUser().role === "ADMIN") {
        closeModal();
        listQuery = state.drugs.find((item) => item.id === target.dataset.id)?.name || "";
        activePage = "drugs";
        render();
      } else {
        showToast("药品详情已由药师与管理员统一维护");
      }
      break;
    case "search-person": {
      const person = state.users.find((item) => item.id === target.dataset.id);
      if (!person) return;
      if (currentUser().role === "ADMIN") {
        closeModal();
        activePage = "users";
        listQuery = person.realName;
        render();
      } else {
        showToast(`${person.realName} · ${person.department || roleConfig[person.role].label}`);
      }
      break;
    }
    case "coming-soon":
      showToast("该辅助功能已纳入下一迭代，当前原型未开放");
      break;
    default:
      break;
  }
}

function handleSubmit(event) {
  if (event.target.id === "login-form") {
    event.preventDefault();
    handleLogin(event.target);
    return;
  }

  if (event.target.id === "triage-form") {
    event.preventDefault();
    const formData = new FormData(event.target);
    const symptoms = String(formData.get("symptoms") || "").trim();
    if (symptoms.length < 4) {
      showToast("请至少描述 4 个字的症状", "error");
      return;
    }
    const submitButton = event.target.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.innerHTML = `${icon("activity", "icon-xs")} 正在分析症状…`;
    setTimeout(() => {
      triageResult = triageSymptoms(symptoms, String(formData.get("duration") || ""), String(formData.get("severity") || "mild"));
      selectedTriageDoctorId = null;
      const resultRoot = document.getElementById("triage-result");
      if (resultRoot) resultRoot.innerHTML = triageResultMarkup();
      submitButton.disabled = false;
      submitButton.innerHTML = `${icon("sparkles", "icon-xs")} 重新生成分诊建议`;
      showToast("分诊建议已生成");
    }, 650);
    return;
  }

  if (event.target.id === "message-form") {
    event.preventDefault();
    sendMessage(event.target);
    return;
  }

  if (event.target.id === "add-drug-form") {
    event.preventDefault();
    saveDrugFromForm(event.target);
  }
  if (event.target.id === "add-pharmacy-form") {
    event.preventDefault();
    savePharmacyFromForm(event.target);
  }
  if (event.target.id === "edit-profile-form") {
    event.preventDefault();
    saveProfileFromForm(event.target);
  }
}

function handleInput(event) {
  const action = event.target.dataset.action;
  if (!action) return;
  if (action === "filter-prescriptions") {
    listQuery = event.target.value;
    renderFilteredPage(action);
  }
  if (action === "filter-users") {
    listQuery = event.target.value;
    renderFilteredPage(action);
  }
  if (action === "filter-drugs") {
    listQuery = event.target.value;
    renderFilteredPage(action);
  }
  if (action === "filter-consults") {
    const query = event.target.value.trim().toLowerCase();
    document.querySelectorAll(".convo-item").forEach((item) => {
      item.classList.toggle("hidden", query && !String(item.dataset.search || "").toLowerCase().includes(query));
    });
  }
  if (action === "global-search") {
    searchQuery = event.target.value;
    const results = document.getElementById("search-results");
    if (results) results.innerHTML = searchResultsMarkup(searchQuery);
  }
  if (action === "filter-rx-drugs") {
    const query = event.target.value.trim().toLowerCase();
    const select = document.getElementById("new-drug-select");
    if (!select) return;
    let firstVisible = null;
    [...select.options].forEach((option) => {
      const searchable = `${option.dataset.search || ""} ${option.textContent}`.toLowerCase();
      option.hidden = Boolean(query) && !searchable.includes(query);
      if (!option.hidden && !firstVisible) firstVisible = option;
    });
    if (firstVisible) select.value = firstVisible.value;
  }
}

function handleChange(event) {
  if (event.target.id === "registration-document") {
    handleRegistrationFile(event.target);
  }
  if (event.target.id === "registration-catalog") {
    handlePharmacyCatalogFile(event.target);
  }
  if (event.target.id === "resubmit-document") {
    handleQualificationResubmitFile(event.target);
  }
  if (event.target.id === "rx-consultation") {
    syncEditorFromDOM();
    modalRoot.innerHTML = editorMarkup();
    document.getElementById("rx-consultation")?.focus();
  }
  if (event.target.id === "new-drug-select" && event.target.value) {
    const error = document.getElementById("rx-editor-error");
    error?.classList.remove("show");
  }
  if (event.target.id === "patient-pharmacy-choice") {
    const pharmacyId = event.target.value;
    const rxId = event.target.dataset.rxId;
    const rx = state.prescriptions.find((item) => item.id === rxId);
    if (rx) {
      patientPharmacySelection = { rxId, pharmacyId };
      modalRoot.innerHTML = rxModalMarkup(rx);
    }
  }
}

app.addEventListener("click", handleClick);
app.addEventListener("submit", handleSubmit);
app.addEventListener("input", handleInput);
app.addEventListener("change", handleChange);
modalRoot.addEventListener("click", handleClick);
modalRoot.addEventListener("submit", handleSubmit);
modalRoot.addEventListener("change", handleChange);
document.addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k" && session) {
    event.preventDefault();
    modalRoot.innerHTML = searchModalMarkup();
    requestAnimationFrame(() => document.getElementById("global-search")?.focus());
  }
  if (event.key === "Escape") {
    if (modalRoot.innerHTML) closeModal();
    else if (notificationsOpen) {
      notificationsOpen = false;
      render();
    }
  }
});
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    refreshSharedState({ force: true, notify: true });
  }
});

async function bootstrapApplication() {
  app.innerHTML = loadingMarkup();
  try {
    session = await loadSession();
    state = session ? await loadState() : null;
    if (session && !currentUser()) {
      session = null;
      state = null;
    }
  } catch (error) {
    session = null;
    state = null;
    app.innerHTML = bootstrapErrorMarkup(error.message || "请确认后端服务已启动");
    return;
  }
  if (!activePage && session) {
    activePage = roleConfig[session.role]?.home || "overview";
  }
  render();
  if (session) startStateSync();
  else stopStateSync();
}

bootstrapApplication();
