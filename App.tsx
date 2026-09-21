import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Info, Share2, Github, Minus, Play,
  Plus, ShieldCheck, Sparkles, Trophy, PartyPopper, RotateCcw, Trash2,
  X,
} from 'lucide-react';
import { DrawStatus } from './types';
import { useParticipants } from './hooks/useParticipants';
import { useDraw } from './hooks/useDraw';
import { ParticipantSetup, type ActiveRoom } from './components/ParticipantSetup';
import { SharedPage } from './components/SharedPage';
import { Toast } from './components/Toast';
import { ShareLink } from './components/ShareLink';
import { ProductManual } from './components/ProductManual';
import { api, ApiError, disposeShare, shareUrl } from './services/sharing';

const clamp = (value: number, maximum: number) => Math.min(Math.max(1, value), Math.max(1, maximum));

const App: React.FC = () => {
  const { participants, setParticipants, storageError, isDesktop } = useParticipants();
  const [ready, setReady] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [resultUrl, setResultUrl] = useState('');
  const [resultShare, setResultShare] = useState<{id:string;owner:string}|null>(null);
  const [activeRoom, setActiveRoom] = useState<ActiveRoom|null>(null);
  const [shareError, setShareError] = useState('');
  const [sharing, setSharing] = useState(false);
  const [resultAction, setResultAction] = useState<'continue'|'clear'|null>(null);
  const [participantFlowKey, setParticipantFlowKey] = useState(0);
  const [winnerCount, setWinnerCount] = useState(1);
  const [privacyVisible, setPrivacyVisible] = useState(true);
  const publishedRoomResult = useRef(0);
  const [syncedResult, setSyncedResult] = useState(0);
  const [syncRetry, setSyncRetry] = useState(0);
  const { status, currentResult, flickerName, startDraw, resetDraw } = useDraw();
  const drawing = status === DrawStatus.DRAWING;
  const canDraw = ready && participants.length > 0 && winnerCount <= participants.length;

  useEffect(() => {
    setWinnerCount(current => clamp(current, participants.length));
  }, [participants.length]);

  useEffect(() => {
    if (!resultShare) return;
    const heartbeat = () => { void api(`results/${resultShare.id}`, 'PATCH', {}, resultShare.owner).catch(() => {}); };
    const dispose = () => disposeShare(`results/${resultShare.id}`, resultShare.owner);
    const timer = setInterval(heartbeat, 30000);
    window.addEventListener('pagehide', dispose);
    return () => { clearInterval(timer); window.removeEventListener('pagehide', dispose); };
  }, [resultShare]);

  useEffect(() => {
    if (!currentResult || !activeRoom || isDesktop || publishedRoomResult.current === currentResult.timestamp) return;
    publishedRoomResult.current = currentResult.timestamp;
    setSharing(true); setShareError('');
    void api(`rooms/${activeRoom.id}`, 'PATCH', { result: currentResult }, activeRoom.owner)
      .then(() => { setSyncedResult(currentResult.timestamp); setResultUrl(shareUrl('join', activeRoom.id)); })
      .catch(error => { publishedRoomResult.current = 0; setShareError((error as Error).message); })
      .finally(() => setSharing(false));
  }, [currentResult, activeRoom?.id, activeRoom?.owner, isDesktop, syncRetry]);

  const helperText = useMemo(() => {
    if (!ready) return '先确认参与名单，再设置本轮中奖名额。';
    if (winnerCount === 1) return `${participants.length} 位朋友已经就位，今天的幸运儿会是谁？`;
    return `${participants.length} 位朋友都在场，准备迎接 ${winnerCount} 份好运。`;
  }, [participants.length, winnerCount, ready]);

  const clearSharedResult = () => {
    if (resultShare) disposeShare(`results/${resultShare.id}`, resultShare.owner);
    setResultShare(null); if (!activeRoom) setResultUrl('');
  };
  const draw = () => { clearSharedResult(); setShareError(''); startDraw(participants, winnerCount); };
  const continueDraw = () => {
    clearSharedResult();
    setResultAction(null);
    resetDraw();
  };
  const clearActivity = async () => {
    setSharing(true); setShareError('');
    try {
      if (activeRoom) { try { await api(`rooms/${activeRoom.id}`, 'DELETE', {}, activeRoom.owner); } catch (error) { if (!(error instanceof ApiError && error.status === 404)) throw error; } }
      if (resultShare) await api(`results/${resultShare.id}`, 'DELETE', {}, resultShare.owner);
      setResultShare(null); setResultUrl(''); setActiveRoom(null); setSyncedResult(0); setParticipants([]); setReady(false);
      setShareOpen(false); setResultAction(null); setParticipantFlowKey(value => value + 1); resetDraw();
    } catch (error) { setShareError((error as Error).message); }
    finally { setSharing(false); }
  };
  const publishResult = async () => {
    if (!currentResult) return;
    setSharing(true); setShareError('');
    try { const result = await api<{id:string;owner:string}>('results', 'POST', currentResult); setResultShare(result); setResultUrl(shareUrl('result', result.id)); }
    catch (error) { setShareError((error as Error).message); }
    finally { setSharing(false); }
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark"><Trophy size={19} /></span>
          <div><strong>Luckydog</strong><small>把好运留给这一刻</small></div>
        </div>
        <div className="topbar-actions">
          <ProductManual />
          <a className="icon-link" href="https://github.com/Jadey-ovo/luckydog" target="_blank" rel="noopener noreferrer" aria-label="打开 GitHub"><Github size={19} /></a>
        </div>
      </header>

      {!isDesktop && privacyVisible && (
        <div className="privacy-banner" role="status">
          <ShieldCheck size={16} />
          <span className="privacy-summary">活动创建后 24 小时内可查询本人结果。
            <span className="info-bubble privacy-info"><button aria-label="查看信息安全说明" aria-describedby="privacy-details"><Info size={15}/></button><span id="privacy-details" role="tooltip">报名与开奖结果保存在 Sites 托管服务，创建满 24 小时后失效并自动清理。关闭页面不删除已开奖结果；未开奖且连接中断约 90 秒后停止报名。清空活动会立即撤销链接。</span></span>
          </span>
          <a href="./privacy.html" target="_blank" rel="noopener noreferrer">隐私说明</a>
          <a href="https://github.com/Jadey-ovo/luckydog/releases/latest" target="_blank" rel="noopener noreferrer">下载桌面版</a>
          <button onClick={() => setPrivacyVisible(false)} aria-label="关闭隐私提示"><X size={15} /></button>
        </div>
      )}

      {storageError && <div role="alert" className="error-banner">{storageError}</div>}

      <main className="workspace">
        <aside className="control-panel" aria-label="抽奖配置">
          <div className="panel-heading">
            <div><span className="eyebrow">DRAW SETUP</span><h2 className="config-title">抽奖配置<span className="info-bubble"><button aria-label="抽奖规则" aria-describedby="draw-rules"><Info size={15}/></button><span id="draw-rules" role="tooltip">同一轮不会重复中奖。返回后再次抽奖，将从完整名单重新抽取。</span></span></h2></div>
            <span className="ready-dot">{canDraw ? '已就绪' : '待配置'}</span>
          </div>

          <ParticipantSetup key={participantFlowKey} participants={participants} setParticipants={setParticipants} locked={drawing||Boolean(activeRoom&&(syncedResult||currentResult))} onReady={setReady} onReset={resetDraw} onRoomChange={setActiveRoom} isDesktop={isDesktop}>
          <section className="setting-block">
            <div className="setting-label"><span>中奖名额</span><small>不超过参与人数</small></div>
            <div className="count-stepper">
              <button aria-label="减少中奖名额" disabled={drawing || winnerCount <= 1} onClick={() => setWinnerCount(value => Math.max(1, value - 1))}><Minus size={18} /></button>
              <input aria-label="中奖名额" disabled={drawing} type="number" min="1" max={participants.length || 1} value={winnerCount} onChange={event => setWinnerCount(clamp(Number.parseInt(event.target.value) || 1, participants.length))} />
              <button aria-label="增加中奖名额" disabled={drawing || winnerCount >= participants.length} onClick={() => setWinnerCount(value => clamp(value + 1, participants.length))}><Plus size={18} /></button>
            </div>
            <div className="quick-counts" aria-label="快捷设置中奖名额">
              {[1, 3, 5, 10].map(count => <button key={count} disabled={drawing || count > participants.length} className={winnerCount === count ? 'active' : ''} onClick={() => setWinnerCount(count)}>{count} 人</button>)}
            </div>
          </section>

          </ParticipantSetup>


        </aside>

        <section className="draw-stage">
          <div className="stage-orbit orbit-one" />
          <div className="stage-orbit orbit-two" />
          {status === DrawStatus.IDLE && (
            <div className={`idle-state ${participants.length?'has-participants':''}`}>
              <div className="stage-intro"><span className="stage-kicker">A LITTLE MOMENT OF LUCK</span><h1>{participants.length?'参与名单':'探索幸运时刻'}</h1><p>{helperText}</p></div>
              {participants.length?<div className={`participant-card-grid ${participants.length>12?'compact':''} ${participants.length>30?'dense':''} ${participants.length>80?'ultra':''}`}>
                {participants.map((participant,index)=><article className="participant-card" key={participant.id}><span className="participant-avatar">{participant.name.trim().charAt(0).toUpperCase()}</span><span className="participant-card-name">{participant.name}</span><small>{String(index+1).padStart(2,'0')}</small></article>)}
              </div>:<div className="lucky-seal"><i className="globe-ring ring-horizontal"/><i className="globe-ring ring-vertical"/><Sparkles size={30} /><span>LUCKY</span></div>}
              <div className="draw-dock"><span className="participant-total">当前已参与 <b>{participants.length}</b> 名用户</span><button className="draw-button" disabled={!canDraw} onClick={draw}><Play size={21} fill="currentColor" />开始抽奖</button><small>{canDraw ? `将从 ${participants.length} 人中抽出 ${winnerCount} 人` : '截止报名并确认名单后即可开始'}</small></div>
            </div>
          )}

          {status === DrawStatus.DRAWING && (
            <div className="drawing-state">
              <span className="drawing-label"><i />好运正在靠近</span>
              <div className="flicker-name">{flickerName}</div>
              <p>请稍候，名字正在与幸运相遇</p>
            </div>
          )}

          {status === DrawStatus.FINISHED && currentResult && (
            <div className="result-state">
              <div className="party-poppers" aria-hidden="true"><PartyPopper/><PartyPopper/></div>
              <div className="result-heading">
                <span className="stage-kicker">CONGRATULATIONS</span>
                <h1>幸运名单</h1>
                <p>掌声送给今天被好运选中的朋友</p>
              </div>
              <div className={`winner-grid count-${Math.min(currentResult.winners.length, 10)} ${currentResult.winners.length > 10 ? 'many' : ''} ${currentResult.winners.length > 20 ? 'crowded' : ''}`}>
                {currentResult.winners.map((winner, index) => (
                  <article className="winner-card" key={winner.id}>
                    <span>{String(index + 1).padStart(2, '0')}</span>
                    <strong>{winner.name}</strong>
                  </article>
                ))}
              </div>
              <div className="result-actions">
                <button className="primary" disabled={sharing||Boolean(activeRoom&&syncedResult!==currentResult.timestamp)} onClick={()=>setResultAction('continue')}><RotateCcw size={16} aria-hidden="true"/>继续抽奖</button>
                <button disabled={sharing} onClick={()=>setResultAction('clear')}><Trash2 size={16} aria-hidden="true"/>清空返回</button>
                {!isDesktop && <button onClick={() => setShareOpen(true)}><Share2 size={17} />{activeRoom?'查看活动二维码':'分享抽奖结果'}</button>}
              </div>
            </div>
          )}
        </section>
      </main>
      {activeRoom && status !== DrawStatus.FINISHED && <button className="back-button" disabled={drawing||sharing} onClick={()=>setResultAction('clear')}>清空本次活动</button>}
      {activeRoom && currentResult && syncedResult!==currentResult.timestamp && <p role="status">{sharing?'正在同步本人开奖结果…':<>开奖结果尚未同步，参与者暂时无法查询本轮结果。<button onClick={()=>{publishedRoomResult.current=0;setSyncRetry(value=>value+1);}}>重试同步开奖结果</button></>}</p>}
      <Toast message={shareError} onClose={()=>setShareError('')}/>
      {resultAction==='continue'&&<div className="modal-backdrop"><div className="dialog" role="dialog" aria-modal="true" aria-labelledby="continue-draw-title"><button className="dialog-close" aria-label="关闭弹窗" onClick={()=>setResultAction(null)}><X size={18}/></button><h2 id="continue-draw-title">继续使用当前名单抽奖</h2><p>当前参与名单会完整保留。下一轮会从整个名单重新随机抽取，因此可能与上一轮的中奖者重复；活动链接会继续显示最近一次完成的结果。</p><div className="dialog-actions"><button onClick={()=>setResultAction(null)}>取消</button><button autoFocus className="primary" onClick={continueDraw}>确认继续抽奖</button></div></div></div>}
      {resultAction==='clear'&&<div className="modal-backdrop"><div className="dialog danger-dialog" role="dialog" aria-modal="true" aria-labelledby="clear-activity-title"><button className="dialog-close" aria-label="关闭弹窗" disabled={sharing} onClick={()=>setResultAction(null)}><X size={18}/></button><h2 id="clear-activity-title">清空本次活动</h2><p>确认后会删除本次参与名单和开奖结果，原邀请二维码、邀请链接及参与者正在查看的结果页都会失效，并返回到新的邀请报名起点。此操作无法撤销。</p><div className="dialog-actions"><button disabled={sharing} onClick={()=>setResultAction(null)}>保留本次活动</button><button autoFocus className="danger" disabled={sharing} onClick={()=>void clearActivity()}>{sharing?'正在清空…':'确认清空并返回'}</button></div></div></div>}
      {shareOpen && <div className="modal-backdrop"><div className="dialog" role="dialog" aria-modal="true" aria-labelledby="share-title"><button className="dialog-close" aria-label="关闭弹窗" disabled={sharing} onClick={()=>setShareOpen(false)}><X size={18}/></button><h2 id="share-title">{activeRoom?'活动二维码':'分享抽奖结果'}</h2>{activeRoom?<>{resultUrl?<ShareLink url={resultUrl} validity="原链接仅显示本人结果 · 活动创建后 24 小时内有效"/>:<p>正在把开奖结果同步到原活动链接…</p>}</>:resultUrl ? <ShareLink url={resultUrl} validity="关闭发起页面后，此链接将失效"/> : <><p>生成链接后，中奖用户名与抽奖时间会临时上传。关闭发起页面后，分享链接随即失效。</p><button autoFocus disabled={sharing} onClick={publishResult}>{sharing ? '正在生成…':'生成分享链接'}</button></>}</div></div>}
    </div>
  );
};

export default function Entry() {
 const [hash,setHash]=useState(location.hash);
 useEffect(()=>{const update=()=>setHash(location.hash);window.addEventListener('hashchange',update);return()=>window.removeEventListener('hashchange',update);},[]);
 const match=/^#(join|result)=([a-f0-9]{48})$/.exec(hash);
 return match ? <SharedPage key={hash} kind={match[1]} id={match[2]}/> : <App/>;
}
