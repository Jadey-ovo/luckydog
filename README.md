<div align="center">
  <img src="build/icon.png" width="96" alt="Luckydog 奖杯图标">
  <h1>Luckydog 🐾</h1>
  <p><strong>今天谁是幸运儿？点一下就知道。</strong></p>
  <p>一个认真抽奖、安静保管名单的小工具。</p>
  <p><a href="https://jadey-ovo.github.io/luckydog/">🎲 直接开抽</a> · <a href="https://github.com/Jadey-ovo/luckydog/releases/latest">📦 下载桌面版</a> · <a href="https://jadey-ovo.github.io/luckydog/privacy.html">🔒 隐私说明</a></p>
</div>

![Luckydog 抽奖界面，使用虚构演示名单](docs/preview.png)

周会抽个小礼物，活动选几位幸运观众，或者决定今天谁来分享。粘贴名单，填好名额，点击开始，等名字停下来。奖品请自己准备，Luckydog 负责揭晓。🎉

## 三步，把好运发出去

1. 选择名单输入、Excel 导入或分享邀请。
2. 核对序号与用户名，确认参与名单。
3. 设置中奖名额，点击「开始抽奖」，约三秒后伴随礼花和庆祝音揭晓结果。

也支持中英文逗号、分号和空白分隔。重名会追加序号，例如「小王」和「小王 1」。同一轮不会重复中奖，新一轮会重新从完整名单抽取。抽奖开始后，名单和名额会暂时锁定。结果页可返回抽奖准备状态；启用在线服务后，可生成中奖名单分享链接。

## 想先试试，还是装进电脑？

