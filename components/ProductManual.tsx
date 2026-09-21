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
        <li><strong>截止并确认</strong><span>到期会自动停止报名，也可以提前截止；原截止时间之前可以恢复报名。</span></li>
        <li><strong>开始抽奖</strong><span>同一轮不会重复中奖。开奖后，原二维码和链接会自动显示结果。</span></li>
      </ol>
      <div className="manual-notes"><strong>使用限制</strong><p>邀请和结果只在发起页面打开时有效。刷新、关闭页面或网络中断后，链接会立即或在约 90 秒内失效。请保持发起页面打开直到活动结束。</p><p>用户名会在报名期间临时提交到分享服务；截止后的名单只供本次抽奖使用，不提供历史记录。</p></div>
    </div></div>,document.body)}
  </>;
}
