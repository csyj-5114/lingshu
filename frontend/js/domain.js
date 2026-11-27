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

const residentIdCardWeights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
const residentIdCardCheckCodes = ["1", "0", "X", "9", "8", "7", "6", "5", "4", "3", "2"];

export function validateResidentIdCard(value) {
  const idCard = String(value || "").trim().toUpperCase();
  if (!/^[1-9]\d{5}\d{8}\d{3}[\dX]$/.test(idCard)) {
    return {
      valid: false,
      reason: "请输入 18 位居民身份证号",
      idCard,
    };
  }

  const birthText = idCard.slice(6, 14);
  const year = Number(birthText.slice(0, 4));
  const month = Number(birthText.slice(4, 6));
  const day = Number(birthText.slice(6, 8));
  const birthDate = new Date(Date.UTC(year, month - 1, day));
  if (
    birthDate.getUTCFullYear() !== year ||
    birthDate.getUTCMonth() + 1 !== month ||
    birthDate.getUTCDate() !== day ||
    birthDate > new Date()
  ) {
    return {
      valid: false,
      reason: "身份证号中的出生日期不正确",
      idCard,
    };
  }

  const checksum = idCard
    .slice(0, 17)
    .split("")
    .reduce(
      (total, digit, index) =>
        total + Number(digit) * residentIdCardWeights[index],
      0,
    );
  if (residentIdCardCheckCodes[checksum % 11] !== idCard[17]) {
    return {
      valid: false,
      reason: "身份证号校验码不正确，请检查后重新输入",
      idCard,
    };
  }

  const birth = `${birthText.slice(0, 4)}-${birthText.slice(4, 6)}-${birthText.slice(6, 8)}`;
  return {
    valid: true,
    reason: "",
    idCard,
    birthDate: birth,
    gender: Number(idCard[16]) % 2 === 1 ? "男" : "女",
    masked: `${idCard.slice(0, 6)}********${idCard.slice(-4)}`,
  };
}

const departmentAliases = Object.freeze({
  全科医学科: ["全科医学科", "全科", "普通内科"],
  心血管内科: ["心血管内科", "心内科", "心脏内科", "心血管科"],
  呼吸内科: ["呼吸内科", "呼吸科", "呼吸与危重症医学科"],
  消化内科: ["消化内科", "消化科", "胃肠内科"],
  神经内科: ["神经内科", "神经科", "脑病科"],
  皮肤科: ["皮肤科", "皮肤病科", "皮肤性病科"],
  内分泌科: ["内分泌科", "内分泌代谢科"],
  骨科: ["骨科", "骨外科", "关节外科"],
  泌尿外科: ["泌尿外科", "泌尿科"],
  眼科: ["眼科"],
  耳鼻喉科: ["耳鼻喉科", "耳鼻咽喉科", "五官科"],
  妇科: ["妇科", "妇产科"],
  精神心理科: ["精神心理科", "心理科", "精神科"],
});

export function normalizeDepartmentName(value) {
  const text = String(value || "").trim().replace(/\s+/g, "");
  if (!text) return "";
  for (const [canonical, aliases] of Object.entries(departmentAliases)) {
    if (aliases.some((alias) => text === alias || text.includes(alias))) {
      return canonical;
    }
  }
  return text;
}

