<div align="center">
  <img src="build/icon.png" width="96" alt="Luckydog 奖杯图标">
  <h1>Luckydog 🐾</h1>
  <p><strong>今天谁是幸运儿？点一下就知道。</strong></p>
  <p>一个认真抽奖、安静保管名单的小工具。</p>
  <p><a href="https://luckydog-draw.jadey-owo.chatgpt.site/">🎲 在线报名与抽奖</a> · <a href="https://github.com/Jadey-ovo/luckydog/releases/latest">📦 下载桌面版</a> · <a href="https://luckydog-draw.jadey-owo.chatgpt.site/privacy.html">🔒 隐私说明</a></p>
</div>

![Luckydog 抽奖界面，使用虚构演示名单](docs/preview.png)

周会抽个小礼物，活动选几位幸运观众，或者决定今天谁来分享。粘贴名单，填好名额，点击开始，等名字停下来。奖品请自己准备，Luckydog 负责揭晓。🎉

## 三步，把好运发出去

1. 选择报名时长，生成二维码或复制邀请链接。
2. 实时查看参与名单；到期自动截止，也可以确认后提前截止。
3. 核对名单、设置中奖名额，点击「开始抽奖」。

在线版目前以邀请报名作为名单入口。桌面版保留手动名单输入，支持换行、逗号、分号和空白分隔。同一轮不会重复中奖，新一轮会重新从完整名单抽取。抽奖开始后，名单和名额会暂时锁定；结果页可生成临时分享链接。

## 想先试试，还是装进电脑？

