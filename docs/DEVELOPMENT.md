# 开发说明

Luckydog 使用同一套 React 界面提供网页和桌面体验。Vite 生成静态文件，Electron 加载本地文件；Sites Worker 与托管 D1 提供在线报名和结果分享。

## 目录

| 位置 | 职责 |
| --- | --- |
| `App.tsx`、`components/` | 界面和用户操作 |
| `hooks/useParticipants.ts` | 名单状态、网页保存授权、存储错误提示 |
| `hooks/useDraw.ts` | 名单快照、抽奖生命周期、计时器清理 |
| `services/participants.ts` | 名单校验、导入、重名处理 |
| `utils/random.ts` | 安全随机数、拒绝采样、洗牌 |
| `electron/main.cjs` | 窗口、菜单、单实例、进程安全边界 |
| `electron-builder.yml` | 安装包白名单和多平台目标 |
| `public/privacy.html` | 静态隐私说明 |
| `scripts/dev-worker.mjs` | 本地数据库迁移、服务启动与新增迁移自动重启 |
| `tests/` | 核心逻辑、桌面、浏览器隐私测试 |

## 网页与报名数据

Sites 邀请的 `expires` 固定为创建时间 + 86400000 ms；`join_expires` 独立按 5/10/30 分钟计算。`active_until` 是 90 秒发起人租约，开奖不会结束活动，保存每轮结果时会继续续租。失去续期且未开奖时转为 interrupted；已有结果时转为 ended。两者都保留可查询状态与本人信息，不立即删除。所有续期、重新开放与重抽路径均不能延长 expires。重置通过 PATCH archive 标记 archived=1、立即结束活动并释放租约，不删除记录；旧 DELETE 也按归档处理，避免旧客户端破坏历史。到期 prune 才级联删除参与者与 room_draws。

公开 GET 只返回 state、有效期和当前 Cookie 对应的 participant / personalResult / history。中奖按服务端参与者 ID 匹配，提交结果必须来自当前名单且不能重复 ID；姓名以数据库为准。完整结果只返回给 Bearer owner。开奖后不能再移除用户，继续抽奖保留完整名单，更新最新结果并新增 room_draws 记录。更新房间结果的触发器保证历史与最新结果原子提交；时间戳作为轮次幂等键，同轮重试不新增记录，旧请求不会覆盖更新的结果。归档后禁止再报名、开奖或修改名单。读取失败与 404 在 UI 中分开处理，首次响应前只显示加载。

管理令牌仅在内存中，刷新不恢复管理。关闭或刷新发起页后停止续租，约 90 秒后活动结束；未开奖连接中断不可续命，需返回重新发起。已同步结果仍能查询至原 24 小时期满。服务端成功保存之前不能承诺分享成功，客户端提供同步重试，重试使用同一开奖结果。未完成同步即退出，参与者不会看到未保存的本地结果。

迁移 0004 把旧版 7 天 expires 减去 6 天，保留原创建基准；旧随机 winner ID 按活动内唯一姓名映射回参与者 ID。0006 为已有开奖结果补上一次 90 秒迁移租约，仍打开的发起页会继续续租。更新原子报名触发器，拒绝过期、租约失效、已开奖的插入。`migrations/` 和 `drizzle/` 同步追加，旧文件保持不变。

Sites 入口按 API 流量触发 prune，每个运行实例最多每小时一次；没有流量时物理删除延后，但过期访问始终立即拒绝。独立 Worker 使用 scheduled 清理。旧 `/api/results` 仅为兼容接口，仍为短租约公开分享；旧 Node server 不用于生产或测试，不实现新协议。

脚本仅允许同源资源，所有依赖和样式已本地打包，没有第三方字体请求。在线版只调用同源 `/api/*`；开发模式单独允许本地 Vite 热更新连接。

网页测试覆盖实时名单、提前截止与继续报名、本人报名信息、参与者移除确认、同一活动链接更新开奖结果、继续抽奖、重置后历史链接保留、复制提示、大名单布局、页面关闭保留结果、加载与网络错误、本人中奖/未中奖/未参与、24 小时边界和接口边界。测试使用虚构名字和隔离的本地 D1。

## 桌面边界

渲染进程不开启 Node，启用沙箱、上下文隔离和 Web 安全。无 preload 或 IPC 特权接口。主进程拦截远程网络请求、新窗口和页面跳转。应用包仅收录 `dist/`、`electron/`、`package.json`，构建依赖不进入运行包。

## 验证

```sh
npm ci
npm test
npm run test:worker
npm run test:dev
npm run build
npx playwright install chromium
npm run test:web
npm run test:desktop
```

`LUCKYDOG_EXECUTABLE` 可指定构建后的桌面可执行文件用于集成测试。`WEB_TEST_URL` 可指定已部署的网址，包含项目子路径时末尾保留 `/`。

Windows 推荐在 Windows 上构建。macOS 在 Mac 上构建。当前安装包未签名、公证，具体发布步骤见 RELEASING.md。

## 每轮结果与归档迁移

0005 新增 rooms.archived 和 room_draws；已有最后一轮结果回填为第一条记录，升级前已经被覆盖的旧轮次无法恢复。历史按 room_id 关联，expiry 与原活动一致。参与页只收到本人每轮的 round / won / timestamp；未报名浏览器不收到历史或名单。归档不延长期限，也不能恢复活动管理。

参与页采用统一身份卡，报名说明仅在未报名且报名开放时显示。有效期单独放在页底；失效状态无跳转入口。首次加载、网络错误和 404 分离；404 后不再轮询，避免旧链接持续请求。发起页在矮窗口允许页面滚动；320/768/1024/1440 宽度覆盖实际抽奖与重置流程。

仅验证 Sites 源入口与 Drizzle 迁移、而不生成 Sites 打包产物时，运行 `LUCKYDOG_TEST_SITES=source npm run test:worker`。

## 本地开发与新增迁移

使用 `npm run dev:worker` 或 `npm run server` 启动完整网站。启动管理脚本固定使用本地 D1，并让迁移命令和 Worker 使用同一 `.wrangler/state` 目录；迁移成功前不启动 API。新增 `migrations/*.sql` 后会自动停止 Worker、执行迁移并重启，避免新版 Worker 访问旧表结构。

迁移失败时服务保持停止，终端提示修复并重新运行 `npm run dev:worker`。不要删除 `.wrangler/state` 作为常规修复方式，那里保留本地活动。运行期间修改或删除已存在迁移会停止服务并报错；应恢复旧文件，使用追加迁移修正结构。前端资源仍在启动时构建，页面开发可配合 Vite。

旧的、直接启动的 `wrangler dev` 进程没有上述监测能力。首次切换到此脚本时，请先在旧进程终端按 Ctrl+C，再运行 `npm run dev:worker`。单独运行 `npm run db:migrate:local` 只迁移数据库，不负责重启服务；不要把旧服务仍在运行误认为新流程已接管。

`npm run test:dev` 使用临时配置、独立数据库目录和随机端口，通过实际 Wrangler 验证：仅有 0004 的数据库升级到 0005 后可查询旧活动与历史；运行中新增迁移后自动重启；迁移失败停止服务；修复后重启保留原数据；修改已执行迁移会明确报错。测试不访问生产数据库，也不生成安装包。

测试或独立本地环境可通过 `LUCKYDOG_DEV_CONFIG`、`LUCKYDOG_DEV_STATE`、`LUCKYDOG_DEV_PORT` 指定配置文件、数据目录和端口。脚本只传入 `--local`，不支持远程迁移。
