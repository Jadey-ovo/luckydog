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
| `tests/` | 核心逻辑、桌面、浏览器隐私测试 |

## 网页与报名数据

Sites 邀请的 `expires` 固定为创建时间 + 86400000 ms；`join_expires` 独立按 5/10/30 分钟计算。未开奖房间的 `active_until` 是 90 秒发起人租约，失去续期只转为 interrupted，保留可查询状态与本人信息，不立即删除。完成开奖将租约设为 NULL；所有续期、重新开放与重抽路径均不能延长 expires。清空立即 DELETE 并级联删除参与者。

公开 GET 只返回 state、有效期和当前 Cookie 对应的 participant / personalResult。中奖按服务端参与者 ID 匹配，提交结果必须来自当前名单且不能重复 ID；姓名以数据库为准。完整结果只返回给 Bearer owner。开奖后不能再移除用户，继续抽奖保留完整名单并覆盖最新结果。读取失败与 404 在 UI 中分开处理，首次响应前只显示加载。

管理令牌仅在内存中，刷新不恢复管理。未开奖连接中断不可续命，需清空或新建。已开奖关闭页面仍能查询至原 24 小时期满。服务端成功保存之前不能承诺分享成功，客户端提供同步重试，重试使用同一开奖结果。未完成同步即退出，参与者不会看到未保存的本地结果。

迁移 0004 把旧版 7 天 expires 减去 6 天，保留原创建基准；旧随机 winner ID 按活动内唯一姓名映射回参与者 ID，已开奖结果解除租约。更新原子报名触发器，拒绝过期、租约失效、已开奖的插入。`migrations/` 和 `drizzle/` 同步追加，旧文件保持不变。

Sites 入口按 API 流量触发 prune，每个运行实例最多每小时一次；没有流量时物理删除延后，但过期访问始终立即拒绝。独立 Worker 使用 scheduled 清理。旧 `/api/results` 仅为兼容接口，仍为短租约公开分享；旧 Node server 不用于生产或测试，不实现新协议。

脚本仅允许同源资源，所有依赖和样式已本地打包，没有第三方字体请求。在线版只调用同源 `/api/*`；开发模式单独允许本地 Vite 热更新连接。

网页测试覆盖实时名单、提前截止与继续报名、本人报名信息、参与者移除确认、同一活动链接更新开奖结果、继续抽奖、清空后链接失效、复制提示、大名单布局、页面关闭保留结果、加载与网络错误、本人中奖/未中奖/未参与、24 小时边界和接口边界。测试使用虚构名字和隔离的本地 D1。

## 桌面边界

渲染进程不开启 Node，启用沙箱、上下文隔离和 Web 安全。无 preload 或 IPC 特权接口。主进程拦截远程网络请求、新窗口和页面跳转。应用包仅收录 `dist/`、`electron/`、`package.json`，构建依赖不进入运行包。

## 验证

```sh
npm ci
npm test
npm run test:worker
npm run build
npx playwright install chromium
npm run test:web
npm run test:desktop
```

`LUCKYDOG_EXECUTABLE` 可指定构建后的桌面可执行文件用于集成测试。`WEB_TEST_URL` 可指定已部署的网址，包含项目子路径时末尾保留 `/`。

Windows 推荐在 Windows 上构建。macOS 在 Mac 上构建。当前安装包未签名、公证，具体发布步骤见 RELEASING.md。
