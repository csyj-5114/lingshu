export const RX_STATUS = Object.freeze({
  DRAFT: "draft",
  PENDING_PHARMACY: "pending_pharmacy",
  PENDING_REVIEW: "pending_review",
  PENDING_PAYMENT: "pending_payment",
  TRANSFERRED: "transferred",
  DISPENSED: "dispensed",
  VOID: "void",
});

export const RX_STATUS_META = Object.freeze({
  [RX_STATUS.DRAFT]: { label: "待开具", tone: "amber", step: 0 },
  [RX_STATUS.PENDING_PHARMACY]: { label: "待选药房", tone: "blue", step: 1 },
  [RX_STATUS.PENDING_REVIEW]: { label: "待审核", tone: "blue", step: 2 },
  [RX_STATUS.PENDING_PAYMENT]: { label: "待支付", tone: "amber", step: 3 },
  [RX_STATUS.TRANSFERRED]: { label: "已流转", tone: "teal", step: 4 },
  [RX_STATUS.DISPENSED]: { label: "已核销", tone: "green", step: 5 },
  [RX_STATUS.VOID]: { label: "已作废", tone: "red", step: -1 },
});

const TRANSITIONS = Object.freeze({
  submit: {
    from: [RX_STATUS.DRAFT],
    to: RX_STATUS.PENDING_PHARMACY,
  },
  select_pharmacy: {
    from: [RX_STATUS.PENDING_PHARMACY],
    to: RX_STATUS.PENDING_REVIEW,
  },
  approve: {
    from: [RX_STATUS.PENDING_REVIEW],
    to: RX_STATUS.PENDING_PAYMENT,
  },
  reject: {
    from: [RX_STATUS.PENDING_REVIEW],
    to: RX_STATUS.VOID,
  },
  pay: {
    from: [RX_STATUS.PENDING_PAYMENT],
    to: RX_STATUS.TRANSFERRED,
  },
  dispense: {
    from: [RX_STATUS.TRANSFERRED],
    to: RX_STATUS.DISPENSED,
  },
});

export function prescriptionTotal(items = []) {
  return Number(
    items
      .reduce((total, item) => total + Number(item.price) * Number(item.quantity), 0)
      .toFixed(2),
  );
}

export function parseDistanceKm(value, fallback = 5) {
  const text = String(value || "").trim();
  const kilometers = text.match(/(\d+(?:\.\d+)?)\s*km\b/i);
  if (kilometers) return Number(kilometers[1]);
  const meters = text.match(/(\d+(?:\.\d+)?)\s*m\b/i);
  if (meters) return Number(meters[1]) / 1000;
  return fallback;
}

export function estimateAddressDistance(patientAddress, pharmacyAddress) {
  if (!patientAddress || !pharmacyAddress) return 5;
  const district = (address) => address.match(/([\u4e00-\u9fa5]{2,8}(?:区|县))/)?.[1] || "";
  const city = (address) => address.match(/([\u4e00-\u9fa5]{2,8}市)/)?.[1] || "";
  const seed = [...`${patientAddress}${pharmacyAddress}`].reduce(
    (total, char) => total + char.charCodeAt(0),
    0,
  );
  if (district(patientAddress) && district(patientAddress) === district(pharmacyAddress)) {
    return 1.2 + (seed % 18) / 10;
  }
  if (city(patientAddress) && city(patientAddress) === city(pharmacyAddress)) {
    return 3.5 + (seed % 35) / 10;
  }
  return 8 + (seed % 50) / 10;
}

