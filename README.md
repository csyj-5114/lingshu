# 灵枢 · 智慧医疗在线问诊与处方流转平台

灵枢是一个可直接运行的全栈医疗业务项目，包含独立前端、Node.js 后端 API、SQLite 数据库、登录会话、角色权限和业务状态持久化。

## 技术栈

- 前端：原生 HTML、CSS、ES Modules
- 后端：Node.js 24、内置 `node:http`
- 数据库：SQLite，使用 Node.js 内置 `node:sqlite`
- 鉴权：HttpOnly Cookie + 服务端会话
- 密码：`scrypt` + 随机盐哈希
- 部署：Docker

项目不使用第三方 npm 依赖，不需要执行 `npm install`。

## 启动

在项目根目录执行：

```powershell
npm start
```

访问 `http://127.0.0.1:4173`。

首次启动会自动创建 `backend/data/lingshu.sqlite` 并写入演示数据。

接口健康检查：

```text
GET http://127.0.0.1:4173/api/health
```

## 演示账号

| 角色 | 账号 | 密码 |
| --- | --- | --- |
| 管理员 | `admin` | `demo123` |

全新数据库只预置管理员账号，其他用户、问诊、处方、资质、药品和药房记录全部为空。管理员账号不开放自助注册。患者、医生和药师从登录页注册，管理员再按需新增药品和药房：

登录页支持“账号登录”和“手机号登录”两种方式，两者可以随时切换。账号为系统自动分配的登录账号，手机号使用注册时完成短信验证的号码。

1. 用户填写手机号并完成短信验证码校验，登录账号由系统自动分配。
2. 所有注册用户必须填写 18 位居民身份证号；系统会核验出生日期与校验码，并检查同一证件是否已绑定其他账号。数据库只保存证件号摘要和脱敏号码。
3. 患者注册成功后可直接登录，并可在“健康档案”中修改姓名、性别、年龄、血型、过敏记录、既往病史和常用地址。
4. 医生和药师需要额外填写执业机构、科室/药房、资格证编号、从业年限和专业方向。
5. 医生与药师必须上传 JPG、PNG 或 PDF 格式的资质材料；提交后账号进入待审核状态，暂时不能登录。
6. 管理员登录后在“账号审核”页面查看材料和审核意见，通过后账号自动启用。
7. 忘记密码时可通过注册手机号和短信验证码重置密码。
8. 医生或药师审核被驳回后可继续使用原账号登录，查看驳回原因、修改执业信息并重新上传资质，提交后重新进入管理员审核队列。

药师上传的药品目录支持 `.xlsx` 和 `.csv`，推荐表头为：

```text
药品编号,药品名称,规格,生产厂家,批准文号,药品类型,单价,库存,禁忌与注意事项
```

管理员通过药师资质后，系统会按药品经营许可证创建或复用合作药房，并将目录中的价格、库存和禁忌信息同步到全局药品目录。医生开方时可按药品名称、厂家、批准文号或药房搜索；推荐药房时只考虑能配齐整张处方且库存充足的药房，并按患者地址距离 60%、药房实际处方价格 40% 综合排序。

同一药品经营许可证的药师申请会归入同一药房，避免重复创建合作药房。

本地开发环境不依赖外部短信供应商，页面会直接显示测试验证码。生产环境配置短信 Webhook 后，验证码只通过短信发送，不会出现在 API 响应中：

```powershell
$env:NODE_ENV="production"
$env:SMS_WEBHOOK_URL="https://your-sms-provider.example/send"
$env:SMS_WEBHOOK_TOKEN="your-provider-token"
$env:SMS_CODE_SECRET="replace-with-a-long-random-secret"
$env:IDENTITY_HASH_SECRET="replace-with-another-long-random-secret"
npm start
```

## 已实现功能

