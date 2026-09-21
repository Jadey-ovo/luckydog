import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronLeft, Clock3, X } from 'lucide-react';
import type { Participant } from '../types';
import { api, shareUrl } from '../services/sharing';
import { ShareLink } from './ShareLink';
import { Toast } from './Toast';
import { importParticipants } from '../services/participants';

export type ActiveRoom = {id:string;owner:string;joinExpires:number;expires?:number;state?:'open'|'closed'|'drawn'|'interrupted'|'ended';open?:boolean};
type Room = ActiveRoom;
type Step = 'add'|'roster'|'config';
const countdown = (milliseconds:number) => {
  const seconds=Math.max(0,Math.ceil(milliseconds/1000));
  return `${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;
};

export function ParticipantSetup({participants,setParticipants,locked,onReady,onReset,onRoomChange,onRestart,resetting=false,isDesktop=false,children}: {participants:Participant[];setParticipants:React.Dispatch<React.SetStateAction<Participant[]>>;locked:boolean;onReady:(ready:boolean)=>void;onReset:()=>void;onRoomChange?:(room:ActiveRoom|null)=>void;onRestart:()=>void;resetting?:boolean;isDesktop?:boolean;children:React.ReactNode}) {
 const [step,setStep]=useState<Step>(participants.length?'roster':'add');
 const [room,setRoom]=useState<Room|null>(null);
 const [busy,setBusy]=useState(false);
 const [duration,setDuration]=useState(5);
 const [now,setNow]=useState(Date.now());
 const [success,setSuccess]=useState('');
 const [error,setError]=useState('');
 const [cutoffConfirm,setCutoffConfirm]=useState(false);
 const [removeCandidate,setRemoveCandidate]=useState<Participant|null>(null);
 const [manualText,setManualText]=useState('');
 const polling=useRef(true);
 const lastPollError=useRef('');
 const unavailable=room?.state==='interrupted'||room?.state==='ended'||Boolean(room?.expires&&now>=room.expires);
 const registrationOpen=Boolean(!unavailable&&room?.open!==false&&room&&now<room.joinExpires);
 const canResume=Boolean(!unavailable&&room?.state!=='drawn'&&room&&room.open===false&&now<room.joinExpires);

 useEffect(()=>{if(!room)return;const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer);},[room]);
 useEffect(()=>{onRoomChange?.(room);},[room?.id,room?.owner,room?.joinExpires,room?.open,room?.state,room?.expires,onRoomChange]);
 useEffect(()=>onReady(step==='config'&&!unavailable),[step,onReady,unavailable]);
 useEffect(()=>{
  if(!room)return;
  let active=true;
  const poll=async()=>{try{
   const value=await api<{participants:Participant[];open:boolean;joinExpires:number;expires:number;state:ActiveRoom['state']}>(`rooms/${room.id}`,'GET',undefined,room.owner);
   if(active&&polling.current){if(step==='add')setParticipants(value.participants);setRoom(current=>current?{...current,open:value.open,joinExpires:value.joinExpires,expires:value.expires,state:value.state}:current);lastPollError.current='';}
  }catch(e){const message=(e as Error).message;if(active&&message!==lastPollError.current){setError(message);lastPollError.current=message;}}};
  void poll();const timer=setInterval(poll,2500);
  return()=>{active=false;clearInterval(timer);};
 },[room?.id,step,setParticipants]);
 useEffect(()=>{const key=(e:KeyboardEvent)=>{if(e.key==='Escape'&&!busy){setCutoffConfirm(false);setRemoveCandidate(null);}};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);},[busy]);

 async function run(fn:()=>Promise<void>){setBusy(true);setError('');try{await fn();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 async function removeParticipant(){await run(async()=>{
  if(!removeCandidate)return;
  if(room){const data=await api<{participants:Participant[]}>(`rooms/${room.id}`,'PATCH',{removeParticipantId:removeCandidate.id},room.owner);setParticipants(data.participants);}
  else setParticipants(previous=>previous.filter(item=>item.id!==removeCandidate.id));
  setSuccess(`已从本次抽奖名单中移除 ${removeCandidate.name}`);setRemoveCandidate(null);onReset();
 });}
 async function finishInvite(){await run(async()=>{
  if(!room)return;
  const data=await api<{participants:Participant[]}>(`rooms/${room.id}`,'PATCH',{open:false},room.owner);
  setRoom(current=>current?{...current,open:false,state:'closed'}:current);setParticipants(data.participants);setStep('roster');setCutoffConfirm(false);setSuccess('报名已截止，请确认参与名单');onReset();
 });}
 async function resumeInvite(){await run(async()=>{
  if(!room)return;
  const data=await api<{participants:Participant[];open:boolean}>(`rooms/${room.id}`,'PATCH',{open:true},room.owner);
  if(!data.open)throw new Error('邀请已到截止时间，无法继续报名');
  setParticipants(data.participants);setRoom(current=>current?{...current,open:true,state:'open'}:current);setStep('add');setNow(Date.now());setSuccess('报名已重新开放，原二维码和链接继续有效');onReset();
 });}
 const toastMessage=error||success||(registrationOpen&&room?`报名截止倒计时 ${countdown(room.joinExpires-now)}`:'');
 const toastStatus=error?'error':success?'success':'info';

 return <section className="participant-flow">
  <p hidden={!unavailable} role={unavailable?'alert':undefined}>活动已结束、中断或过期，可返回重新发起。</p>
  <div className="flow-steps" aria-label="配置进度" style={{'--progress':`${['add','roster','config'].indexOf(step)*50}%`} as React.CSSProperties}>
   {(['发起报名','确认名单','设置名额']).map((label,index)=>{const current=['add','roster','config'].indexOf(step);return <div key={label} className={`flow-step ${index===current?'active':''} ${index<current?'complete':''}`} aria-current={index===current?'step':undefined}><span className="step-number">{index<current?<Check size={13}/>:String(index+1).padStart(2,'0')}</span><span>{label}</span></div>;})}
  </div>
  {step==='config'? <>
   <div className="roster-heading"><strong>已确认 {participants.length} 位参与者</strong><button className="back-button" disabled={locked} onClick={()=>{setStep('roster');onReset();}}><ChevronLeft size={15} aria-hidden="true"/>返回</button></div>
   {children}
  </>:step==='add'? <>
   {isDesktop&&<div className="invite-mode-label"><span>名单输入</span><small>每行填写一个用户名</small></div>}
   <div className="method-content invite-only-content">
    {isDesktop?<div className="names-block"><textarea aria-label="参与名单" placeholder={'张三\n李四'} value={manualText} onChange={event=>setManualText(event.target.value)}/></div>:<div className="invite-box">{room?<>
      <div className={`registration-status ${registrationOpen?'is-open':'is-closed'}`}><Clock3 size={15}/><span>{unavailable?'活动已中断或过期':registrationOpen?'报名进行中':'报名已截止'}</span><b>{registrationOpen?countdown(room.joinExpires-now):new Date(room.joinExpires).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'})}</b></div>
      <ShareLink url={shareUrl('join',room.id)} validity={`${new Date(room.joinExpires).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'})} 报名截止 · 创建后 24 小时内可查询`} onCopied={()=>setSuccess('邀请链接复制成功')} onError={setError}/>
      <div className="live-roster-heading"><strong>参与名单</strong><span>已报名 {participants.length} 人</span></div>
      <div className="live-roster" aria-label="实时参与名单">{participants.length?participants.map((participant,index)=><div key={participant.id}><span>{String(index+1).padStart(2,'0')}</span><strong>{participant.name}</strong></div>):<p>等待第一位参与者报名</p>}</div>
     </>:<><strong>邀请朋友参与抽奖</strong><ol><li>选择报名时长，生成二维码与链接。</li><li>参与者提交用户名后，名单会实时出现。</li><li>到期自动截止，也可以随时提前截止。</li></ol><fieldset className="invite-duration"><legend>报名时长</legend><div>{[5,10,30].map(minutes=><button type="button" key={minutes} aria-pressed={duration===minutes} onClick={()=>setDuration(minutes)}>{minutes} 分钟</button>)}</div></fieldset></>}
    </div>}
   </div>
   <div className="flow-footer">{isDesktop?<button className="import-button" disabled={!manualText.trim()} onClick={()=>{const names=importParticipants(manualText,[]);setParticipants(names);setManualText('');setStep('roster');onReset();}}>确认名单</button>:room?
    <button className="import-button" disabled={busy||unavailable} onClick={()=>registrationOpen?setCutoffConfirm(true):void finishInvite()}>{registrationOpen?'截止报名':'查看报名名单'}</button>:
    <button className="import-button" disabled={busy} onClick={()=>void run(async()=>{const value=await api<Room>('rooms','POST',{durationMinutes:duration});polling.current=true;setParticipants([]);setNow(Date.now());setRoom({...value,open:true});})}>{busy?'正在创建…':'创建抽奖邀请'}</button>}
   </div>
  </>:<>
   <div className="roster-heading"><strong>当前参与名单 <b>{participants.length}</b></strong>{canResume&&<div className="roster-heading-actions"><button disabled={locked||busy} className="back-button resume-button" onClick={()=>void resumeInvite()}><ChevronLeft size={15} aria-hidden="true"/>继续报名</button></div>}</div>
   <div className="roster-table"><table><thead><tr><th>序号</th><th>用户名</th><th className="remove-column"><span className="sr-only">操作</span></th></tr></thead><tbody>{participants.map((p,index)=><tr key={p.id}><td>{String(index+1).padStart(2,'0')}</td><td>{p.name}</td><td className="remove-column"><button aria-label={`移除 ${p.name}`} disabled={locked||busy} onClick={()=>setRemoveCandidate(p)}><X size={14}/></button></td></tr>)}</tbody></table>{!participants.length&&<p className="empty-roster">本次报名暂无参与者</p>}</div>
   <div className="flow-footer"><button className="import-button" disabled={locked||busy||!participants.length} onClick={()=>setStep('config')}>确认名单</button></div>
  </>}
  {room&&!registrationOpen&&(unavailable||!participants.length)&&<button className="back-button restart-invite" disabled={busy||resetting} onClick={onRestart}><ChevronLeft size={15} aria-hidden="true"/>返回重新发起</button>}
  <Toast message={toastMessage} status={toastStatus} persistent={!error&&!success&&registrationOpen} dismissible={Boolean(error)} onClose={()=>{setError('');setSuccess('');}}/>
  {cutoffConfirm&&<div className="modal-backdrop"><div className="dialog" role="dialog" aria-modal="true" aria-labelledby="cutoff-title"><button className="dialog-close" aria-label="关闭弹窗" disabled={busy} onClick={()=>setCutoffConfirm(false)}><X size={18}/></button><h2 id="cutoff-title">提前截止报名</h2><p>距离自动截止还有 {room?countdown(room.joinExpires-now):'00:00'}。确认后二维码和链接会立即停止报名。</p><div className="dialog-actions"><button disabled={busy} onClick={()=>setCutoffConfirm(false)}>继续报名</button><button autoFocus className="primary" disabled={busy} onClick={()=>void finishInvite()}>确认截止</button></div></div></div>}
  {removeCandidate&&<div className="modal-backdrop"><div className="dialog" role="dialog" aria-modal="true" aria-labelledby="remove-participant-title"><button className="dialog-close" aria-label="关闭弹窗" disabled={busy} onClick={()=>setRemoveCandidate(null)}><X size={18}/></button><h2 id="remove-participant-title">移除参与者</h2><p>确认将“{removeCandidate.name}”从本次抽奖名单中移除吗？移除后该用户不会参与本轮及后续基于当前名单的抽奖。</p><div className="dialog-actions"><button disabled={busy} onClick={()=>setRemoveCandidate(null)}>取消</button><button autoFocus className="danger" disabled={busy} onClick={()=>void removeParticipant()}>{busy?'正在移除…':'确认移除'}</button></div></div></div>}
 </section>;
}
