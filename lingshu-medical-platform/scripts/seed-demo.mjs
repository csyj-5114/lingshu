import {
  createPhoneVerification,
  readState,
  registerAccount,
  resetDatabase,
  reviewRegistration,
  writeState,
} from "../backend/database.mjs";

const documentData = "data:image/png;base64,iVBORw0KGgo=";

const sharedDrugs = [
  {
    code: "DEMO-A001",
    name: "布洛芬缓释胶囊",
    spec: "0.3g×20粒/盒",
    manufacturer: "示范制药有限公司",
    approvalNo: "演示-国药准字-001",
    type: "非处方药",
    price: 18.6,
    stock: 120,
    contraindication: "对本品过敏者禁用；胃溃疡患者慎用。",
  },
  {
    code: "DEMO-A002",
    name: "对乙酰氨基酚片",
    spec: "0.5g×12片/盒",
    manufacturer: "示范制药有限公司",
    approvalNo: "演示-国药准字-002",
    type: "非处方药",
    price: 9.9,
    stock: 180,
    contraindication: "严重肝肾功能不全者禁用。",
  },
  {
    code: "DEMO-A003",
    name: "氯雷他定片",
    spec: "10mg×12片/盒",
    manufacturer: "示范制药有限公司",
    approvalNo: "演示-国药准字-003",
    type: "非处方药",
    price: 12.4,
    stock: 90,
    contraindication: "严重肝功能不全者应在医师指导下使用。",
  },
  {
    code: "DEMO-A004",
    name: "蒙脱石散",
    spec: "3g×10袋/盒",
    manufacturer: "示范制药有限公司",
    approvalNo: "演示-国药准字-004",
    type: "非处方药",
    price: 15.8,
    stock: 80,
    contraindication: "与其他口服药物同服时需间隔一定时间。",
  },
  {
    code: "DEMO-A005",
    name: "奥美拉唑肠溶胶囊",
    spec: "20mg×14粒/盒",
    manufacturer: "示范制药有限公司",
    approvalNo: "演示-国药准字-005",
    type: "处方药",
    price: 28.3,
    stock: 70,
    contraindication: "对本品过敏者禁用；长期使用需评估风险。",
  },
  {
    code: "DEMO-A006",
    name: "盐酸氨溴索片",
    spec: "30mg×20片/盒",
    manufacturer: "示范制药有限公司",
    approvalNo: "演示-国药准字-006",
    type: "处方药",
    price: 16.9,
    stock: 65,
    contraindication: "妊娠早期慎用；出现严重皮疹应停药。",
  },
  {
    code: "DEMO-A007",
    name: "口服补液盐散",
    spec: "5.125g×6袋/盒",
    manufacturer: "示范制药有限公司",
    approvalNo: "演示-国药准字-007",
    type: "非处方药",
    price: 13.5,
    stock: 100,
    contraindication: "应按说明书配比使用；心肾功能异常者需咨询医师。",
  },
  {
    code: "DEMO-A008",
    name: "感冒清热颗粒",
    spec: "12g×10袋/盒",
    manufacturer: "示范制药有限公司",
    approvalNo: "演示-国药准字-008",
    type: "非处方药",
    price: 22.8,
    stock: 95,
    contraindication: "对成分过敏者禁用；合并基础疾病者请咨询医师。",
  },
];

function catalog(priceFactor) {
  return sharedDrugs.map((drug, index) => ({
    ...drug,
    price: Number((drug.price * priceFactor).toFixed(2)),
    stock: drug.stock + (index % 2 === 0 ? 10 : 0),
  }));
}

function register(account) {
  const verification = createPhoneVerification(account.phone, "register");
  return registerAccount({
    role: account.role,
    realName: account.realName,
    phone: account.phone,
    password: account.password,
    smsCode: verification.code,
    address: account.address,
    gender: account.gender,
    age: account.age,
    bloodType: account.bloodType,
    allergy: account.allergy,
    medicalHistory: account.medicalHistory,
    mapLocation: account.mapLocation,
    qualification: account.qualification,
  });
}

