import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
export function ShareLink({url,validity='链接仅在发起页面打开时有效'}: {url:string;validity?:string}) {
 const [qr,setQr]=useState(''); const [notice,setNotice]=useState('');
 useEffect(()=>{ let active=true; QRCode.toDataURL(url,{width:200,margin:2,color:{dark:'#493524',light:'#fffdf8'}}).then(value=>{if(active)setQr(value);}).catch(()=>setNotice('二维码生成失败，请复制链接')); return()=>{active=false;}; },[url]);
 return <div className="share-link">{qr && <img src={qr} alt="扫描二维码打开分享链接" width="160" height="160"/>}<input aria-label="分享链接" readOnly value={url} onFocus={e=>e.target.select()}/><button onClick={async()=>{try{await navigator.clipboard.writeText(url);setNotice('链接已复制');}catch{setNotice('请选中上方链接手动复制');}}}>复制链接</button><small role="status">{notice || validity}</small></div>;
}
