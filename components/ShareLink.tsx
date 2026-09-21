import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
export function ShareLink({url,validity='链接仅在发起页面打开时有效',disabled=false,onCopied,onError}: {url:string;validity?:string;disabled?:boolean;onCopied?:()=>void;onError?:(message:string)=>void}) {
 const [qr,setQr]=useState(''); const [notice,setNotice]=useState('');
 useEffect(()=>{ let active=true; QRCode.toDataURL(url,{width:200,margin:2,color:{dark:'#493524',light:'#fffdf8'}}).then(value=>{if(active)setQr(value);}).catch(()=>setNotice('二维码生成失败，请复制链接')); return()=>{active=false;}; },[url]);
 return <div className={`share-link ${disabled?'share-link-expired':''}`}><div className="qr-frame">{qr && <img src={qr} alt="扫描二维码打开分享链接" width="160" height="160"/>}{disabled&&<span>报名已截止<br/>二维码已失效</span>}</div><input aria-label="分享链接" readOnly disabled={disabled} value={url} onFocus={e=>e.target.select()}/><button disabled={disabled} onClick={async()=>{try{await navigator.clipboard.writeText(url);onCopied?.();}catch{onError?.('复制失败，请手动选择链接');}}}>复制链接</button><small>{disabled?'此链接已失效':notice||validity}</small></div>;
}