resetDatabase("u-admin");

const patients = [
  {
    role: "PATIENT",
    realName: "林晓雨",
    phone: "13910001001",
    password: "Pat@1001",
    address: "上海市静安区安康路 18 号",
    gender: "女",
    age: 29,
    bloodType: "A 型",
    allergy: "青霉素过敏",
    medicalHistory: "高血压 3 年，规律服药",
    mapLocation: { x: 1.2, y: 1.5 },
  },
  {
    role: "PATIENT",
    realName: "周子航",
    phone: "13910001002",
    password: "Pat@1002",
    address: "上海市徐汇区云锦路 66 号",
    gender: "男",
    age: 35,
    bloodType: "O 型",
    allergy: "无已知过敏",
    medicalHistory: "2 年前阑尾炎手术",
    mapLocation: { x: 7.8, y: 5.9 },
  },
  {
    role: "PATIENT",
    realName: "陈静",
    phone: "13910001003",
    password: "Pat@1003",
    address: "上海市长宁区西郊路 120 号",
    gender: "女",
    age: 42,
    bloodType: "B 型",
    allergy: "磺胺类药物过敏",
    medicalHistory: "季节性过敏性鼻炎",
    mapLocation: { x: 2, y: 6.2 },
  },
];

const doctors = [
  {
    role: "DOCTOR",
    realName: "赵明",
    phone: "13910002001",
    password: "Doc@2001",
    address: "上海市静安区中心路 88 号",
    qualification: {
      institution: "灵枢综合医院",
      hospitalId: "hospital-demo",
      department: "呼吸内科",
      title: "主治医师",
      specialty: "呼吸道感染与慢性咳嗽",
      yearsExperience: 9,
      licenseNo: "DEMO-DOC-001",
      documentName: "赵明执业资质.png",
      documentType: "image/png",
      documentData,
    },
  },
  {
    role: "DOCTOR",
    realName: "孙悦",
    phone: "13910002002",
    password: "Doc@2002",
    address: "上海市静安区中心路 88 号",
    qualification: {
      institution: "灵枢综合医院",
      hospitalId: "hospital-demo",
      department: "消化内科",
      title: "副主任医师",
      specialty: "胃肠疾病与消化系统常见病",
      yearsExperience: 12,
      licenseNo: "DEMO-DOC-002",
      documentName: "孙悦执业资质.png",
      documentType: "image/png",
      documentData,
    },
  },
  {
    role: "DOCTOR",
    realName: "李航",
    phone: "13910002003",
    password: "Doc@2003",
    address: "上海市静安区中心路 88 号",
    qualification: {
      institution: "灵枢综合医院",
      hospitalId: "hospital-demo",
      department: "心血管内科",
      title: "主治医师",
      specialty: "高血压、心悸与心血管慢病管理",
      yearsExperience: 10,
      licenseNo: "DEMO-DOC-003",
      documentName: "李航执业资质.png",
      documentType: "image/png",
      documentData,
    },
  },
  {
    role: "DOCTOR",
    realName: "王宁",
    phone: "13910002004",
    password: "Doc@2004",
    address: "上海市静安区中心路 88 号",
    qualification: {
      institution: "灵枢综合医院",
      hospitalId: "hospital-demo",
      department: "神经内科",
      title: "主治医师",
      specialty: "头痛、眩晕与睡眠障碍",
      yearsExperience: 8,
      licenseNo: "DEMO-DOC-004",
      documentName: "王宁执业资质.png",
      documentType: "image/png",
      documentData,
    },
  },
];