const triageRules = [
  {
    department: "心血管内科",
    terms: [
      { label: "胸痛", words: ["胸痛", "胸口痛", "心前区痛"], weight: 5 },
      { label: "胸闷", words: ["胸闷", "胸口发闷"], weight: 3 },
      { label: "心悸", words: ["心悸", "心慌", "心跳快", "心率快"], weight: 3 },
      { label: "血压异常", words: ["血压高", "高血压", "血压低"], weight: 2 },
    ],
    specialtyHints: ["冠心病", "高血压", "心律失常"],
  },
  {
    department: "呼吸内科",
    terms: [
      { label: "呼吸困难", words: ["呼吸困难", "喘不上气", "气促", "气喘"], weight: 5 },
      { label: "咳嗽", words: ["咳嗽", "干咳", "咳痰"], weight: 4 },
      { label: "咽痛", words: ["咽痛", "嗓子疼", "喉咙痛"], weight: 2 },
      { label: "鼻塞流涕", words: ["鼻塞", "流涕", "流鼻涕"], weight: 2 },
      { label: "发热", words: ["发热", "发烧", "低热", "高热"], weight: 1 },
    ],
    specialtyHints: ["呼吸道感染", "慢性咳嗽", "哮喘"],
  },
  {
    department: "消化内科",
    terms: [
      { label: "腹痛", words: ["腹痛", "肚子痛", "胃痛"], weight: 4 },
      { label: "腹泻", words: ["腹泻", "拉肚子", "稀便"], weight: 4 },
      { label: "恶心呕吐", words: ["恶心", "呕吐", "想吐"], weight: 3 },
      { label: "反酸", words: ["反酸", "烧心", "胃胀"], weight: 2 },
    ],
    specialtyHints: ["胃肠疾病", "消化不良", "胃食管反流"],
  },
  {
    department: "神经内科",
    terms: [
      { label: "头痛", words: ["头痛", "头疼", "偏头痛"], weight: 4 },
      { label: "头晕", words: ["头晕", "眩晕", "天旋地转"], weight: 4 },
      { label: "麻木", words: ["麻木", "手脚发麻", "面瘫"], weight: 3 },
      { label: "失眠", words: ["失眠", "睡不着"], weight: 2 },
    ],
    specialtyHints: ["头痛", "眩晕", "脑血管疾病"],
  },
  {
    department: "皮肤科",
    terms: [
      { label: "皮疹", words: ["皮疹", "起疹子", "红疹"], weight: 5 },
      { label: "瘙痒", words: ["瘙痒", "发痒", "很痒"], weight: 4 },
      { label: "皮肤红斑", words: ["红斑", "风团", "荨麻疹"], weight: 3 },
      { label: "脱皮", words: ["脱皮", "脱屑"], weight: 2 },
    ],
    specialtyHints: ["湿疹", "荨麻疹", "过敏性皮肤病"],
  },
  {
    department: "内分泌科",
    terms: [
      { label: "血糖异常", words: ["血糖高", "高血糖", "血糖低", "糖尿病"], weight: 5 },
      { label: "口渴多尿", words: ["口渴", "多饮", "多尿"], weight: 3 },
      { label: "甲状腺不适", words: ["甲状腺", "甲亢", "甲减"], weight: 4 },
    ],
    specialtyHints: ["糖尿病", "甲状腺疾病", "内分泌代谢"],
  },
  {
    department: "骨科",
    terms: [
      { label: "关节痛", words: ["关节痛", "关节疼", "膝关节"], weight: 4 },
      { label: "腰背痛", words: ["腰痛", "腰疼", "背痛", "腰背痛"], weight: 4 },
      { label: "肢体外伤", words: ["扭伤", "骨折", "外伤", "摔伤"], weight: 5 },
    ],
    specialtyHints: ["关节疾病", "脊柱疾病", "创伤骨科"],
  },
  {
    department: "泌尿外科",
    terms: [
      { label: "排尿疼痛", words: ["尿痛", "小便疼", "排尿痛"], weight: 4 },
      { label: "尿频尿急", words: ["尿频", "尿急", "夜尿"], weight: 3 },
      { label: "腰痛血尿", words: ["血尿", "肾结石", "输尿管结石"], weight: 5 },
    ],
    specialtyHints: ["泌尿系感染", "泌尿结石", "前列腺疾病"],
  },
  {
    department: "眼科",
    terms: [
      { label: "眼部不适", words: ["眼睛红", "眼红", "眼痛", "眼睛痛"], weight: 4 },
      { label: "视力异常", words: ["视力模糊", "看不清", "视力下降"], weight: 4 },
      { label: "眼部瘙痒", words: ["眼睛痒", "眼痒", "流泪"], weight: 2 },
    ],
    specialtyHints: ["结膜炎", "干眼症", "视力障碍"],
  },
  {
    department: "耳鼻喉科",
    terms: [
      { label: "耳痛", words: ["耳痛", "耳朵痛", "耳鸣"], weight: 4 },
      { label: "鼻部不适", words: ["鼻窦", "鼻出血", "流鼻血"], weight: 4 },
      { label: "咽喉不适", words: ["吞咽困难", "声音嘶哑", "扁桃体"], weight: 3 },
    ],
    specialtyHints: ["鼻炎", "中耳炎", "咽喉疾病"],
  },
  {
    department: "妇科",
    terms: [
      { label: "下腹痛", words: ["下腹痛", "小腹痛", "痛经"], weight: 3 },
      { label: "月经异常", words: ["月经", "经期", "白带异常"], weight: 4 },
    ],
    specialtyHints: ["月经不调", "妇科炎症", "妇科内分泌"],
  },
  {
    department: "精神心理科",
    terms: [
      { label: "情绪低落", words: ["情绪低落", "抑郁", "焦虑", "恐慌"], weight: 4 },
      { label: "睡眠障碍", words: ["长期失眠", "睡眠障碍", "早醒"], weight: 3 },
    ],
    specialtyHints: ["焦虑", "抑郁", "睡眠障碍"],
  },
];

