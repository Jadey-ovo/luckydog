import React, { useEffect, useState } from 'react';
import { Clock3, UserRound } from 'lucide-react';
import { api } from '../services/sharing';
import type { DrawResult } from '../types';
import { ProductManual } from './ProductManual';

type RoomView = {open:boolean;joinExpires:number;count:number;participant?:{name:string};result?:DrawResult};
const countdown=(milliseconds:number)=>{const seconds=Math.max(0,Math.ceil(milliseconds/1000));return `${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;};

function ResultView({result,fromActivity=false}:{result:DrawResult;fromActivity?:boolean}) {
 return <section className="shared-results"><div className="result-heading"><span className="stage-kicker">CONGRATULATIONS</span><h1>幸运名单</h1><p>{new Date(result.timestamp).toLocaleString('zh-CN')} · 共 {result.winners.length} 位幸运儿</p></div><div className={`winner-grid count-${Math.min(result.winners.length,10)} ${result.winners.length>10?'many':''} ${result.winners.length>20?'crowded':''}`}>{result.winners.map((participant,index)=><article className="winner-card" key={participant.id}><span>{String(index+1).padStart(2,'0')}</span><strong>{participant.name}</strong></article>)}</div><p className="field-hint">{fromActivity?'原活动链接已更新为抽奖结果':'由发起人分享'} · 发起页面关闭后失效</p></section>;
}

export function SharedPage({kind,id}:{kind:string;id:string}) {
 const [name,setName]=useState('');
 const [participantName,setParticipantName]=useState('');
 const [error,setError]=useState('');
 const [busy,setBusy]=useState(false);
 const [joined,setJoined]=useState(false);
 const [open,setOpen]=useState<boolean|null>(null);
 const [joinExpires,setJoinExpires]=useState(0);
 const [now,setNow]=useState(Date.now());
 const [result,setResult]=useState<DrawResult|null>(null);
 const [unavailable,setUnavailable]=useState(false);

 useEffect(()=>{
  let active=true;
  const load=async()=>{try{
   const data=await api<RoomView|DrawResult>(`${kind==='join'?'rooms':'results'}/${encodeURIComponent(id)}`);
   if(!active)return;
   setUnavailable(false);setError('');
   if(kind==='join'){
    const room=data as RoomView;
    setOpen(room.open);setJoinExpires(room.joinExpires);setResult(room.result||null);
    if(room.participant){setParticipantName(room.participant.name);setJoined(true);}
   } else setResult(data as DrawResult);
  }catch{if(active){setOpen(false);setResult(null);setUnavailable(true);setError(kind==='join'?'活动已结束，邀请链接、参与名单和开奖结果已失效':'结果已过期或不存在');}}};
  void load();const timer=kind==='join'?setInterval(load,2500):undefined;
  return()=>{active=false;if(timer)clearInterval(timer);};
 },[id,kind]);
 useEffect(()=>{if(kind!=='join'||!joinExpires)return;const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer);},[kind,joinExpires]);
 const registrationOpen=open===true&&now<joinExpires&&!result;
 const registeredName=participantName||name;

 let content:React.ReactNode;
 if(unavailable){
  content=<section className="join-card join-closed expired-activity"><span className="eyebrow">ACTIVITY CLOSED</span><h1>该活动已失效</h1><div className="closed-message"><p>{error}</p><p>发起人已清空活动或关闭发起页面，服务端不再保留本次邀请数据。</p><a href="./">返回 Luckydog</a></div></section>;
 }else if(result){
  content=<ResultView result={result} fromActivity={kind==='join'}/>;
 }else if(kind==='join'){
  const closed=open===false||now>=joinExpires;
  content=<section className={`join-card ${registrationOpen?'':'join-closed'}`}>
   <span className="eyebrow">A LITTLE MOMENT OF LUCK</span>
   <h1>{closed?'报名已截止':joined?'报名成功':'加入这场好运'}</h1>
   {registrationOpen&&<div className="guest-countdown" role="timer"><Clock3 size={17}/><span>报名截止倒计时</span><strong>{countdown(joinExpires-now)}</strong></div>}
   {closed?<div className="closed-message waiting-result">
     {joined&&<div className="registered-user"><UserRound size={18}/><span>你的报名用户名</span><strong>{registeredName}</strong></div>}
     <p>{joined?'报名信息已确认，请等待发起人公布抽奖结果。本页面会自动更新。':'本次报名已经截止，请等待发起人公布抽奖结果。'}</p>
     <p className="field-hint">发起人清空活动或关闭页面后，本链接会显示为已失效。</p>
    </div>:joined?<p>你的用户名是 {registeredName}，本页会在开奖后自动显示结果。</p>:<form onSubmit={async event=>{event.preventDefault();setBusy(true);setError('');try{await api(`rooms/${encodeURIComponent(id)}/join`,'POST',{name});setParticipantName(name.trim());setJoined(true);}catch(caught){setError((caught as Error).message);}finally{setBusy(false);}}}><p>填写用户名，给自己一份好运。</p><input aria-label="用户名" placeholder="你的用户名" required maxLength={80} value={name} onChange={event=>setName(event.target.value)} disabled={busy}/><button className="import-button" disabled={busy||!name.trim()}>{busy?'正在提交…':'确认参与'}</button></form>}
   {registrationOpen&&<ol className="join-notes"><li>请填写用于抽奖的用户名。</li><li>提交成功后等待发起人开奖。</li><li>原二维码和链接会在开奖后显示结果。</li></ol>}
   {error&&registrationOpen&&<p role="alert" className="inline-error">{error}</p>}
  </section>;
 }else{
  content=<section className="shared-results"><div className="result-heading"><span className="stage-kicker">CONGRATULATIONS</span><h1>幸运名单</h1><p>正在读取抽奖结果…</p></div>{error&&<p role="alert" className="inline-error">{error}</p>}</section>;
 }

 return <main className="shared-page"><header className="shared-topbar"><a className="shared-brand" href="./">Luckydog</a><ProductManual/></header>{content}</main>;
}