const pharmacists = [
  {
    role: "PHARMACIST",
    realName: "苏玉梅",
    phone: "13910003001",
    password: "Pha@3001",
    address: "上海市静安区安康路 28 号",
    mapLocation: { x: 2.2, y: 2.2 },
    qualification: {
      institution: "安心药房 · 静安店",
      department: "药房",
      title: "执业药师",
      specialty: "处方审核与慢性病用药",
      yearsExperience: 11,
      licenseNo: "DEMO-PHA-001",
      documentName: "苏玉梅执业药师资质.png",
      documentType: "image/png",
      documentData,
      pharmacyName: "安心药房 · 静安店",
      pharmacyAddress: "上海市静安区安康路 28 号",
      pharmacyPhone: "13910003001",
      pharmacyLicenseNo: "DEMO-PHARMACY-001",
      pharmacyMapLocation: { x: 2.2, y: 2.2 },
      catalogFileName: "安心药房药品目录.xlsx",
      drugCatalog: catalog(1),
    },
  },
  {
    role: "PHARMACIST",
    realName: "何雨",
    phone: "13910003002",
    password: "Pha@3002",
    address: "上海市徐汇区云锦路 80 号",
    mapLocation: { x: 7, y: 5 },
    qualification: {
      institution: "惠民药房 · 徐汇店",
      department: "药房",
      title: "执业药师",
      specialty: "常见病用药与过敏风险管理",
      yearsExperience: 7,
      licenseNo: "DEMO-PHA-002",
      documentName: "何雨执业药师资质.png",
      documentType: "image/png",
      documentData,
      pharmacyName: "惠民药房 · 徐汇店",
      pharmacyAddress: "上海市徐汇区云锦路 80 号",
      pharmacyPhone: "13910003002",
      pharmacyLicenseNo: "DEMO-PHARMACY-002",
      pharmacyMapLocation: { x: 7, y: 5 },
      catalogFileName: "惠民药房药品目录.xlsx",
      drugCatalog: catalog(0.96),
    },
  },
];

const accounts = [];
for (const account of [...patients, ...doctors, ...pharmacists]) {
  const result = register(account);
  accounts.push({
    ...account,
    id: result.user.id,
    username: result.user.username,
  });
  if (account.role !== "PATIENT") {
    reviewRegistration("u-admin", result.user.id, "approve", "演示账号资质审核通过");
  }
}

let state = readState();
const doctorAccounts = accounts.filter((account) => account.role === "DOCTOR");
const pharmacistAccounts = accounts.filter(
  (account) => account.role === "PHARMACIST",
);
state.hospital = {
  id: "hospital-demo",
  name: "灵枢综合医院",
  address: "上海市静安区中心路 88 号",
  phone: "021-6000-0088",
  departments: ["呼吸内科", "消化内科", "心血管内科", "神经内科"],
  doctorIds: doctorAccounts.map((doctor) => doctor.id),
  mapLocation: { x: 5, y: 4 },
};
for (const patient of patients) {
  const account = accounts.find((item) => item.phone === patient.phone);
  const stored = state.users.find((item) => item.id === account.id);
  Object.assign(stored, {
    allergy: patient.allergy,
    medicalHistory: patient.medicalHistory,
    bloodType: patient.bloodType,
    mapLocation: patient.mapLocation,
  });
}
for (const pharmacy of state.pharmacies) {
  const pharmacist = pharmacistAccounts.find(
    (account) =>
      account.qualification.pharmacyLicenseNo === pharmacy.licenseNo,
  );
  Object.assign(pharmacy, {
    mapLocation: pharmacist.qualification.pharmacyMapLocation,
    hours: "08:30—21:30",
    distance: "按地图坐标计算",
  });
}
state.notifications = [
  {
    id: `note-${Date.now()}`,
    role: "ADMIN",
    icon: "users",
    title: "演示账号已创建",
    content: "3 名患者、4 名医生、2 名药师及 2 家合作药房已写入系统。",
    time: "刚刚",
    unread: true,
    targetPage: "users",
  },
];
state = writeState(state, "u-admin", "DEMO_DATA_SEEDED");

console.log(
  JSON.stringify(
    accounts.map((account) => ({
      role: account.role,
      name: account.realName,
      username: account.username,
      phone: account.phone,
      password: account.password,
      address: account.address,
      department: account.qualification?.department || null,
      pharmacy: account.qualification?.pharmacyName || null,
    })),
    null,
    2,
  ),
);