const departmentQuestions = Object.freeze({
  心血管内科: [
    "胸痛或胸闷是在活动时加重，还是休息时也会出现？",
    "是否伴有出汗、心慌、晕厥或向肩背放射的疼痛？",
    "既往是否有高血压、高血脂、糖尿病或心脏病史？",
  ],
  呼吸内科: [
    "是否有发热、咳痰或气促，活动后是否明显加重？",
    "症状从什么时候开始，是否接触过呼吸道感染患者？",
    "既往是否有哮喘、慢性支气管炎或吸烟史？",
  ],
  消化内科: [
    "腹痛的具体位置在哪里，进食前后是否加重？",
    "是否有呕吐、黑便、便血或明显发热？",
    "近期是否食用不洁食物或服用刺激性药物？",
  ],
  神经内科: [
    "头痛或头晕是突发还是逐渐出现，是否持续加重？",
    "是否伴有肢体无力、言语不清、视物异常或呕吐？",
    "是否有高血压、偏头痛或类似发作史？",
  ],
});

function positiveTriageText(text, terms) {
  let normalized = String(text || "");
  const allWords = terms
    .flatMap((term) => term.words)
    .map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");
  for (const term of terms) {
    const words = term.words
      .map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      .join("|");
    normalized = normalized.replace(
      new RegExp(`(?:无|没有|未见|否认|不伴|未出现)\\s*(?:${words})`, "g"),
      "",
    );
  }
  normalized = normalized.replace(
    new RegExp(
      `(?:无|没有|未见|否认|不伴|未出现)\\s*(?:${allWords})(?:\\s*(?:和|及|或|、|以及|伴)\\s*(?:${allWords}))*`,
      "g",
    ),
    "",
  );
  return normalized;
}

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
  const positiveText = positiveTriageText(text, triageRules.flatMap((rule) => rule.terms));
  const scores = triageRules
    .map((rule) => {
      const matched = rule.terms
        .filter((term) => term.words.some((word) => positiveText.includes(word)))
        .map((term) => ({ label: term.label, weight: term.weight }));
      return {
        department: rule.department,
        score: matched.reduce((total, item) => total + item.weight, 0),
        matchedSymptoms: [...new Set(matched.map((item) => item.label))],
        specialtyHints: rule.specialtyHints,
      };
    })
    .filter((item) => item.score > 0)
    .sort(
      (left, right) =>
        right.score - left.score ||
        right.matchedSymptoms.length - left.matchedSymptoms.length,
    );
  const primary = scores[0] || {
    department: "全科医学科",
    score: 0,
    matchedSymptoms: [],
    specialtyHints: ["常见病", "多病共存", "初步分诊"],
  };
  const departmentCandidates = scores.length
    ? scores.slice(0, 3)
    : [
        {
          department: "全科医学科",
          score: 0,
          matchedSymptoms: [],
          specialtyHints: primary.specialtyHints,
        },
      ];
  const urgent =
    urgentKeywords.some((word) => positiveText.includes(word)) ||
    severity === "severe";
  const questions =
    departmentQuestions[primary.department] || [
      "不适从什么时候开始？目前是否持续加重？",
      "是否伴有发热、疼痛、呼吸困难或其他明显异常？",
      "近期是否服用药物，是否有药物或食物过敏史？",
    ];

  return {
    department: primary.department,
    departmentCandidates,
    matchedSymptoms: primary.matchedSymptoms,
    specialtyHints: primary.specialtyHints,
    confidence:
      primary.score >= 7 ? "较高" : primary.score >= 4 ? "中等" : "一般",
    recommendationReason: primary.matchedSymptoms.length
      ? `根据“${primary.matchedSymptoms.join("、")}”等症状，优先建议 ${primary.department}。`
      : "当前描述未命中明确专科症状，建议先由全科医学科评估，再按医生建议转诊。",
    urgent,
    riskLevel: urgent ? "高风险" : "常规风险",
    riskTip: urgent
      ? "存在需要尽快评估的症状，建议立即前往急诊或拨打 120，不要仅依赖线上问诊。"
      : "线上问诊不能替代面诊。若症状持续加重或出现呼吸困难、意识异常，请及时就医。",
    questions,
  };
}

