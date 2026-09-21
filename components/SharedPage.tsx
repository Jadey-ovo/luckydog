import React, { useEffect, useState } from 'react';
import { Clock3, UserRound } from 'lucide-react';
import { api, ApiError } from '../services/sharing';
import type { DrawResult } from '../types';
import { ProductManual } from './ProductManual';

type RoomView = { open:boolean; joinExpires:number; expires:number; state:'open'|'closed'|'drawn'|'interrupted'; participant?:{name:string}; personalResult?:{won:boolean;timestamp:number} };
const countdown=(milliseconds:number)=>{const seconds=Math.max(0,Math.ceil(milliseconds/1000));return `${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;};

export function SharedPage({kind,id}:{kind:string;id:string}) {
 const [name,setName]=useState('');
 const [room,setRoom]=useState<RoomView|null>(null);
 const [result,setResult]=useState<DrawResult|null>(null);
 const [error,setError]=useState('');
 const [busy,setBusy]=useState(false);
 const [loading,setLoading]=useState(true);
 const [unavailable,setUnavailable]=useState(false);
 const [now,setNow]=useState(Date.now());
 const [retry,setRetry]=useState(0);
 useEffect(()=>{
  let active=true;let timer:ReturnType<typeof setTimeout>;
  const load=async()=>{
   try {
    const data=await api<RoomView|DrawResult>(`${kind==='join'?'rooms':'results'}/${encodeURIComponent(id)}`);
    if(!active)return;
    setUnavailable(false);setError('');setNow(Date.now());
    if(kind==='join')setRoom(data as RoomView);else setResult(data as DrawResult);
   }catch(caught){
    if(!active)return;
    const gone=caught instanceof ApiError&&caught.status===404;
    setUnavailable(gone);setError(gone?'链接已过期或已被发起人清空。':'暂时无法读取活动，请检查网络后重试。');
    // Do not present cached results as current after a failed request.
    setRoom(null);setResult(null);
   }finally{
    if(active){setLoading(false);if(kind==='join')timer=setTimeout(load,2500);}
   }
  };
  void load();return()=>{active=false;clearTimeout(timer);};
 },[id,kind,retry]);
 useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer);},[]);
 const expired=room&&now>=room.expires;
 const registrationOpen=room?.open&&now<room.joinExpires;
 const self=room?.participant;
 const validity=room?<p className="field-hint">查询有效至 {new Date(room.expires).toLocaleString('zh-CN')}。请使用报名时的浏览器查询本人结果；清空 Cookie 或更换设备无法识别本人。</p>:null;
 let content:React.ReactNode;
 if(loading){
  content=<section className="join-card" aria-busy="true"><h1>正在加载活动…</h1><p role="status">请稍候，正在查询活动状态</p></section>;
 }else if(unavailable||expired){
  content=<section className="join-card join-closed expired-activity"><h1>该活动已失效</h1><p>活动创建已满 24 小时，或已被发起人清空。</p><a href="./">返回 Luckydog</a></section>;
 }else if(error&&!room&&!result){
  content=<section className="join-card"><h1>暂时无法读取活动</h1><p role="alert">{error}</p><button className="import-button" onClick={()=>{setLoading(true);setRetry(value=>value+1);}}>重试</button></section>;
 }else if(room?.state==='drawn'){
  content=<section className="join-card join-closed"><span className="eyebrow">LUCKYDOG RESULT</span><h1>{self?(room.personalResult?.won?'恭喜你中奖啦':'本次未中奖'):'活动已结束'}</h1>{self&&<><div className="registered-user"><UserRound size={18}/><span>你的报名用户名</span><strong>{self.name}</strong></div><p>{room.personalResult?.won?'好运属于你，祝你拥有愉快的一天！':'谢谢你的参与，愿下一份好运属于你。'}</p><p className="field-hint">最新开奖时间 {new Date(room.personalResult!.timestamp).toLocaleString('zh-CN')} · 继续抽奖后会更新为最新结果</p></>}{validity}</section>;
 }else if(room){
  const interrupted=room.state==='interrupted';
  const closed=!registrationOpen;
  content=<section className={`join-card ${closed?'join-closed':''}`}>
   <span className="eyebrow">A LITTLE MOMENT OF LUCK</span>
   <h1>{interrupted?'活动已中断':closed?'报名已截止':self?'报名成功':'加入这场好运'}</h1>
   {registrationOpen&&<div className="guest-countdown" role="timer"><Clock3 size={17}/><span>报名截止倒计时</span><strong>{countdown(room.joinExpires-now)}</strong></div>}
   {closed?<div className="closed-message waiting-result">{self&&<div className="registered-user"><UserRound size={18}/><span>你的报名用户名</span><strong>{self.name}</strong></div>}<p>{interrupted?'发起人连接已中断，本次活动未完成开奖，请联系发起人。':'报名已截止，请等待发起人公布抽奖结果。本页面会自动更新。'}</p></div>:self?<p>你的用户名是 {self.name}，本页会在开奖后自动显示本人结果。</p>:<form onSubmit={async event=>{event.preventDefault();setBusy(true);setError('');try{await api(`rooms/${encodeURIComponent(id)}/join`,'POST',{name});setRoom(current=>current?{...current,participant:{name:name.trim()}}:current);}catch(caught){setError((caught as Error).message);}finally{setBusy(false);}}}><p>填写用户名，给自己一份好运。</p><input aria-label="用户名" placeholder="你的用户名" required maxLength={80} value={name} onChange={event=>setName(event.target.value)} disabled={busy}/><button className="import-button" disabled={busy||!name.trim()}>{busy?'正在提交…':'确认参与'}</button></form>}
   {registrationOpen&&<ol className="join-notes"><li>请填写用于抽奖的用户名。</li><li>提交成功后等待发起人开奖。</li><li>原二维码和链接会在开奖后显示本人结果。</li></ol>}
   {error&&<p role="alert" className="inline-error">{error}</p>}{validity}
  </section>;
 }else if(result){
  content=<section className="shared-results"><div className="result-heading"><h1>幸运名单</h1></div><div className="winner-grid">{result.winners.map(p=><article className="winner-card" key={p.id}><strong>{p.name}</strong></article>)}</div><p>由发起人主动分享 · 发起页面关闭后失效</p></section>;
 }
 return <main className="shared-page"><header className="shared-topbar"><a className="shared-brand" href="./">Luckydog</a><ProductManual/></header>{content}</main>;
}
