import React, { useEffect, useRef, useState } from 'react';
import { X, ChevronLeft, Check } from 'lucide-react';
import type { Participant } from '../types';
import { importParticipants, mergeParticipantNames } from '../services/participants';
import { api, shareUrl } from '../services/sharing';
import { ShareLink } from './ShareLink';
import { Toast } from './Toast';
type Room = {id:string;owner:string;joinExpires:number};
type Mode = 'input'|'file'|'invite';
const modes = [['input','名单输入'],['file','名单导入'],['invite','分享邀请']] as const;
export function ParticipantSetup({participants,setParticipants,locked,onReady,onReset,children}: {participants:Participant[];setParticipants:React.Dispatch<React.SetStateAction<Participant[]>>;locked:boolean;onReady:(ready:boolean)=>void;onReset:()=>void;children:React.ReactNode}) {
 const [step,setStep]=useState<'add'|'roster'|'config'>(participants.length?'roster':'add');
 const [mode,setMode]=useState<Mode>('input');
 const [text,setText]=useState('');
 const [fileNames,setFileNames]=useState<Participant[]>([]);
 const [filename,setFilename]=useState('');
 const [room,setRoom]=useState<Room|null>(null);
 const [busy,setBusy]=useState(false);
 const [duration,setDuration]=useState(5);
 const [now,setNow]=useState(Date.now());
 const [deleted,setDeleted]=useState(0);
 const [success,setSuccess]=useState('');
 const [error,setError]=useState('');
 const [back,setBack]=useState(false);
 const [switchTo,setSwitchTo]=useState<Mode|null>(null);
 const polling=useRef(true);
 const lastPollError=useRef('');
 useEffect(()=>{if(!room)return;const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer);},[room]);
 useEffect(()=>onReady(step==='config'),[step,onReady]);
 useEffect(()=>{
  if(!room || step!=='add')return;
  let active=true;
  const poll=async()=>{try{
   const value=await api<{participants:Participant[]}>(`rooms/${room.id}`,'GET',undefined,room.owner);
   if(active&&polling.current){setParticipants(value.participants);lastPollError.current='';}
  }catch(e){const message=(e as Error).message;if(active&&message!==lastPollError.current){setError(message);lastPollError.current=message;}}};
  void poll();const timer=setInterval(poll,2500);
  return()=>{active=false;clearInterval(timer);};
 },[room,step,setParticipants]);
 useEffect(()=>{const key=(e:KeyboardEvent)=>{if(e.key==='Escape'&&!busy){setBack(false);setSwitchTo(null);}};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);},[busy]);
 async function run(fn:()=>Promise<void>){setBusy(true);setError('');try{await fn();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 function confirmNames(){
  const additions=mode==='input'?importParticipants(text,participants):mergeParticipantNames(fileNames.map(p=>p.name),participants);
  if(!additions.length)return;
  setParticipants(additions);setText('');setFileNames([]);setFilename('');setStep('roster');onReset();
 }
 async function discardRoom(){if(room)await api(`rooms/${room.id}`,'DELETE',{},room.owner);setRoom(null);}
 async function leave(keep:boolean){await run(async()=>{
  polling.current=false;
  try{await discardRoom();}catch(e){polling.current=true;throw e;}
  if(!keep)setParticipants([]);
  setText('');setFileNames([]);setFilename('');setStep('add');setBack(false);onReset();
 });}
 async function changeMode(next:Mode){await run(async()=>{
  polling.current=false;
  try{await discardRoom();}catch(e){polling.current=true;throw e;}
  setText('');setFileNames([]);setFilename('');setParticipants([]);setMode(next);setSwitchTo(null);onReset();
 });}
 function selectMode(next:Mode){
  if(next===mode)return;
  if(text.trim()||fileNames.length||participants.length||room)setSwitchTo(next);
  else void changeMode(next);
 }
 async function loadFile(file:File){await run(async()=>{
  if(file.size>5*1024*1024)throw new Error('请选择不超过 5 MB 的文件');
  const {default:ExcelJS}=await import('exceljs');
  const wb=new ExcelJS.Workbook();await wb.xlsx.load(await file.arrayBuffer());const sheet=wb.worksheets[0];
  if(!sheet||sheet.getCell('A1').text.trim()!=='用户名')throw new Error('请使用模板，第一列标题应为“用户名”');
  const names:Participant[]=[];
  sheet.eachRow((row,index)=>{
   if(index===1)return;
   const cell=row.getCell(1);
   if(cell.type===ExcelJS.ValueType.Formula)throw new Error('用户名请填写文本，不支持公式');
   const name=cell.text.trim();
   if(name){if(name.length>80)throw new Error(`第 ${index} 行用户名超过 80 个字符`);names.push({id:crypto.randomUUID(),name});}
  });
  if(!names.length||names.length>5000)throw new Error('请填写 1–5000 个用户名');
  setFileNames(names);setFilename(file.name);
 });}
 async function finishInvite(){await run(async()=>{
  if(!room)return;
  polling.current=false;
  try{const data=await api<{participants:Participant[]}>(`rooms/${room.id}`,'PATCH',{open:false},room.owner);setParticipants(data.participants);setStep('roster');onReset();}catch(e){polling.current=true;throw e;}
 });}
 return <section className="participant-flow">
  <div className="flow-steps" aria-label="配置进度" style={{'--progress':`${['add','roster','config'].indexOf(step)*50}%`} as React.CSSProperties}>
   {(['添加名单','确认名单','设置名额']).map((label,index)=>{const current=['add','roster','config'].indexOf(step);return <div key={label} className={`flow-step ${index===current?'active':''} ${index<current?'complete':''}`} aria-current={index===current?'step':undefined}><span className="step-number">{index<current?<Check size={13}/>:String(index+1).padStart(2,'0')}</span><span>{label}</span></div>;})}
  </div>
  {step==='config'? <>
   <div className="roster-heading"><strong>已确认 {participants.length} 位参与者</strong><button className="back-button" disabled={locked} onClick={()=>{setStep('roster');onReset();}}><ChevronLeft size={15} aria-hidden="true"/>返回</button></div>
   {children}
  </>:step==='add'? <>
   <div className="method-tabs" role="tablist" aria-label="参与方式" style={{'--tab-index':modes.findIndex(([key])=>key===mode)} as React.CSSProperties}>
    <span className="tab-slider" aria-hidden="true"/>
    {modes.map(([key,label])=><button role="tab" aria-selected={mode===key} key={key} disabled={busy} onClick={()=>selectMode(key)}>{label}</button>)}
   </div>
   <div className="method-content">
    {mode==='input'&&<div className="names-block"><textarea aria-label="参与名单" placeholder={'支持换行、逗号或空格，如\n张三，李四'} value={text} onChange={e=>setText(e.target.value)}/></div>}
    {mode==='file'&&<div className="file-import">
     <a className="template-button" href="./participants-template.xlsx" download="Luckydog-名单模板.xlsx">下载模板</a>
     <label className="file-picker">选择 Excel 文件<input aria-label="导入 Excel 名单" type="file" accept=".xlsx" disabled={busy} onChange={e=>{const file=e.target.files?.[0];e.target.value='';if(file)void loadFile(file);}}/></label>
     <small>{filename?`${filename} · ${fileNames.length} 人`:'仅支持 .xlsx，文件不超过 5 MB'}</small>
    </div>}
    {mode==='invite'&&<div className="invite-box">{room?<><ShareLink url={shareUrl('join',room.id)} validity={now>=room.joinExpires?'邀请已到期，报名已结束':`剩余 ${Math.ceil((room.joinExpires-now)/60000)} 分钟 · ${new Date(room.joinExpires).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'})} 截止`}/><p className="registration-count">已有 <b>{participants.length}</b> 人报名</p></>:<><strong>邀请朋友参与抽奖</strong><ol><li>分享二维码或链接，参与者填写用户名。</li><li>同一浏览器限报一次，同名不可重复报名。</li><li>链接到期自动截止报名，确认名单后即可配置抽奖。报名信息保留七天。</li></ol><fieldset className="invite-duration"><legend>链接有效期</legend><div>{[5,10,30].map(minutes=><button type="button" key={minutes} aria-pressed={duration===minutes} onClick={()=>setDuration(minutes)}>{minutes} 分钟</button>)}</div></fieldset></>}</div>}
   </div>
   <div className="flow-footer">
    {mode!=='invite'?<button className="import-button" disabled={busy||(!participants.length&&(mode==='input'?!text.trim():!fileNames.length))} onClick={confirmNames}>确认名单</button>:
     room?<button className="import-button" disabled={busy||!participants.length} onClick={()=>void finishInvite()}>结束报名并确认名单</button>:
     participants.length?<button className="import-button" onClick={()=>setStep('roster')}>确认名单</button>:
     <button className="import-button" disabled={busy} onClick={()=>void run(async()=>{const value=await api<Room>('rooms','POST',{durationMinutes:duration});polling.current=true;setNow(Date.now());setRoom(value);})}>{busy?'正在创建…':'创建抽奖邀请'}</button>}
   </div>
  </>:<>
   <div className="roster-heading"><strong>当前参与名单 <b>{participants.length}</b></strong><button disabled={locked||busy} className="back-button" onClick={()=>setBack(true)}><ChevronLeft size={15} aria-hidden="true"/>返回</button></div>
   <div className="roster-table"><table><thead><tr><th>序号</th><th>用户名</th><th className="remove-column"><span className="sr-only">操作</span></th></tr></thead><tbody>{participants.map((p,index)=><tr key={p.id}><td>{String(index+1).padStart(2,'0')}</td><td>{p.name}</td><td className="remove-column"><button aria-label={`删除 ${p.name}`} disabled={locked||busy} onClick={()=>{setParticipants(previous=>previous.filter(item=>item.id!==p.id));setError('');setSuccess('删除成功');setDeleted(value=>value+1);}}><X size={14}/></button></td></tr>)}</tbody></table>{!participants.length&&<p className="empty-roster">名单为空，请返回添加名单</p>}</div>
   <div className="flow-footer"><button className="import-button" disabled={locked||busy||!participants.length} onClick={()=>setStep('config')}>确认名单</button></div>
  </>}
  <Toast message={error||success} status={error?'error':'success'} revision={deleted} dismissible={Boolean(error)} onClose={()=>{setError('');setSuccess('');}}/>
  {back&&<div className="modal-backdrop"><div className="dialog" role="dialog" aria-modal="true" aria-labelledby="back-title">
   <button className="dialog-close" aria-label="关闭弹窗" disabled={busy} onClick={()=>setBack(false)}><X size={18}/></button>
   <h2 id="back-title">返回添加名单</h2><p>是否保留当前 {participants.length} 位参与者？{room?'现有邀请链接将失效。':''}</p>
   <div className="dialog-actions"><button disabled={busy} onClick={()=>void leave(false)}>清空并返回</button><button autoFocus className="primary" disabled={busy} onClick={()=>void leave(true)}>保留并返回</button></div>
  </div></div>}
  {switchTo&&<div className="modal-backdrop"><div className="dialog" role="dialog" aria-modal="true" aria-labelledby="switch-title">
   <button className="dialog-close" aria-label="关闭弹窗" disabled={busy} onClick={()=>setSwitchTo(null)}><X size={18}/></button>
   <h2 id="switch-title">切换添加方式</h2><p>各方式独立添加名单。切换后，当前方式已输入、导入或保留的名单会被清空。{room?'现有邀请链接也将失效。':''}</p>
   <div className="dialog-actions"><button disabled={busy} onClick={()=>setSwitchTo(null)}>继续编辑</button><button autoFocus className="primary" disabled={busy} onClick={()=>void changeMode(switchTo)}>清空并切换</button></div>
  </div></div>}
 </section>;
}
