import React, { useState } from 'react';
import { BookOpen, X } from 'lucide-react';
import { createPortal } from 'react-dom';

export function ProductManual() {
  const [open,setOpen]=useState(false);
  return <>
    <button className="icon-link manual-button" aria-label="查看产品手册" onClick={()=>setOpen(true)}><BookOpen size={19}/></button>
    {open&&createPortal(<div className="modal-backdrop"><div className="dialog manual-dialog" role="dialog" aria-modal="true" aria-labelledby="manual-title">
      <button className="dialog-close" aria-label="关闭产品手册" onClick={()=>setOpen(false)}><X size={18}/></button>
      <span className="eyebrow">LUCKYDOG GUIDE</span><h2 id="manual-title">产品手册</h2>
      <ol>
        <li><strong>发起报名</strong><span>选择 5、10 或 30 分钟，创建二维码和邀请链接。名单会在发起页面实时更新。</span></li>
        <li><strong>截止并确认</strong><span>到期会自动停止报名，也可以提前截止；原截止时间之前可以继续报名。移除名单中的用户需要二次确认。</span></li>
        <li><strong>开始抽奖</strong><span>同一轮不会重复中奖。继续抽奖会保留当前名单并可能重复上一轮中奖者，原链接只显示当前浏览器对应的本人最新结果和每轮记录；未参与者只看到活动已结束。</span></li>
      </ol>
      <div className="manual-notes"><strong>查询与清空</strong><p>邀请链接从活动创建起 24 小时内可查询状态与本人结果，报名仍按所选时长截止。每次开奖只新增一轮结果，发起人仍可继续抽奖。</p><p>点击“清空返回”并确认后活动立即结束；关闭或刷新发起页会停止在线续期，约 90 秒后结束。结束不会删除已同步结果，原链接仍保留本人每轮记录至查询期限。刷新后无法恢复发起人的管理权限。</p><p>未开奖时请保持发起页面在线；连接中断后活动会中断，不再接受报名或开奖。新活动使用新链接与二维码。请用报名时的浏览器查询，清除 Cookie 或更换设备无法识别本人。创建满 24 小时后链接失效，数据由服务自动清理。</p></div>
    </div></div>,document.body)}
  </>;
}
