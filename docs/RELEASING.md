# 发布说明

## 项目入口

- 源代码 `https://github.com/Jadey-ovo/luckydog`
- 网页试用 `https://luckydog-draw.jadey-owo.chatgpt.site/`
- 最新发布 `https://github.com/Jadey-ovo/luckydog/releases/latest`

安装包上传到 GitHub Releases，不提交到 Git 仓库。`release/` 只用于本机构建输出。

## Sites 发布

Sites 使用 `.openai/hosting.json` 中的项目 ID 和 D1 绑定。发布前运行完整测试、生成 Sites 构建产物并应用新增数据库迁移，再由 Sites 工作流保存版本和部署。仓库不再自动部署 Cloudflare 或 GitHub Pages，网页生产入口统一使用 Sites。

## 下一次桌面发布

1. 修改 `package.json` 版本，并执行 `npm install --package-lock-only --ignore-scripts` 同步锁文件。
2. 更新 README 的安装包版本和链接，提交改动。
3. 创建对应的版本标签，例如 `v1.3.0`，并推送。
4. 等待 Desktop installers 工作流，在 Windows 与 macOS 原生环境构建。
5. 打开草稿 Release，核对所有附件、校验值和更新说明，实机测试后发布。

```sh
git tag v1.3.0
git push origin v1.3.0
```

手动运行工作流只生成构建附件，不创建 Release。标签触发时会检查标签与包版本一致，全部构建成功后才创建草稿。

## 签名

本项目没有提供开发者证书，当前构建未做 Windows 开发者签名或 Apple 公证。公开发布无提示安装版本时，需要配置对应证书和账号，将凭据放在 GitHub Actions Secrets，按照 electron-builder 官方文档接入。不要把证书、密码或令牌写入仓库。

## 校验下载

每个正式 Release 附带 `SHA256SUMS.txt`。可以使用系统工具计算文件 SHA-256，与文本中的记录比对。

- macOS 使用 `shasum -a 256 文件名`
- Windows PowerShell 使用 `Get-FileHash 文件名 -Algorithm SHA256`

校验值用于检查文件完整性，不能替代开发者签名。
