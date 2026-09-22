import React, { useEffect, useState } from 'react';
import { Clock3, Trophy, Sparkles, CircleSlash, WifiOff, LoaderCircle } from 'lucide-react';
import { api, ApiError } from '../services/sharing';
import type { DrawResult } from '../types';

type PersonalRound = { round:number; won:boolean; timestamp:number };
type RoomView = {
 open:boolean; joinExpires:number; expires:number;
 state:'open'|'closed'|'drawn'|'interrupted'|'ended';
 participant?:{name:string}; personalResult?:PersonalRound; history?:PersonalRound[];
};
const countdown=(milliseconds:number)=>{const seconds=Math.max(0,Math.ceil(milliseconds/1000));return `${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;};
const time=(timestamp:number)=>new Date(timestamp).toLocaleString('zh-CN');

function GuestIdentity({name}:{name:string}) {
 return <div className="guest-identity"><span className="guest-avatar" aria-hidden="true">{Array.from(name.trim())[0]}</span><strong>{name}</strong></div>;
}

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
  let active=true;let terminal=false;let timer:ReturnType<typeof setTimeout>;
  const load=async()=>{
   try {
    const data=await api<RoomView|DrawResult>(`${kind==='join'?'rooms':'results'}/${encodeURIComponent(id)}`);
    if(!active)return;
    setUnavailable(false);setError('');setNow(Date.now());
    if(kind==='join'){const activity=data as RoomView;setRoom(activity);terminal=Date.now()>=activity.expires;}else setResult(data as DrawResult);
   }catch(caught){
    if(!active)return;
    const gone=caught instanceof ApiError&&caught.status===404;
    terminal=gone;setUnavailable(gone);setError(gone?'活动链接已失效。':'暂时无法读取活动，请检查网络后重试。');
    // Failed requests must not present cached results as the current activity state.
    setRoom(null);setResult(null);
   }finally{
    if(active){setLoading(false);if(kind==='join'&&!terminal)timer=setTimeout(load,2500);}
   }
  };
  void load();return()=>{active=false;clearTimeout(timer);};
 },[id,kind,retry]);
 useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer);},[]);
 const expired=Boolean(room&&now>=room.expires);
 const registrationOpen=room?.state==='open'&&room.open&&now<room.joinExpires;
 const self=room?.participant;
 let content:React.ReactNode;
 if(loading){
  content=<section className="guest-card" aria-busy="true"><div className="guest-state-icon loading"><LoaderCircle/></div><h1>正在加载活动…</h1><p className="guest-description" role="status">请稍候，正在查询活动状态</p></section>;
 }else if(unavailable||expired){
  content=<section className="guest-card"><div className="guest-state-icon muted"><CircleSlash/></div><h1>活动已失效</h1><p className="guest-description">活动查询已结束，相关记录已不可访问。</p></section>;
 }else if(error&&!room&&!result){
  content=<section className="guest-card"><div className="guest-state-icon muted"><WifiOff/></div><h1>暂时无法读取活动</h1><p className="guest-description" role="alert">{error}</p><button className="import-button" onClick={()=>{setLoading(true);setRetry(value=>value+1);}}>重试</button></section>;
 }else if(room?.state==='drawn'||(room?.state==='ended'&&Boolean(room.history?.length))){
  const latest=room.personalResult;
  const won=Boolean(latest?.won);
  const ended=room.state==='ended';
  content=<section className={`guest-card ${self&&won?'guest-winner':''}`}>
   <div className={`guest-state-icon ${self&&won?'gold':'muted'}`}>{self&&won?<Trophy/>:<Sparkles/>}</div>
   <span className={`guest-round ${ended?'ended':''}`}>{ended?'活动已结束':'活动仍在进行 · 已开奖'}</span>
   {self&&latest&&<span className="guest-round">第 {latest.round} 轮 · 最新结果</span>}
   <h1>{self?(won?'恭喜你中奖啦':'本轮未中奖'):'活动已结束'}</h1>
   {self?<><p className="guest-description">{ended?(won?'本次活动已结束，请查看你的历轮结果。':'本次活动已结束，感谢你的参与。'):'发起人可能继续抽奖，本页会自动更新后续轮次。'}</p><GuestIdentity name={self.name}/>
    {latest&&<p className="guest-caption">开奖于 {time(latest.timestamp)}</p>}
    {Boolean(room.history?.length)&&<section className="guest-history" aria-label="我的抽奖记录"><div className="guest-history-heading"><h2>我的抽奖记录</h2><span>{room.history!.length} 轮</span></div><ol>{[...room.history!].reverse().map(draw=><li key={draw.round}><div><strong>第 {draw.round} 轮</strong><time dateTime={new Date(draw.timestamp).toISOString()}>{time(draw.timestamp)}</time></div><span className={`guest-outcome ${draw.won?'won':''}`}>{draw.won?'中奖':'未中奖'}</span></li>)}</ol></section>}
   </>:<p className="guest-description">{ended?'本次活动已结束。':'活动已经开奖，发起人可能继续进行下一轮。'}</p>}
  </section>;
 }else if(room){
  const interrupted=room.state==='interrupted';
  const ended=room.state==='ended';
  const closed=!registrationOpen;
  const title=ended?'活动已结束':interrupted?'活动已中断':closed?'报名已截止':self?'报名成功':'加入这场好运';
  content=<section className="guest-card">
   {(!self||closed)&&<div className={`guest-state-icon ${ended||interrupted?'muted':''}`}>{ended||interrupted?<CircleSlash/>:<Clock3/>}</div>}
   <h1>{title}</h1>
   {ended?<p className="guest-description">本次活动已结束。</p>:interrupted?<p className="guest-description">本次活动未完成开奖，请联系发起人。</p>:closed?<p className="guest-description">{self?'请等待发起人公布抽奖结果。':'本次报名已截止，暂未开奖。'}</p>:null}
   {self&&<GuestIdentity name={self.name}/>}
   {registrationOpen&&(self?<p className="guest-caption">本页会在开奖后自动显示本人结果。</p>:<>
    <p className="guest-description">填写用户名，给自己一份好运。</p>
    <div className="guest-countdown" role="timer"><Clock3 size={16}/><span>报名截止倒计时</span><strong>{countdown(room.joinExpires-now)}</strong></div>
    <form onSubmit={async event=>{event.preventDefault();setBusy(true);setError('');try{await api(`rooms/${encodeURIComponent(id)}/join`,'POST',{name});setRoom(current=>current?{...current,participant:{name:name.trim()}}:current);}catch(caught){setError((caught as Error).message);}finally{setBusy(false);}}}><label htmlFor="guest-name">用户名</label><input id="guest-name" placeholder="你希望被叫到的名字" autoComplete="nickname" required maxLength={80} value={name} onChange={event=>setName(event.target.value)} disabled={busy}/><button className="import-button" disabled={busy||!name.trim()}>{busy?'正在提交…':'确认参与'}</button></form>
    <ol className="join-notes"><li>请填写用于抽奖的用户名。</li><li>提交成功后等待发起人开奖。</li><li>原二维码和链接会在开奖后显示本人结果。</li></ol>
   </>)}
   {error&&<p role="alert" className="inline-error">{error}</p>}
  </section>;
 }else if(result){
  content=<section className="guest-card"><h1>幸运名单</h1><div className="winner-grid">{result.winners.map(p=><article className="winner-card" key={p.id}><strong>{p.name}</strong></article>)}</div><p className="guest-caption">由发起人主动分享</p></section>;
 }
 return <main className="participant-page"><header className="guest-topbar"><span className="shared-brand">Luckydog</span><span>活动参与</span></header><div className="guest-content">{content}</div>{room&&!expired&&!unavailable&&<footer className="guest-footer">查询有效至 <time dateTime={new Date(room.expires).toISOString()}>{time(room.expires)}</time></footer>}</main>;
}