- 患者 AI 症状采集、同义词归一、多症状加权分诊、风险分级和首选/备选科室推荐
- AI 导诊只推荐资质已通过、状态正常、当前在岗且科室匹配的医生，并按专业方向、从业年限、评分和接诊量排序；无匹配医生时明确提示暂不可接诊
- 患者与医生在线图文问诊
- 患者完整健康档案修改（支持清空或重新填写过敏史、既往病史等字段）、AI 导诊历史、病情摘要和处方流转结果
- 患者选择医生后先支付问诊费，支付成功医生才能接诊
- 医生接受问诊、查看患者资料、搜索药品并完成处方开具
- 医生创建处方草稿、添加药品并提交给患者选择药房
- 患者查看系统推荐药房并自行选择取药药房，只有选中的药房会收到审核任务
- 药师查看过敏风险、审核通过、驳回与处方作废
- 药师检查处方完整性、药品状态、禁忌信息和审核历史
- 药师注册提交所属药房、地址、经营许可证和 Excel/CSV 药品目录，管理员审核通过后自动建药房并更新全局药品目录
- 药师审核通过后患者支付药费，支付成功生成取药码
- 药师完成取药核销后按处方数量自动扣减所属药房库存，并提醒管理员补录库存
- 药师可以实时修改所属药房药品数量，管理员端可同步查看
- 管理员可修改药房目录库存、停用或启用药房；药房停用后停止接收新处方，关联药师也不能继续审核或核销
- 系统根据患者地址、药房距离和处方价格综合推荐药房，医生端不手动选择药房
- 处方按“待开具 → 待选药房 → 待审核 → 待支付 → 已流转 → 已核销 / 已作废”流转
- 目标药房选择、72 小时有效期、取药码和核销
- 管理员维护用户状态、药品目录和合作药房
- 管理员问诊管理、处方管理、药师药房归属和操作审计
- 操作审计日志与演示数据重置
- 服务端登录会话与角色权限控制
- 患者、医生、药师三步注册、18 位身份证号校验与医生/药师资质审核
- 手机号短信验证码、系统自动分配账号与短信重置密码
- 管理员审核通过、驳回和资质材料预览
- 桌面端和移动端响应式界面

## 项目结构

```text
.
├── frontend/
│   ├── index.html                 # 前端入口
│   ├── styles.css                 # 页面样式与响应式布局
│   ├── app.js                     # 页面、路由和业务交互
│   └── js/
│       ├── domain.js              # 处方状态机与分诊规则
│       ├── seed.js                # 初始化演示数据
│       └── store.js               # 后端 API 客户端
├── backend/
│   ├── server.mjs                 # HTTP 服务与 REST API
│   ├── database.mjs               # 鉴权、会话与数据持久化
│   ├── sms.mjs                    # 短信 Webhook 与本地验证码发送
│   └── data/
│       └── lingshu.sqlite         # 运行时自动生成的 SQLite 数据库
├── database/
│   ├── schema.sqlite.sql          # 当前运行数据库结构
│   └── schema.mysql.sql           # 设计文档对应的 MySQL 结构
├── tests/
│   └── domain.test.mjs            # 处方状态机与分诊规则测试
├── Dockerfile
└── package.json
```

## API

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `/api/health` | 服务与数据库健康检查 |
| `POST` | `/api/auth/login` | 登录并创建 HttpOnly 会话 |
| `POST` | `/api/auth/register` | 注册患者、医生或药师账号 |
| `POST` | `/api/auth/phone/send-code` | 发送注册或重置密码验证码 |
| `POST` | `/api/auth/phone/verify` | 校验手机号验证码 |
| `POST` | `/api/auth/password/reset` | 通过短信验证码重置密码 |
| `GET` | `/api/auth/session` | 获取当前会话 |
| `POST` | `/api/auth/logout` | 退出登录 |
| `GET` | `/api/state` | 按角色读取业务数据 |
| `PUT` | `/api/state` | 校验角色后同步业务数据 |
| `GET` | `/api/users` | 用户列表 |
| `GET` | `/api/consultations` | 当前角色的问诊列表 |
| `GET` | `/api/prescriptions` | 当前角色的处方列表 |
| `GET` | `/api/drugs` | 药品目录 |
| `GET` | `/api/pharmacies` | 合作药房 |
| `GET` | `/api/audit` | 管理员审计日志 |
| `GET` | `/api/qualifications/:userId` | 查看本人或管理员的资质材料 |
| `POST` | `/api/admin/registrations/:userId/review` | 管理员通过或驳回资质申请 |
| `POST` | `/api/reset` | 管理员重置演示数据库 |

## 测试

```powershell
npm test
npm run test:workflow
```

## Docker

```powershell
docker build -t lingshu-medical .
docker run --rm -p 4173:4173 lingshu-medical
```

如需保留 Docker 中的数据库文件，请挂载数据目录：

```powershell
docker run --rm -p 4173:4173 -v lingshu-data:/app/backend/data lingshu-medical
```

> 本项目为软件工程课程设计项目。页面内医生、药品、诊断与风险提示均为演示数据，不构成实际医疗建议。
