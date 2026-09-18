# 开发说明

Luckydog 使用同一套 React 界面提供网页和桌面体验。Vite 生成静态文件，Electron 加载本地文件。没有业务后端、数据库、分析服务或远程 AI 调用。

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

## 网页隐私

HTTPS 页面默认只保留内存名单。勾选保存后使用本地 `localStorage`，取消后移除已保存内容。桌面版通过 `file:` 加载，默认保留原有的本机保存行为。中奖结果不持久化。

生产页面的 CSP 设置 `connect-src 'none'` 和 `form-action 'none'`。脚本仅允许同源资源，所有依赖和样式已本地打包，没有第三方字体请求。开发模式单独允许本地 Vite 热更新连接。

网页测试在导入前停止联网，检查抽奖仍成功、操作未发出任何请求、默认没有本地存储，以及保存需要主动勾选。测试使用虚构名字。

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
