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

Sites 在线版以邀请报名作为名单入口，用户名在活动期间临时保存在 D1。截止后停止写入并向参与者显示本人报名信息；开奖结果写回同一活动链接。继续抽奖会覆盖链接中的最近结果。清空活动或关闭发起页面后删除；关闭请求未送达时由约 90 秒的在线租约判定失效。桌面版通过 `file:` 加载，保留本机手动输入和本机保存行为。

脚本仅允许同源资源，所有依赖和样式已本地打包，没有第三方字体请求。在线版只调用同源 `/api/*`；开发模式单独允许本地 Vite 热更新连接。

网页测试覆盖实时名单、提前截止与继续报名、本人报名信息、参与者移除确认、同一活动链接更新开奖结果、继续抽奖、清空后链接失效、复制提示、大名单布局、页面关闭失效和接口边界。测试使用虚构名字和隔离的本地 D1。

## 桌面边界

渲染进程不开启 Node，启用沙箱、上下文隔离和 Web 安全。无 preload 或 IPC 特权接口。主进程拦截远程网络请求、新窗口和页面跳转。应用包仅收录 `dist/`、`electron/`、`package.json`，构建依赖不进入运行包。

## 验证

```sh
npm ci
npm test
npm run build
npx playwright install chromium
npm run test:web
npm run test:desktop
```

`LUCKYDOG_EXECUTABLE` 可指定构建后的桌面可执行文件用于集成测试。`WEB_TEST_URL` 可指定已部署的网址，包含项目子路径时末尾保留 `/`。

Windows 推荐在 Windows 上构建。macOS 在 Mac 上构建。当前安装包未签名、公证，具体发布步骤见 RELEASING.md。