**[打开 Sites 在线版](https://luckydog-draw.jadey-owo.chatgpt.site/)**，无需注册，无需安装。

桌面版自带运行环境，装好后可以完全离线使用。

下一版开始，桌面应用会自动检查 GitHub Release。新版本下载完成后会提示重启安装；如果系统限制自动替换，则会引导到官方下载页。当前 v1.1.0 尚未包含更新器，需要手动下载一次新版安装包。

| 你的电脑 | v1.1.0 安装包 | 打开方式 |
| --- | --- | --- |
| Windows 10 / 11，64 位 x64 | [下载 EXE](https://github.com/Jadey-ovo/luckydog/releases/download/v1.1.0/Luckydog-1.1.0-win-x64.exe) | 双击，按安装向导操作 |
| Mac，Apple 芯片 M 系列 | [下载 DMG](https://github.com/Jadey-ovo/luckydog/releases/download/v1.1.0/Luckydog-1.1.0-mac-arm64.dmg) | 打开后拖入「应用程序」 |
| Mac，Intel 芯片 | [下载 DMG](https://github.com/Jadey-ovo/luckydog/releases/download/v1.1.0/Luckydog-1.1.0-mac-x64.dmg) | 打开后拖入「应用程序」 |

[全部版本与更新说明](https://github.com/Jadey-ovo/luckydog/releases) · [下载文件校验值](https://github.com/Jadey-ovo/luckydog/releases/download/v1.1.0/SHA256SUMS.txt)

目前的安装包未做开发者签名及 Apple 公证，系统可能提示未知开发者或阻止打开。受管理的公司电脑可能限制运行，可以先用网页版。Mac 两种架构已在 Apple 芯片机器上启动验证，其中 Intel 版通过兼容运行验证；Windows 安装包已构建，尚未在 Windows 实机验证。

## 名单的事，留在你这边

Luckydog 的抽奖功能由前端完成，不需要登录账号，没有广告、埋点和统计 SDK。在线邀请与结果分享使用可选的业务服务。

| 内容 | 网页版 | 桌面版 |
| --- | --- | --- |
| 默认名单存放位置 | 报名期间临时保存到 Sites 托管数据库 | 当前电脑的应用数据中 |
| 希望下次接着用 | 不保存，请使用桌面版 | 自动保存 |
| 中奖记录 | 当前页面内存，不保存历史 | 当前窗口内存，不保存历史 |
| 姓名及结果上传 | 报名用户名及主动分享的结果会临时上传 | 不上传 |
| 网络需求 | 首次加载静态页面，之后可断网抽奖 | 安装后可完全离线使用 |

在线邀请和分享结果仅在发起页面保持打开时临时保存。报名截止后，邀请页会明确显示活动已经结束；刷新或关闭发起页面后会删除并失效，关闭通知未送达时由约 90 秒的在线租约兜底。桌面版使用本机的 `localStorage` 保存名单，它不是加密存储，共用电脑上请用完清空。应用不会把名字写进网址，也不会发送姓名或结果给 GitHub。

完整在线版由 Sites 提供网页、报名与结果接口，并用托管 D1 保存主动提交的数据。托管方可能记录访问 IP 等日志。浏览器扩展或设备上的其他软件不受本应用控制。

## 随机这件事，认真一点

抽奖使用 `crypto.getRandomValues` 生成随机数，再通过拒绝采样和 Fisher-Yates 洗牌选择中奖者，避免直接取模产生的偏差。屏幕上滚动的名字只负责气氛，中奖名单由安全随机数确定。

这是本地活动工具，没有第三方审计或防篡改证明。需要可审计的正式抽奖时，请另外制定并记录完整活动规则。

## Sites 在线版与后续更新

此项目发布到 **Sites + 托管 D1**，页面和报名接口位于同一个 Site 地址。Sites 负责创建数据库和部署连接，不需要另填 Cloudflare Token、Account ID 或 D1 ID。

Sites 复用 `worker/index.mjs` 的报名、去重、管理权限和结果接口，网页界面保持一致。额外的适配包括 `.openai/hosting.json` 中的 `DB` 声明、Drizzle 迁移，以及 `worker/sites.mjs` 的托管入口。邀请到期或发起人提前截止后不再接收报名，并保留“活动已结束”状态供参与者查看。关闭发起页面时，浏览器会发送销毁请求；若请求未能送达，短时在线租约会在约 90 秒内让邀请和结果链接失效。

后续可以直接让 Codex“将 Luckydog 最新修改同步发布到现有 Site”。它会检查并更新代码、验证后发布到同一个项目，保留网址和数据库。**GitHub 推送目前不会自动更新 Sites**；GitHub 与 Sites 是两个发布目的地，需要分别同步。本站不会为了发布而重建数据库。数据库结构更新以追加迁移完成，已经发布的迁移不可改写。

开发者运行 `npm run build:sites` 得到 Sites 专用产物（`dist/client`、`dist/server` 与迁移元数据）。普通 `npm run build` 生成桌面版使用的静态资源；两种构建都会重新生成 `dist`，发布前需要选择正确命令。Sites 使用 `drizzle/` 迁移，`migrations/` 保留给本地 Worker 测试，两套迁移需要同步追加并验证。

## 想自己改一改

需要 Node.js 24，依赖统一由 npm 管理。

```sh
npm ci
npm run dev
```

| 命令 | 用途 |
| --- | --- |
| `npm test` | 抽奖算法和名单解析测试 |
| `npm run build` | 类型检查和生产构建 |
| `npm run test:web` | 自动构建，启动本地 Worker/D1，验证网页隐私、报名分享与离线抽奖 |
| `npm run test:worker` | 用实际 Workers 运行时与本地 D1 测试接口、并发和过期清理 |
| `npm run dev:worker` | 构建页面、迁移本地 D1，并启动完整网站 |
| `npm run db:migrate:local` | 将数据库结构更新应用到本地 D1 |
| `npm run test:desktop` | 启动隔离数据目录，验证桌面流程 |
| `npm run desktop` | 启动桌面应用 |
| `npm run dist:win` | 生成 Windows 安装包 |
| `npm run dist:mac` | 生成两种 Mac 架构的 DMG 和 ZIP |

首次运行网页测试前，执行 `npx playwright install chromium`。安装包在 `release/`，网页静态文件在 `dist/`。详细结构见 [开发说明](docs/DEVELOPMENT.md)。

推送到 GitHub 只更新代码仓库，不会自动发布 Sites；Sites 版本需要单独保存并部署。推送版本标签会在 Windows 和 macOS 上构建安装包，成功后创建带附件的草稿 Release。流程见 [发布说明](docs/RELEASING.md)。

发现问题可以 [提一个 Issue](https://github.com/Jadey-ovo/luckydog/issues)。描述操作步骤就好，请用「小王、小李」这样的演示名单，别把真实人员名单贴进去。

### 三步参与流程与在线分享

在线流程为发起报名 → 确认名单 → 设置中奖名额。发起页实时显示序号和用户名，参与页显示截止倒计时。到期自动停止报名；提前点击“截止报名”需要二次确认。在线版暂时隐藏手动输入与 Excel 导入，桌面版保留手动输入。

完整在线版采用 Sites Worker + 托管 D1，页面和 `/api/*` 位于同一个 Site 地址。GitHub 保存源代码，Sites 保存并部署线上版本；两边更新需要分别同步。

邀请链接可设置 5、10、30 分钟有效期，默认 5 分钟。到期或提前截止后，二维码、链接和参与页都会显示截止状态；关闭或刷新发起页面时会请求删除活动。结果分享只在发起页面保持打开时有效。为处理浏览器来不及发送关闭请求的情况，发起页面持续续期，停止续期后约 90 秒自动失效。D1 的平台备份、恢复历史和托管访问日志有各自的保留策略，不等于应用记录删除。发起页面的管理令牌仅保留在内存中。报名通过 HttpOnly Cookie 限制同一浏览器一次，并禁止重复用户名。数据库在写入时检查截止时间、人数上限和唯一性，防止多个请求同时报名绕过去重。

点击“生成分享链接”才上传中奖名单。纯静态站点和桌面版不提供在线分享。

### 本地运行完整网站

```sh
npm ci
npm run dev:worker
```

打开 `http://127.0.0.1:3001`。这条命令自动构建网页、创建本地数据库表并启动 Worker，所有数据都留在 `.wrangler/`，不会连接线上 D1。修改 React 页面时，可另开终端运行 `npm run dev` 并打开 `http://127.0.0.1:3000`，Vite 会将 `/api` 转发到本地 Worker。只运行 `npm run dev` 不会启动报名服务。

`npm run test:worker` 使用 Miniflare 的实际 Workers 运行时和本地 D1，并执行正式 SQL 迁移；覆盖权限、并发去重、截止报名、关闭与报名竞争、在线租约、清理及无效请求。`npm run test:web` 自动构建并通过 Wrangler 启动完整网站，使用独立的 `.wrangler/web-tests` 数据目录，每次测试重置这个目录，不触碰开发数据。首次网页测试先执行 `npx playwright install chromium`。

旧 `server/index.mjs` 保留为本地对照实现，可用 `npm run server:legacy` 启动；它不会用于 Sites 或上述测试。旧 `.luckydog-data/shares.json` 不会自动上传或导入 D1。

### Sites 发布与维护

发布前运行完整测试，再执行 `npm run build:sites` 生成 Sites 产物。源代码提交并推送到 GitHub 后，将同一提交推送到 Sites 源仓库，保存新版本并部署。部署会沿用现有公开地址和数据库，不需要 Cloudflare 账号或令牌。

数据库结构变更必须新增 Drizzle 迁移，不要改写已经发布的迁移。应用限制每种有效分享最多 10000 条、每个邀请最多 5000 人；平台本身的用量限制以 Sites 界面显示为准。
