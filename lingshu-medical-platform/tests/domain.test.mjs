import test from "node:test";
import assert from "node:assert/strict";
import {
  RX_STATUS,
  pharmacyRecommendations,
  prescriptionTotal,
  quotePrescriptionAtPharmacy,
  mapDistanceKm,
  summarizeConsultation,
  transitionPrescription,
  triageSymptoms,
  validatePrescriptionDraft,
} from "../frontend/js/domain.js";

const draft = {
  status: RX_STATUS.DRAFT,
  diagnosis: "急性上呼吸道感染",
  version: 0,
  items: [
    { name: "布洛芬缓释胶囊", quantity: 1, dosage: "1 粒", frequency: "每日 2 次", price: 18.6 },
    { name: "连花清瘟胶囊", quantity: 2, dosage: "4 粒", frequency: "每日 3 次", price: 24.8 },
  ],
};

test("处方金额按单价乘数量汇总", () => {
  assert.equal(prescriptionTotal(draft.items), 68.2);
});

test("草稿提交后进入待选药房并记录时间", () => {
  const now = new Date("2026-11-24T08:00:00.000Z");
  const result = transitionPrescription(draft, "submit", {}, now);
  assert.equal(result.status, RX_STATUS.PENDING_PHARMACY);
  assert.equal(result.submittedAt, now.toISOString());
  assert.equal(result.version, 1);
});

test("患者选药房、药师审核后进入待支付", () => {
  const submitted = transitionPrescription(
    draft,
    "submit",
    {},
    new Date("2026-11-24T08:00:00.000Z"),
  );
  const approved = transitionPrescription(
    transitionPrescription(
      submitted,
      "select_pharmacy",
      { pharmacyId: "ph-01" },
      new Date("2026-11-24T08:30:00.000Z"),
    ),
    "approve",
    { pharmacyId: "ph-01", pharmacistId: "u-pharmacist" },
    new Date("2026-11-24T09:00:00.000Z"),
  );
  assert.equal(approved.status, RX_STATUS.PENDING_PAYMENT);
  assert.equal(approved.paymentStatus, "unpaid");
  const paid = transitionPrescription(
    approved,
    "pay",
    { paymentMethod: "微信支付", pickupCode: "LS-1234" },
    new Date("2026-11-24T09:05:00.000Z"),
  );
  assert.equal(paid.status, RX_STATUS.TRANSFERRED);
  assert.equal(paid.expireAt, "2026-11-27T09:05:00.000Z");
});

test("未选择药房不能通过审核", () => {
  const pending = { ...draft, status: RX_STATUS.PENDING_REVIEW };
  assert.throws(() => transitionPrescription(pending, "approve"), /目标药房/);
});

test("空诊断或空药品清单不能提交", () => {
  assert.deepEqual(validatePrescriptionDraft({ items: [] }), ["请填写诊断结论", "至少添加一种药品"]);
});

test("呼吸困难被识别为高风险并推荐呼吸内科", () => {
  const result = triageSymptoms("连续咳嗽并呼吸困难", "2天", "severe");
  assert.equal(result.department, "呼吸内科");
  assert.equal(result.urgent, true);
  assert.equal(result.doctor, undefined);
});

test("药房报价使用该药房目录中的实际价格和库存", () => {
  const quote = quotePrescriptionAtPharmacy(
    {
      id: "ph-low",
      status: 1,
      address: "上海市静安区某路 1 号",
      distance: "1.2km",
      catalog: [
        { drugId: "drug-a", price: 8, stock: 10, enabled: true },
        { drugId: "drug-b", price: 12, stock: 10, enabled: true },
      ],
    },
    [
      { drugId: "drug-a", name: "药品 A", quantity: 2 },
      { drugId: "drug-b", name: "药品 B", quantity: 1 },
    ],
    [],
    "上海市静安区某路 99 号",
  );
  assert.equal(quote.available, true);
  assert.equal(quote.estimatedPrice, 28);
  assert.equal(quote.distanceKm, 1.2);
});

test("推荐药房优先选择可配齐处方且距离价格更优者", () => {
  const drugs = [
    { id: "drug-a", name: "药品 A", price: 10, stock: 100, enabled: true },
    { id: "drug-b", name: "药品 B", price: 20, stock: 100, enabled: true },
  ];
  const items = [
    { drugId: "drug-a", name: "药品 A", quantity: 1 },
    { drugId: "drug-b", name: "药品 B", quantity: 1 },
  ];
  const recommendations = pharmacyRecommendations(
    [
      {
        id: "ph-near-missing",
        status: 1,
        address: "上海市静安区某路 1 号",
        distance: "0.5km",
        catalog: [{ drugId: "drug-a", price: 5, stock: 10, enabled: true }],
      },
      {
        id: "ph-far-complete",
        status: 1,
        address: "上海市徐汇区某路 1 号",
        distance: "3km",
        catalog: [
          { drugId: "drug-a", price: 9, stock: 10, enabled: true },
          { drugId: "drug-b", price: 18, stock: 10, enabled: true },
        ],
      },
    ],
    items,
    "上海市静安区某路 99 号",
    drugs,
  );
  assert.equal(recommendations[0].pharmacy.id, "ph-far-complete");
  assert.equal(recommendations[0].available, true);
  assert.deepEqual(recommendations[1].missingDrugNames, ["药品 B"]);
});

test("病情摘要只提取问诊中实际出现的症状和危险信号", () => {
  const summary = summarizeConsultation(
    {
      patientName: "测试患者",
      department: "呼吸内科",
      chiefComplaint: "咳嗽两天",
      symptomDuration: "2天",
      status: "active",
      messages: [
        { sender: "patient", content: "咳嗽两天" },
        { sender: "patient", content: "有低热和咽痛，没有呼吸困难；晚些发烧39度" },
        { sender: "doctor", content: "请继续观察体温变化" },
      ],
    },
    {
      realName: "测试患者",
      allergy: "无已知过敏",
      medicalHistory: "未记录",
    },
  );
  assert.deepEqual(summary.symptoms, ["低热", "咳嗽", "咽痛"]);
  assert.deepEqual(summary.patientUpdates, ["有低热和咽痛，没有呼吸困难；晚些发烧39度"]);
  assert.deepEqual(summary.temperatures, [39]);
  assert.deepEqual(summary.redFlags, ["高热 39℃"]);
  assert.deepEqual(summary.doctorResponses, ["请继续观察体温变化"]);
});

test("药房距离优先使用地图坐标", () => {
  assert.equal(mapDistanceKm({ x: 1, y: 2 }, { x: 4, y: 6 }), 5);
  const recommendation = pharmacyRecommendations(
    [
      {
        id: "ph-near",
        status: 1,
        address: "使用文本地址时并不近",
        distance: "9km",
        mapLocation: { x: 2, y: 2 },
        catalog: [{ drugId: "drug-a", price: 20, stock: 10, enabled: true }],
      },
      {
        id: "ph-far",
        status: 1,
        address: "地图上较远",
        distance: "0.2km",
        mapLocation: { x: 9, y: 9 },
        catalog: [{ drugId: "drug-a", price: 10, stock: 10, enabled: true }],
      },
    ],
    [{ drugId: "drug-a", name: "药品A", quantity: 1 }],
    "任意地址",
    [{ id: "drug-a", name: "药品A", price: 20, stock: 10, enabled: true }],
    { x: 1, y: 1 },
  );
  assert.equal(recommendation[0].pharmacy.id, "ph-near");
  assert.equal(recommendation[0].distanceKm, 1.41);
});