**[打开网页试用](https://jadey-ovo.github.io/luckydog/)**，无需注册，无需安装。

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
| 默认名单存放位置 | 当前页面内存，刷新即清空 | 当前电脑的应用数据中 |
| 希望下次接着用 | 不保存，请使用桌面版 | 自动保存 |
| 中奖记录 | 当前页面内存，不保存历史 | 当前窗口内存，不保存历史 |
| 姓名及结果上传 | 手动名单不上传；主动邀请或分享时上传相应信息 | 不上传 |
| 网络需求 | 首次加载静态页面，之后可断网抽奖 | 安装后可完全离线使用 |

网页版手动名单只在当前页面内存中保留，刷新或关闭即清空。在线邀请与分享数据保留七天。桌面版使用本机的 `localStorage` 保存名单，它不是加密存储，共用电脑上请用完清空。应用不会把名字写进网址，也不会发送姓名或结果给 GitHub。

原静态网页入口托管在 GitHub Pages；完整在线版部署到 Cloudflare 后，由 Cloudflare 提供网页、报名与结果接口，并用 D1 保存主动提交的数据。托管方可能记录访问 IP 等日志。手动输入与 Excel 导入仍在本地处理。浏览器扩展或设备上的其他软件不受本应用控制。

## 随机这件事，认真一点

抽奖使用 `crypto.getRandomValues` 生成随机数，再通过拒绝采样和 Fisher-Yates 洗牌选择中奖者，避免直接取模产生的偏差。屏幕上滚动的名字只负责气氛，中奖名单由安全随机数确定。

这是本地活动工具，没有第三方审计或防篡改证明。需要可审计的正式抽奖时，请另外制定并记录完整活动规则。

## Sites 在线版与后续更新

此项目支持发布到 **Sites + 托管 D1**，页面和报名接口位于同一个 Site 地址。Sites 负责创建数据库和部署连接，不需要另填 Cloudflare Token、Account ID 或 D1 ID。下面的“第一次上线”清单是保留的**自建 Cloudflare 方案**，使用 Sites 时可以跳过。

Sites 复用 `worker/index.mjs` 的报名、去重、管理权限和结果接口，网页界面保持一致。额外的适配包括 `.openai/hosting.json` 中的 `DB` 声明、Drizzle 迁移，以及 `worker/sites.mjs` 的托管入口。Sites 中到期数据立即不可读取；后台记录在后续 API 访问时清理（每个运行实例至多每小时触发一次），没有访问时不会定时执行。自建 Cloudflare 的方案仍使用每小时 Cron 清理。

后续可以直接让 Codex“将 Luckydog 最新修改同步发布到现有 Site”。它会检查并更新代码、验证后发布到同一个项目，保留网址和数据库。**GitHub 推送目前不会自动更新 Sites**；GitHub 与 Sites 是两个发布目的地，需要分别同步。本站不会为了发布而重建数据库。数据库结构更新以追加迁移完成，已经发布的迁移不可改写。

开发者运行 `npm run build:sites` 得到 Sites 专用产物（`dist/client`、`dist/server` 与迁移元数据）。普通 `npm run build` 仍生成桌面版、GitHub Pages 和自建 Cloudflare 所用的原有结构；两种构建会重新生成 `dist`，请在对应发布前选择正确命令。Sites 使用 `drizzle/` 迁移，自建 Cloudflare 使用 `migrations/`，后续结构变更应同时更新并分别验证；两者共用同一套接口测试。

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

现有 GitHub Pages 流程保持不变。新增 Cloudflare 流程会在 PR 和推送 `main` 时测试；完成下面的后台配置并打开部署开关后，推送 `main` 还会自动迁移 D1 并部署完整网站。推送版本标签会在 Windows 和 macOS 上构建安装包，成功后创建带附件的草稿 Release，检查后再发布。流程见 [发布说明](docs/RELEASING.md)。

发现问题可以 [提一个 Issue](https://github.com/Jadey-ovo/luckydog/issues)。描述操作步骤就好，请用「小王、小李」这样的演示名单，别把真实人员名单贴进去。

### 三步参与流程与在线分享

当前流程为添加参与者 → 确认名单 → 设置中奖名额。支持手动输入和单列 Excel 模板导入，返回添加时可选择保留或清空名单。Excel 模板位于 `public/participants-template.xlsx`，从 A2 开始填写用户名。

手动导入和抽奖可离线使用。完整在线版采用 Cloudflare Worker + D1，页面和 `/api/*` 在同一域名下，前端无需填写服务器地址。GitHub 继续保存代码；`github.io` 本身不能运行 Worker，完整网站需要使用 Cloudflare 分配的 `workers.dev` 地址或你的自定义域名。现有 GitHub Pages 链接和发布流程没有被替换，也没有添加跳转。

邀请链接可设置 5、10、30 分钟有效期，默认 5 分钟，到期后禁止新报名；已报名名单仍可由发起人读取、确认和抽奖。邀请数据从创建起保留七天，结果从分享起保留七天；到期立即不可访问；自建 Cloudflare 由定时任务每小时删除过期记录，Sites 在后续访问时清理。D1 的平台备份、恢复历史和托管访问日志有各自的保留策略，不等于应用记录删除。发起页面的管理令牌仅保留在内存中，刷新或关闭页面后无法恢复管理；确认名单会截止报名。报名通过 HttpOnly Cookie 限制同一浏览器一次，并禁止重复用户名。数据库在写入时检查截止时间、人数上限和唯一性，防止多个请求同时报名绕过去重。清除 Cookie、更换浏览器或设备无法识别为同一人；首次请求还未收到 Cookie 时，也无法识别并发请求来自同一个浏览器。

点击“生成分享链接”才上传中奖名单。纯静态站点和桌面版不提供在线分享。

### 本地运行完整网站（不需要 Cloudflare 账号）

```sh
npm ci
npm run dev:worker
```

打开 `http://127.0.0.1:3001`。这条命令自动构建网页、创建本地数据库表并启动 Worker，所有数据都留在 `.wrangler/`，不会连接线上 D1。修改 React 页面时，可另开终端运行 `npm run dev` 并打开 `http://127.0.0.1:3000`，Vite 会将 `/api` 转发到本地 Worker。只运行 `npm run dev` 不会启动报名服务。

`npm run test:worker` 使用 Miniflare 的实际 Workers 运行时和本地 D1，并执行正式 SQL 迁移；覆盖权限、并发去重、截止报名、关闭与报名竞争、七天过期、定时清理及无效请求。`npm run test:web` 自动构建并通过 Wrangler 启动完整网站，使用独立的 `.wrangler/web-tests` 数据目录，每次测试重置这个目录，不触碰开发数据。首次网页测试先执行 `npx playwright install chromium`。

旧 `server/index.mjs` 保留为本地对照实现，可用 `npm run server:legacy` 启动；它不会用于 Cloudflare 或上述测试。旧 `.luckydog-data/shares.json` 不会自动上传或导入 D1，新 D1 初始为空。如果旧服务已有真实活动，应先让活动结束再切换；不要删除旧数据或在活动中途更换入口。

### 第一次上线：按顺序完成这些后台设置

以下仅适用于自行使用 Cloudflare 账号部署，不是 Sites 的必需步骤。你无需购买服务器，也无需保持自己的电脑开机。下面的步骤由你决定何时执行。

1. **准备 Cloudflare 账号。** 登录 Cloudflare，在 Workers & Pages 中完成首次启用，设置账号的 `workers.dev` 子域名。记录该账号的 **Account ID**（账号 ID）。不必连接 GitHub 自动构建，也不必先手动创建 Worker；此项目统一由 GitHub Actions 发布，避免两个发布流程互相覆盖。
2. **创建数据库。** 在 Cloudflare 的 Storage & Databases → D1 中创建名为 `luckydog` 的数据库，复制 **Database ID**（形如 `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`）。数据库和 Worker 应属于同一个账号。无需手动创建表，发布流程会自动执行 `migrations/0001_sharing.sql`。
3. **创建发布凭据。** 在 Cloudflare 的 Account API tokens 中创建 Token，选择 **Edit Cloudflare Workers** 模板，并添加该账号的 **D1 / Edit** 权限，让流程可以初始化和更新表。只授权目标账号。默认使用 `workers.dev`，无需授权其他网站的 DNS；如以后通过配置部署自定义域名，再按官方文档补充对应 zone 权限。复制 Token 后直接保存到下一步的 GitHub Secret，不要写进代码或发到聊天里。
4. **在 GitHub 填四项配置。** 打开仓库 → Settings → Secrets and variables → Actions。按下表添加一个 Secret 和三个 Variables。部署开关先填 `false`，准备上线时再改为 `true`。如仓库限制创建环境，可在 Settings → Environments 中创建 `cloudflare-production` 并允许 `main` 部署。

| 类型 | 名称（逐字复制） | 填什么 |
| --- | --- | --- |
| Secret | `CLOUDFLARE_API_TOKEN` | 第 3 步的发布 Token |
| Variable | `CLOUDFLARE_ACCOUNT_ID` | 第 1 步的账号 ID |
| Variable | `CLOUDFLARE_D1_DATABASE_ID` | 第 2 步的数据库 ID |
| Variable | `CLOUDFLARE_DEPLOY_ENABLED` | 准备好上线后填 `true`；否则填 `false` 或留空 |

5. **审查并上线。** 确认这些修改后再将代码合入 `main`。开关为 `true` 时，推送会自动测试、构建、更新数据库结构，最后发布 Worker 和网页；任何测试或迁移失败都会阻止发布。如果代码已在 `main`，可进入 Actions → Cloudflare website → Run workflow，选择 `main`。发布期间不要取消正在迁移的任务。
6. **拿到新网址。** 成功后在 Cloudflare → Workers & Pages → `luckydog` 中打开分配的 HTTPS 地址，通常形如 `https://luckydog.<你的子域名>.workers.dev`，以后台实际显示为准。用这个地址打开网站后创建邀请，手机才能使用同一个公网链接。可选自定义域名在 Worker 的 Settings → Domains & Routes 中设置；这不是首次上线的必需步骤。
7. **实际验收一次。** 在电脑创建邀请，用手机报名，检查电脑名单更新；结束报名后确认手机不能继续加入，再抽奖并用手机打开结果链接。确认可用后，再决定是否把 README 的入口换成新网址，或让旧 GitHub Pages 跳转过去。本次没有替你更改这些线上入口。

以后更新网站只需推送到 `main`，无需重复创建数据库和 Token。想暂停后续发布，将 `CLOUDFLARE_DEPLOY_ENABLED` 改为 `false`；已上线网站仍会运行。若发布失败，先查看 GitHub Actions 中标红的步骤，常见原因是 ID 填错、Token 缺少 D1 编辑权限或 Token 已过期。

### 配置和维护说明

- `wrangler.json` 中的全零数据库 ID 仅用于本地开发，不是实际云数据库。发布前 `scripts/cloudflare-config.mjs` 从 GitHub Variable 生成被 Git 忽略的 `wrangler.deploy.json`，远程迁移和发布都使用这份配置。无需在仓库中写入真实 ID 或 Token。
- GitHub Actions 使用锁文件里的 Wrangler，先执行 `npm run db:migrate:remote`，再执行 `npm run deploy:cloudflare`；这两个命令会修改线上环境，仅在明确准备上线时使用。本次仅执行本地迁移、测试及部署 dry-run。
- 数据库变更应新增迁移文件，不要修改已经上线的迁移。D1 迁移与 Worker 发布不是一个整体事务；以后升级表结构要先兼容旧版本，避免只回退 Worker 时与数据库不兼容。
- 此次只迁移分享服务，没有加入账号系统、付费服务或验证码。应用沿用每种有效分享最多 10000 条、每个邀请最多 5000 人的上限；实际承载量仍受所选 Cloudflare 套餐和配额影响。

配置已按 Cloudflare 官方文档核对（2026-09-20）：[静态资源与 API 路由](https://developers.cloudflare.com/workers/static-assets/binding/)、[D1 迁移](https://developers.cloudflare.com/d1/reference/migrations/)、[D1 原子批处理](https://developers.cloudflare.com/d1/worker-api/d1-database/)、[GitHub Actions 部署和 Token](https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/)、[D1 Token 权限](https://developers.cloudflare.com/d1/tutorials/import-to-d1-with-rest-api/)。
