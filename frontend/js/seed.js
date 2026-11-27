export function createSeedState() {
  const now = new Date().toISOString();
  return {
    version: 5,
    hospital: null,
    users: [
      {
        id: "u-admin",
        username: "admin",
        password: "demo123",
        realName: "管理员",
        role: "ADMIN",
        phone: "13900001120",
        title: "平台管理员",
        status: 1,
        approvalStatus: "approved",
        lastActive: now,
      },
    ],
    drugs: [],
    pharmacies: [],
    consultations: [],
    prescriptions: [],
    triageSessions: [],
    notifications: [],
    appointments: [],
    registrations: [],
  };
}
