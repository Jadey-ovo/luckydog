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
        <li><strong>开始抽奖</strong><span>同一轮不会重复中奖。继续抽奖会保留当前名单并可能重复上一轮中奖者，原链接始终显示最近结果。</span></li>
      </ol>
      <div className="manual-notes"><strong>使用限制</strong><p>邀请和结果只在发起页面打开时有效。点击“清空返回”会立即删除参与名单和结果并让原链接失效；刷新、关闭页面或网络中断后，链接会立即或在约 90 秒内失效。</p><p>用户名与主动分享的结果会临时提交到分享服务，只供本次活动使用，不提供历史记录。报名截止只停止新增参与者，参与页会保留自己的报名信息并等待开奖结果。</p></div>
    </div></div>,document.body)}
  </>;
}
