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

1. 粘贴参与名单，每行一个姓名。
2. 设置这一轮的中奖人数。
3. 点击「开始抽奖」，约三秒后揭晓结果。

也支持中英文逗号、分号和空白分隔。重名会追加序号，例如「小王」和「小王 1」。同一轮不会重复中奖，新一轮会重新从完整名单抽取。抽奖开始后，名单和名额会暂时锁定。

## 想先试试，还是装进电脑？

**[打开网页试用](https://jadey-ovo.github.io/luckydog/)**，无需注册，无需安装。

桌面版自带运行环境，装好后可以完全离线使用。

| 你的电脑 | v1.1.0 安装包 | 打开方式 |
| --- | --- | --- |
| Windows 10 / 11，64 位 x64 | [下载 EXE](https://github.com/Jadey-ovo/luckydog/releases/download/v1.1.0/Luckydog-1.1.0-win-x64.exe) | 双击，按安装向导操作 |
| Mac，Apple 芯片 M 系列 | [下载 DMG](https://github.com/Jadey-ovo/luckydog/releases/download/v1.1.0/Luckydog-1.1.0-mac-arm64.dmg) | 打开后拖入「应用程序」 |
| Mac，Intel 芯片 | [下载 DMG](https://github.com/Jadey-ovo/luckydog/releases/download/v1.1.0/Luckydog-1.1.0-mac-x64.dmg) | 打开后拖入「应用程序」 |

[全部版本与更新说明](https://github.com/Jadey-ovo/luckydog/releases) · [下载文件校验值](https://github.com/Jadey-ovo/luckydog/releases/download/v1.1.0/SHA256SUMS.txt)

目前的安装包未做开发者签名及 Apple 公证，系统可能提示未知开发者或阻止打开。受管理的公司电脑可能限制运行，可以先用网页版。Mac 两种架构已在 Apple 芯片机器上启动验证，其中 Intel 版通过兼容运行验证；Windows 安装包已构建，尚未在 Windows 实机验证。

## 名单的事，留在你这边

Luckydog 的抽奖功能全部由前端完成，没有数据库、业务服务器或登录账号，也没有广告、埋点和统计 SDK。

| 内容 | 网页版 | 桌面版 |
| --- | --- | --- |
| 默认名单存放位置 | 当前页面内存，刷新即清空 | 当前电脑的应用数据中 |
| 希望下次接着用 | 主动勾选「在此浏览器记住名单」 | 自动保存 |
| 中奖记录 | 当前页面内存，不保存历史 | 当前窗口内存，不保存历史 |
| 姓名及结果上传 | 不上传 | 不上传 |
| 网络需求 | 首次加载静态页面，之后可断网抽奖 | 安装后可完全离线使用 |

网页版选择记住名单后，使用浏览器的 `localStorage`，没有加密。共用电脑上请用完清空，或者取消勾选，删除本地保存的名单。应用不会把名字写进网址，也不会发送姓名或结果给 GitHub。

网页托管在 GitHub Pages，访问时 GitHub 会为安全目的记录 IP 地址，详见 [GitHub 官方说明](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)。这是加载网站产生的访问记录，名单不包含在请求中。浏览器扩展或设备上的其他软件不受本应用控制。

## 随机这件事，认真一点

抽奖使用 `crypto.getRandomValues` 生成随机数，再通过拒绝采样和 Fisher-Yates 洗牌选择中奖者，避免直接取模产生的偏差。屏幕上滚动的名字只负责气氛，中奖名单由安全随机数确定。

这是本地活动工具，没有第三方审计或防篡改证明。需要可审计的正式抽奖时，请另外制定并记录完整活动规则。

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
| `npm run test:web` | 构建后验证网页隐私和离线抽奖 |
| `npm run test:desktop` | 启动隔离数据目录，验证桌面流程 |
| `npm run desktop` | 启动桌面应用 |
| `npm run dist:win` | 生成 Windows 安装包 |
| `npm run dist:mac` | 生成两种 Mac 架构的 DMG 和 ZIP |

首次运行网页测试前，执行 `npx playwright install chromium`。安装包在 `release/`，网页静态文件在 `dist/`。详细结构见 [开发说明](docs/DEVELOPMENT.md)。

推送 `main` 会自动测试并部署 GitHub Pages。推送版本标签会在 Windows 和 macOS 上构建安装包，成功后创建带附件的草稿 Release，检查后再发布。流程见 [发布说明](docs/RELEASING.md)。

发现问题可以 [提一个 Issue](https://github.com/Jadey-ovo/luckydog/issues)。描述操作步骤就好，请用「小王、小李」这样的演示名单，别把真实人员名单贴进去。
