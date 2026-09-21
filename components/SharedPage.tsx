import React, { useEffect, useState } from 'react';
import { Clock3 } from 'lucide-react';
import { api } from '../services/sharing';
import type { DrawResult } from '../types';
import { ProductManual } from './ProductManual';

type RoomView = {open:boolean;joinExpires:number;count:number;result?:DrawResult};
const countdown=(milliseconds:number)=>{const seconds=Math.max(0,Math.ceil(milliseconds/1000));return `${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;};

function ResultView({result,fromActivity=false}:{result:DrawResult;fromActivity?:boolean}) {
 return <section className="shared-results"><div className="result-heading"><span className="stage-kicker">CONGRATULATIONS</span><h1>幸运名单</h1><p>{new Date(result.timestamp).toLocaleString('zh-CN')} · 共 {result.winners.length} 位幸运儿</p></div><div className={`winner-grid count-${Math.min(result.winners.length,10)} ${result.winners.length>10?'many':''} ${result.winners.length>20?'crowded':''}`}>{result.winners.map((participant,index)=><article className="winner-card" key={participant.id}><span>{String(index+1).padStart(2,'0')}</span><strong>{participant.name}</strong></article>)}</div><p className="field-hint">{fromActivity?'原活动链接已更新为抽奖结果':'由发起人分享'} · 发起页面关闭后失效</p></section>;
}

export function SharedPage({kind,id}:{kind:string;id:string}) {
 const [name,setName]=useState('');
 const [error,setError]=useState('');
 const [busy,setBusy]=useState(false);
 const [joined,setJoined]=useState(false);
 const [open,setOpen]=useState<boolean|null>(null);
 const [joinExpires,setJoinExpires]=useState(0);
 const [now,setNow]=useState(Date.now());
 const [result,setResult]=useState<DrawResult|null>(null);

 useEffect(()=>{
  let active=true;
  const load=async()=>{try{
   const data=await api<RoomView|DrawResult>(`${kind==='join'?'rooms':'results'}/${encodeURIComponent(id)}`);
   if(!active)return;
   if(kind==='join'){const room=data as RoomView;setOpen(room.open);setJoinExpires(room.joinExpires);if(room.result)setResult(room.result);}
   else setResult(data as DrawResult);
  }catch{if(active){setOpen(false);setError(kind==='join'?'该活动已结束':'结果已过期或不存在');}}};
  void load();const timer=kind==='join'?setInterval(load,2500):undefined;
  return()=>{active=false;if(timer)clearInterval(timer);};
 },[id,kind]);
 useEffect(()=>{if(kind!=='join'||!joinExpires)return;const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer);},[kind,joinExpires]);
 const registrationOpen=open===true&&now<joinExpires&&!result;

 return <main className="shared-page"><header className="shared-topbar"><a className="shared-brand" href="./">Luckydog</a><ProductManual/></header>{result?<ResultView result={result} fromActivity={kind==='join'}/>:kind==='join'?<section className={`join-card ${registrationOpen?'':'join-closed'}`}><span className="eyebrow">A LITTLE MOMENT OF LUCK</span><h1>{joined?'报名成功':registrationOpen?'加入这场好运':'该活动已结束'}</h1>{registrationOpen&&<div className="guest-countdown" role="timer"><Clock3 size={17}/><span>报名截止倒计时</span><strong>{countdown(joinExpires-now)}</strong></div>}{joined?<p>你的用户名是 {name}，本页会在开奖后自动显示结果。</p>:registrationOpen?<form onSubmit={async event=>{event.preventDefault();setBusy(true);setError('');try{await api(`rooms/${encodeURIComponent(id)}/join`,'POST',{name});setJoined(true);}catch(caught){setError((caught as Error).message);}finally{setBusy(false);}}}><p>填写用户名，给自己一份好运。</p><input aria-label="用户名" placeholder="你的用户名" required maxLength={80} value={name} onChange={event=>setName(event.target.value)} disabled={busy}/><button className="import-button" disabled={busy||!name.trim()}>{busy?'正在提交…':'确认参与'}</button></form>:<div className="closed-message"><p>报名已经截止，请保持此页面打开，开奖后会自动显示结果。</p><a href="./">返回 Luckydog</a></div>}{registrationOpen&&<ol className="join-notes"><li>请填写用于抽奖的用户名。</li><li>提交成功后等待发起人开奖。</li><li>原二维码和链接会在开奖后显示结果。</li></ol>}{error&&registrationOpen&&<p role="alert" className="inline-error">{error}</p>}</section>:<section className="shared-results"><div className="result-heading"><span className="stage-kicker">CONGRATULATIONS</span><h1>幸运名单</h1><p>正在读取抽奖结果…</p></div>{error&&<p role="alert" className="inline-error">{error}</p>}</section>}</main>;
}