export function normalizeMapLocation(location) {
  const x = Number(location?.x);
  const y = Number(location?.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return {
    x: Number(x.toFixed(3)),
    y: Number(y.toFixed(3)),
  };
}

export function mapDistanceKm(left, right) {
  if (!left || !right) return null;
  const x = Number(left.x);
  const y = Number(left.y);
  const targetX = Number(right.x);
  const targetY = Number(right.y);
  if (![x, y, targetX, targetY].every(Number.isFinite)) return null;
  return Number(Math.hypot(targetX - x, targetY - y).toFixed(2));
}

function pharmacyOffer(pharmacy, drug, drugs) {
  const catalogOffer = (pharmacy.catalog || []).find(
    (offer) => offer.drugId === drug.id,
  );
  if (catalogOffer) return catalogOffer;
  const embeddedOffer = (drug.pharmacyOffers || []).find(
    (offer) => offer.pharmacyId === pharmacy.id,
  );
  if (embeddedOffer) return embeddedOffer;
  const hasCatalog = Array.isArray(pharmacy.catalog) && pharmacy.catalog.length > 0;
  const hasEmbeddedOffers = Array.isArray(drug.pharmacyOffers) && drug.pharmacyOffers.length > 0;
  if (
    !hasCatalog &&
    !hasEmbeddedOffers &&
    (!Array.isArray(drug.pharmacyIds) || !drug.pharmacyIds.length)
  ) {
    // Legacy manually maintained pharmacies did not keep per-drug inventory.
    return { price: drug.price, stock: drug.stock, enabled: drug.enabled !== false };
  }
  if (drug.pharmacyIds?.includes(pharmacy.id)) {
    return { price: drug.price, stock: drug.stock, enabled: drug.enabled !== false };
  }
  return null;
}

export function quotePrescriptionAtPharmacy(
  pharmacy,
  items = [],
  drugs = [],
  patientAddress = "",
  patientLocation = null,
) {
  let estimatedPrice = 0;
  const missingDrugNames = [];
  const quoteItems = [];
  for (const item of items) {
    const drug = drugs.find((entry) => entry.id === item.drugId) || {
      id: item.drugId,
      name: item.name,
      price: item.price,
      stock: item.quantity,
      enabled: true,
    };
    const offer = pharmacyOffer(pharmacy, drug, drugs);
    const quantity = Number(item.quantity) || 0;
    const price = Number(offer?.price);
    const stock = Number(offer?.stock);
    if (
      !offer ||
      offer.enabled === false ||
      !Number.isFinite(price) ||
      price <= 0 ||
      !Number.isFinite(stock) ||
      stock < quantity
    ) {
      missingDrugNames.push(item.name || drug.name || "未知药品");
      continue;
    }
    const lineTotal = Number((price * quantity).toFixed(2));
    estimatedPrice += lineTotal;
    quoteItems.push({
      drugId: drug.id,
      name: item.name || drug.name,
      quantity,
      price,
      lineTotal,
    });
  }
  return {
    pharmacyId: pharmacy.id,
    available: missingDrugNames.length === 0 && items.length > 0,
    estimatedPrice: Number(estimatedPrice.toFixed(2)),
    distanceKm:
      mapDistanceKm(patientLocation, pharmacy.mapLocation) ??
      (pharmacy.distance && !String(pharmacy.distance).includes("待定位")
        ? parseDistanceKm(pharmacy.distance)
        : estimateAddressDistance(patientAddress, pharmacy.address)),
    missingDrugNames,
    quoteItems,
  };
}

export function pharmacyRecommendations(
  pharmacies = [],
  items = [],
  patientAddress = "",
  drugs = [],
  patientLocation = null,
) {
  const candidates = pharmacies
    .filter((pharmacy) => pharmacy.status === 1)
    .map((pharmacy) => ({
      pharmacy,
      ...quotePrescriptionAtPharmacy(
        pharmacy,
        items,
        drugs,
        patientAddress,
        patientLocation,
      ),
    }));
  const availableCandidates = candidates.filter((item) => item.available);
  const comparisonPool = availableCandidates.length ? availableCandidates : candidates;
  const maxDistance = Math.max(1, ...comparisonPool.map((item) => item.distanceKm));
  const maxPrice = Math.max(1, ...comparisonPool.map((item) => item.estimatedPrice));
  return candidates
    .map((item) => {
      const distanceScore = item.distanceKm / maxDistance;
      const priceScore = item.estimatedPrice / maxPrice;
      return {
        ...item,
        score: Number(
          (
            distanceScore * 0.6 +
            priceScore * 0.4 +
            (item.available ? 0 : 2 + item.missingDrugNames.length * 0.1)
          ).toFixed(4),
        ),
      };
    })
    .sort(
      (left, right) =>
        Number(right.available) - Number(left.available) ||
        left.score - right.score,
    );
}

const symptomKeywords = [
  "发热",
  "低热",
  "高热",
  "咳嗽",
  "咳痰",
  "咽痛",
  "鼻塞",
  "流涕",
  "气喘",
  "呼吸困难",
  "胸闷",
  "胸痛",
  "心悸",
  "头痛",
  "头晕",
  "腹痛",
  "腹泻",
  "恶心",
  "呕吐",
  "反酸",
  "皮疹",
  "瘙痒",
  "乏力",
  "失眠",
];

const urgentKeywords = [
  "呼吸困难",
  "意识不清",
  "昏迷",
  "大出血",
  "剧烈胸痛",
  "胸痛伴出汗",
];

function positiveSymptomText(text, keywords) {
  let normalized = String(text || "");
  for (const keyword of keywords) {
    normalized = normalized.replace(
      new RegExp(`(?:无|没有|未见|否认|不伴|未出现)\\s*${keyword}`, "g"),
      "",
    );
  }
  return normalized;
}

function uniqueTexts(items) {
  return [...new Set(items.map((item) => String(item || "").trim()).filter(Boolean))];
}

export function summarizeConsultation(consultation = {}, patient = {}) {
  const messages = Array.isArray(consultation.messages) ? consultation.messages : [];
  const patientMessages = messages.filter((message) => message.sender === "patient");
  const doctorMessages = messages.filter((message) => message.sender === "doctor");
  const patientText = patientMessages.map((message) => message.content).join("；");
  const positiveText = positiveSymptomText(patientText, symptomKeywords);
  const temperatures = [
    ...patientText.matchAll(/(?:体温|发烧|发热)?\s*(\d{2}(?:\.\d)?)\s*(?:℃|度)/g),
  ]
    .map((match) => Number(match[1]))
    .filter((value) => Number.isFinite(value));
  const highTemperature = temperatures.find((value) => value >= 39);
  const chiefComplaint = String(consultation.chiefComplaint || "").trim();
  const patientUpdates = uniqueTexts(
    patientMessages
      .map((message) => message.content)
      .filter((content) => content !== chiefComplaint),
  ).slice(-4);
  const doctorResponses = uniqueTexts(
    doctorMessages.map((message) => message.content),
  ).slice(-3);
  return {
    patientName: patient.realName || consultation.patientName || "患者",
    department: consultation.department || "未记录",
    duration: String(consultation.symptomDuration || "").trim() || "未记录",
    chiefComplaint: chiefComplaint || "未记录明确主诉",
    patientUpdates,
    doctorResponses,
    symptoms: symptomKeywords.filter((keyword) => positiveText.includes(keyword)),
    temperatures,
    redFlags: [
      ...urgentKeywords.filter((keyword) =>
        positiveSymptomText(patientText, urgentKeywords).includes(keyword),
      ),
      ...(highTemperature ? [`高热 ${highTemperature}℃`] : []),
    ],
    allergy: String(patient.allergy || "").trim() || "未记录",
    medicalHistory: String(patient.medicalHistory || "").trim() || "未记录",
    messageCount: messages.length,
    patientMessageCount: patientMessages.length,
    doctorMessageCount: doctorMessages.length,
    lastMessageAt:
      messages.map((message) => message.time).filter(Boolean).sort().at(-1) || null,
    status: consultation.status || "unknown",
  };
}

export function validatePrescriptionDraft(prescription) {
  const errors = [];
  if (!prescription.diagnosis?.trim()) errors.push("请填写诊断结论");
  if (!prescription.items?.length) errors.push("至少添加一种药品");

  const invalidDrug = prescription.items?.find(
    (item) => !item.name?.trim() || !item.dosage?.trim() || !item.frequency?.trim(),
  );
  if (invalidDrug) errors.push("请补全药品用法与频次");

  const invalidQuantity = prescription.items?.find(
    (item) => !Number.isInteger(Number(item.quantity)) || Number(item.quantity) < 1 || Number(item.quantity) > 99,
  );
  if (invalidQuantity) errors.push("药品数量必须为 1 到 99 的整数");

  return errors;
}

export function transitionPrescription(prescription, action, payload = {}, now = new Date()) {
  const rule = TRANSITIONS[action];
  if (!rule) throw new Error(`未知的处方操作：${action}`);
  if (!rule.from.includes(prescription.status)) {
    throw new Error(`当前状态“${RX_STATUS_META[prescription.status]?.label || prescription.status}”不可执行该操作`);
  }

  if (action === "submit") {
    const errors = validatePrescriptionDraft(prescription);
    if (errors.length) throw new Error(errors[0]);
  }

  if (action === "approve" && !payload.pharmacyId) {
    throw new Error("请选择目标药房");
  }

  if (action === "select_pharmacy" && !payload.pharmacyId) {
    throw new Error("请选择目标药房");
  }

  if (action === "pay" && !payload.paymentMethod) {
    throw new Error("请选择处方支付方式");
  }

  if (action === "reject" && !payload.reason?.trim()) {
    throw new Error("请填写驳回原因");
  }

  if (action === "dispense" && !payload.pickupCode) {
    throw new Error("取药码无效");
  }

  const next = {
    ...prescription,
    status: rule.to,
    version: Number(prescription.version || 0) + 1,
    updatedAt: now.toISOString(),
  };

  if (action === "submit") {
    next.submittedAt = now.toISOString();
  }

  if (action === "select_pharmacy") {
    next.pharmacyId = payload.pharmacyId;
    next.pharmacySelectedAt = now.toISOString();
  }

  if (action === "approve") {
    next.reviewedAt = now.toISOString();
    next.pharmacyId = payload.pharmacyId;
    next.pharmacistId = payload.pharmacistId || null;
    next.paymentStatus = "unpaid";
  }

  if (action === "pay") {
    next.paidAt = now.toISOString();
    next.transferredAt = now.toISOString();
    next.paymentStatus = "paid";
    next.paymentMethod = payload.paymentMethod;
    next.transactionNo = payload.transactionNo || null;
    next.pickupCode = payload.pickupCode || null;
    next.expireAt = new Date(now.getTime() + 72 * 60 * 60 * 1000).toISOString();
  }

  if (action === "reject") {
    next.reviewedAt = now.toISOString();
    next.pharmacistId = payload.pharmacistId || null;
    next.rejectReason = payload.reason.trim();
  }

  if (action === "dispense") {
    next.verifiedAt = now.toISOString();
  }

  return next;
}

export function triageSymptoms(symptoms, duration = "", severity = "mild") {
  const text = `${symptoms} ${duration}`.toLowerCase();
  const rules = [
    { dept: "心血管内科", words: ["胸闷", "心慌", "胸痛", "心悸", "血压"] },
    { dept: "呼吸内科", words: ["咳嗽", "发热", "咽痛", "鼻塞", "气喘", "呼吸困难"] },
    { dept: "消化内科", words: ["腹痛", "腹泻", "胃痛", "恶心", "反酸", "呕吐"] },
    { dept: "神经内科", words: ["头痛", "头晕", "麻木", "失眠", "眩晕"] },
    { dept: "皮肤科", words: ["皮疹", "瘙痒", "红斑", "脱皮", "过敏"] },
  ];
  const match = rules.find((rule) => rule.words.some((word) => text.includes(word)));
  const urgentWords = ["呼吸困难", "意识不清", "昏迷", "大出血", "剧烈胸痛", "胸痛伴出汗"];
  const urgent = urgentWords.some((word) => text.includes(word)) || severity === "severe";

  return {
    department: match?.dept || "全科医学科",
    urgent,
    riskLevel: urgent ? "高风险" : "常规风险",
    riskTip: urgent
      ? "存在需要尽快评估的症状，建议立即前往急诊或拨打 120，不要仅依赖线上问诊。"
      : "线上问诊不能替代面诊。若症状持续加重或出现呼吸困难、意识异常，请及时就医。",
    questions: [
      "症状从什么时候开始？是否持续加重？",
      "是否伴随发热、疼痛或其他不适？",
      "近期是否服用药物，是否有相关过敏史？",
    ],
  };
}

export function formatCurrency(value) {
  return `¥${Number(value || 0).toFixed(2)}`;
}
