# Luckydog 访问统计中文对照

统计中出现 `/api/...` 时，代表页面在读取或更新活动状态，不是用户额外打开了一个网页。发起页和参与页会定时读取活动状态，因此一次正常活动可能产生数百次后台请求；这些请求量不能直接当作页面浏览人数。

| 地址或请求 | 中文说明 |
| --- | --- |
| `/` | 抽奖首页 |
| `#join=...` | 扫码报名与本人结果页 |
| `#result=...` | 兼容旧版的中奖结果分享页 |
| `/privacy.html` | 隐私说明页 |
| `POST /api/rooms` | 创建扫码报名活动 |
| `GET /api/rooms/活动编号` | 读取活动状态；发起人访问时同时读取报名名单 |
| `POST /api/rooms/活动编号/join` | 扫码报名并提交用户名 |
| `PATCH /api/rooms/活动编号` | 截止或恢复报名、移除参与者、同步开奖结果、结束活动 |
| `DELETE /api/rooms/活动编号` | 兼容旧客户端的结束活动请求 |
| `POST /api/results` | 生成兼容旧版的中奖结果分享链接 |
| `GET /api/results/结果编号` | 查看兼容旧版的中奖结果 |
| `PATCH /api/results/结果编号` | 保持旧版结果分享有效 |
| `DELETE /api/results/结果编号` | 结束旧版结果分享 |

API 响应带有 `X-Luckydog-Request-Description` 中文说明。为避免 HTTP 响应头在不同平台出现乱码，该字段使用 UTF-8 百分号编码，并通过 `X-Luckydog-Request-Description-Encoding: percent-encoded-utf-8` 标明编码；日志工具解码后即可显示上表中的中文。Sites 的“页面浏览量”可能同时包含页面资源和后台请求；“独立访客”由托管平台根据其统计口径计算，Luckydog 不写入或修正平台统计数据。
