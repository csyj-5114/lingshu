import test, { after } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const testDirectory = await mkdtemp(join(tmpdir(), "lingshu-workflow-"));
process.env.DB_PATH = join(testDirectory, "lingshu.sqlite");

const databaseUrl = new URL("../backend/database.mjs", import.meta.url).href;
const {
  createPhoneVerification,
  db,
  mergeState,
  readState,
  registerAccount,
  reviewRegistration,
} = await import(databaseUrl);

after(async () => {
  db.close();
  await rm(testDirectory, { recursive: true, force: true });
});

function register(role, phone, realName, qualification = null) {
  const verification = createPhoneVerification(phone, "register");
  return registerAccount({
    role,
    phone,
    realName,
    password: "testpass123",
    smsCode: verification.code,
    address: "上海市静安区南京西路 100 号",
    mapLocation: { x: 1.5, y: 2.5 },
    qualification,
  });
}

test("药师目录同步、支付门槛、医生开方和药房实际报价完整贯通", () => {
  const initialState = readState();
  const admin = initialState.users.find((user) => user.role === "ADMIN");
  const doctorRegistration = register(
    "DOCTOR",
    "13810001001",
    "流程测试医生",
    {
      institution: "灵枢互联网医院",
      department: "呼吸内科",
      licenseNo: "DOC-WORKFLOW-001",
      documentName: "doctor.png",
      documentType: "image/png",
      documentData: "data:image/png;base64,iVBORw0KGgo=",
    },
  );
  const patientRegistration = register(
    "PATIENT",
    "13810001002",
    "流程测试患者",
  );
  const pharmacistRegistration = register(
    "PHARMACIST",
    "13810001003",
    "流程测试药师",
    {
      institution: "流程测试药房",
      department: "药房",
      licenseNo: "PHA-WORKFLOW-001",
      documentName: "pharmacist.png",
      documentType: "image/png",
      documentData: "data:image/png;base64,iVBORw0KGgo=",
      pharmacyName: "流程测试药房",
      pharmacyAddress: "上海市静安区南京西路 200 号",
      pharmacyPhone: "13810001003",
      pharmacyLicenseNo: "PH-WORKFLOW-001",
      pharmacyMapLocation: { x: 2.5, y: 2.5 },
      catalogFileName: "药品目录.xlsx",
      drugCatalog: [
        {
          code: "WORK-A",
          name: "流程药品A",
          spec: "10mg*10片",
          manufacturer: "流程制药",
          approvalNo: "国药准字H20261001",
          type: "处方药",
          price: 8.5,
          stock: 20,
          contraindication: "遵医嘱",
        },
        {
          code: "WORK-B",
          name: "流程药品B",
          spec: "20mg*10片",
          manufacturer: "流程制药",
          approvalNo: "国药准字H20261002",
          type: "处方药",
          price: 12.5,
          stock: 15,
          contraindication: "饭后服用",
        },
      ],
    },
  );

  reviewRegistration(admin.id, doctorRegistration.user.id, "approve", "资质通过");
  reviewRegistration(admin.id, pharmacistRegistration.user.id, "approve", "目录通过");

  const approvedState = readState();
  const pharmacy = approvedState.pharmacies.find((item) => item.name === "流程测试药房");
  const drugs = approvedState.drugs.filter((item) => item.name.startsWith("流程药品"));
  assert.equal(pharmacy.catalog.length, 2);
  assert.equal(drugs.length, 2);
  assert.ok(drugs.every((drug) => drug.pharmacyOffers.length === 1));

  const patientState = readState();
  patientState.consultations.push({
    id: "c-workflow",
    no: "CS-WORKFLOW",
    patientId: patientRegistration.user.id,
    patientName: patientRegistration.user.realName,
    doctorId: doctorRegistration.user.id,
    doctorName: doctorRegistration.user.realName,
    department: "呼吸内科",
    chiefComplaint: "持续咳嗽",
    symptomDuration: "2天",
    status: "awaiting_payment",
    paymentStatus: "unpaid",
    consultationFee: 29.9,
    messages: [
      {
        id: "m-workflow",
        sender: "patient",
        senderName: patientRegistration.user.realName,
        content: "持续咳嗽",
        time: new Date().toISOString(),
      },
    ],
  });
  mergeState(patientRegistration.user, patientState);

  const unpaidState = readState();
  unpaidState.consultations[0].status = "active";
  unauthorizedDoctorUpdate: {
    const afterAttempt = mergeState(doctorRegistration.user, unpaidState);
    assert.equal(afterAttempt.consultations[0].status, "awaiting_payment");
    assert.equal(afterAttempt.consultations[0].paymentStatus, "unpaid");
  }

  const payableState = readState();
  payableState.consultations[0].status = "waiting";
  payableState.consultations[0].paymentStatus = "paid";
  payableState.consultations[0].paymentMethod = "微信支付";
  payableState.consultations[0].transactionNo = "CONSULT-PAY-WORKFLOW";
  mergeState(patientRegistration.user, payableState);

  const doctorState = readState();
  doctorState.consultations[0].status = "active";
  mergeState(doctorRegistration.user, doctorState);

  const prescriptionState = readState();
  prescriptionState.prescriptions.push({
    id: "rx-workflow",
    no: "RX-WORKFLOW",
    consultationId: "c-workflow",
    patientId: patientRegistration.user.id,
    patientName: patientRegistration.user.realName,
    doctorId: doctorRegistration.user.id,
    doctorName: doctorRegistration.user.realName,
    department: "呼吸内科",
    diagnosis: "急性支气管炎",
    status: "pending_pharmacy",
    version: 1,
    items: [
      {
        drugId: drugs[0].id,
        name: "伪造药品",
        spec: "伪造规格",
        quantity: 2,
        dosage: "每次1片",
        frequency: "每日2次",
        price: 0.01,
      },
      {
        drugId: drugs[1].id,
        name: "伪造药品",
        spec: "伪造规格",
        quantity: 1,
        dosage: "每次1片",
        frequency: "每日1次",
        price: 0.01,
      },
    ],
  });
  const submitted = mergeState(doctorRegistration.user, prescriptionState);
  const submittedPrescription = submitted.prescriptions.find((item) => item.id === "rx-workflow");
  assert.equal(submittedPrescription.status, "pending_pharmacy");
  assert.deepEqual(
    submittedPrescription.items.map((item) => item.price),
    [8.5, 12.5],
  );
  assert.equal(submittedPrescription.recommendedPharmacyId, pharmacy.id);

  const patientSelectionState = readState();
  patientSelectionState.prescriptions[0].status = "pending_review";
  patientSelectionState.prescriptions[0].pharmacyId = pharmacy.id;
  const selectedPharmacyState = mergeState(
    patientRegistration.user,
    patientSelectionState,
  );
  assert.equal(
    selectedPharmacyState.prescriptions.find(
      (item) => item.id === "rx-workflow",
    ).status,
    "pending_review",
  );

  const pharmacistState = readState();
  pharmacistState.prescriptions[0].status = "pending_payment";
  const approved = mergeState(pharmacistRegistration.user, pharmacistState);
  const approvedPrescription = approved.prescriptions.find((item) => item.id === "rx-workflow");
  assert.equal(approvedPrescription.status, "pending_payment");
  assert.equal(approvedPrescription.pharmacyQuote.estimatedPrice, 29.5);

  const patientPaymentState = readState();
  patientPaymentState.prescriptions[0].status = "transferred";
  patientPaymentState.prescriptions[0].paymentStatus = "paid";
  patientPaymentState.prescriptions[0].paymentMethod = "微信支付";
  patientPaymentState.prescriptions[0].pickupCode = "LS-WORKFLOW";
  patientPaymentState.prescriptions[0].transactionNo = "RX-PAY-WORKFLOW";
  const paid = mergeState(patientRegistration.user, patientPaymentState);
  const paidPrescription = paid.prescriptions.find(
    (item) => item.id === "rx-workflow",
  );
  assert.equal(paidPrescription.status, "transferred");
  assert.equal(paidPrescription.pharmacyId, pharmacy.id);
  assert.equal(paidPrescription.pharmacyQuote.estimatedPrice, 29.5);

  const dispenseState = readState();
  dispenseState.prescriptions[0].status = "dispensed";
  dispenseState.prescriptions[0].pickupCode = "LS-WORKFLOW";
  const dispensed = mergeState(pharmacistRegistration.user, dispenseState);
  const dispensedPrescription = dispensed.prescriptions.find(
    (item) => item.id === "rx-workflow",
  );
  assert.equal(dispensedPrescription.status, "dispensed");
  assert.equal(dispensedPrescription.inventoryDeductions.length, 2);
  const dispensedPharmacy = dispensed.pharmacies.find(
    (item) => item.id === pharmacy.id,
  );
  assert.equal(
    dispensedPharmacy.catalog.find((item) => item.drugId === drugs[0].id).stock,
    18,
  );
  assert.equal(
    dispensedPharmacy.catalog.find((item) => item.drugId === drugs[1].id).stock,
    14,
  );
  assert.ok(
    dispensed.notifications.some(
      (item) =>
        item.role === "ADMIN" &&
        item.title === "患者已完成取药，请核对药品库存",
    ),
  );

  const inventoryState = readState();
  inventoryState.pharmacies.find(
    (item) => item.id === pharmacy.id,
  ).catalog.find((item) => item.drugId === drugs[0].id).stock = 50;
  const inventoryUpdated = mergeState(
    pharmacistRegistration.user,
    inventoryState,
  );
  assert.equal(
    inventoryUpdated.pharmacies
      .find((item) => item.id === pharmacy.id)
      .catalog.find((item) => item.drugId === drugs[0].id).stock,
    50,
  );
  assert.ok(
    inventoryUpdated.notifications.some(
      (item) =>
        item.role === "ADMIN" &&
        item.title === "药师已更新药房库存",
    ),
  );

  const disabledState = readState();
  const adminUserForDisable = disabledState.users.find((user) => user.role === "ADMIN");
  disabledState.pharmacies.find((item) => item.id === pharmacy.id).status = 0;
  mergeState(adminUserForDisable, disabledState);

  const secondPrescriptionState = readState();
  secondPrescriptionState.prescriptions.push({
    ...dispensedPrescription,
    id: "rx-disabled-pharmacy",
    no: "RX-DISABLED",
    status: "transferred",
    pharmacyId: pharmacy.id,
    pickupCode: "LS-DISABLED",
    inventoryDeductedAt: null,
    inventoryDeductions: [],
  });
  mergeState(adminUserForDisable, secondPrescriptionState);
  const disabledDispense = readState();
  disabledDispense.prescriptions.find(
    (item) => item.id === "rx-disabled-pharmacy",
  ).status = "dispensed";
  assert.throws(
    () => mergeState(pharmacistRegistration.user, disabledDispense),
    /停用/,
  );
});
