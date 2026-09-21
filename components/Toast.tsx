import React, { useEffect, useRef } from 'react';
import { X, CircleCheck, CircleAlert, Info } from 'lucide-react';
export function Toast({message,onClose,status='error',revision=0,dismissible=true,persistent=false}:{message:string;onClose:()=>void;status?:'success'|'error'|'info';revision?:number;dismissible?:boolean;persistent?:boolean}) {
 const close=useRef(onClose);close.current=onClose;
 useEffect(()=>{if(!message||persistent)return;const timer=setTimeout(()=>close.current(),4500);return()=>clearTimeout(timer);},[message,revision,persistent]);
 const Icon=status==='success'?CircleCheck:status==='error'?CircleAlert:Info;
 return message ? <div className={`toast toast-${status}`} role={status==='error'?'alert':'status'}><Icon className="toast-status-icon" size={19} aria-hidden="true"/><span>{message}</span>{dismissible&&<button aria-label="关闭提示" onClick={onClose}><X size={16}/></button>}</div> : null;
}