export function rankTriageDoctors(doctors = [], triageResult = {}) {
  const candidates =
    Array.isArray(triageResult.departmentCandidates) &&
    triageResult.departmentCandidates.length
      ? triageResult.departmentCandidates
      : [
          {
            department: triageResult.department || "全科医学科",
            score: 0,
            matchedSymptoms: triageResult.matchedSymptoms || [],
          },
        ];
  const candidateIndex = new Map(
    candidates.map((candidate, index) => [
      normalizeDepartmentName(candidate.department),
      index,
    ]),
  );
  const matchedSymptoms = triageResult.matchedSymptoms || [];

  return doctors
    .filter(
      (doctor) =>
        doctor.role === "DOCTOR" &&
        doctor.status === 1 &&
        doctor.approvalStatus === "approved" &&
        doctor.online === true,
    )
    .map((doctor) => {
      const department = normalizeDepartmentName(doctor.department);
      if (!candidateIndex.has(department)) return null;
      const priority = candidateIndex.get(department);
      const specialtyText = String(doctor.specialty || "").toLowerCase();
      const symptomHits = matchedSymptoms.filter((symptom) =>
        specialtyText.includes(symptom.toLowerCase()),
      );
      return {
        ...doctor,
        triageMatchDepartment: candidates[priority].department,
        triageMatchLabel: priority === 0 ? "首选科室匹配" : "备选科室匹配",
        triageMatchPriority: priority,
        triageSymptomHits: symptomHits,
        triageRank:
          (priority === 0 ? 1000 : 500 - priority * 100) +
          symptomHits.length * 20 +
          Math.min(60, Number(doctor.yearsExperience || 0)) +
          Number(doctor.rating || 0) * 10 +
          Math.min(20, Number(doctor.consultCount || 0) / 10),
      };
    })
    .filter(Boolean)
    .sort(
      (left, right) =>
        right.triageRank - left.triageRank ||
        left.triageMatchPriority - right.triageMatchPriority,
    );
}

export function formatCurrency(value) {
  return `¥${Number(value || 0).toFixed(2)}`;
}
