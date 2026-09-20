import React, { useEffect, useMemo, useState } from 'react';
import {
  Info, ChevronLeft, Share2, Github, Minus, Play,
  Plus, ShieldCheck, Sparkles, Trophy,
  X,
} from 'lucide-react';
import { DrawStatus } from './types';
import { useParticipants } from './hooks/useParticipants';
import { useDraw } from './hooks/useDraw';
import { ParticipantSetup } from './components/ParticipantSetup';
import { SharedPage } from './components/SharedPage';
import { Toast } from './components/Toast';
import { ShareLink } from './components/ShareLink';
import { api, shareUrl } from './services/sharing';

const clamp = (value: number, maximum: number) => Math.min(Math.max(1, value), Math.max(1, maximum));

const App: React.FC = () => {
  const { participants, setParticipants, storageError, isDesktop } = useParticipants();
  const [ready, setReady] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [resultUrl, setResultUrl] = useState('');
  const [shareError, setShareError] = useState('');
  const [sharing, setSharing] = useState(false);
  const [winnerCount, setWinnerCount] = useState(1);
  const [privacyVisible, setPrivacyVisible] = useState(true);
  const { status, currentResult, flickerName, startDraw, resetDraw } = useDraw();
  const drawing = status === DrawStatus.DRAWING;
  const canDraw = ready && participants.length > 0 && winnerCount <= participants.length;

  useEffect(() => {
    setWinnerCount(current => clamp(current, participants.length));
  }, [participants.length]);

  const helperText = useMemo(() => {
    if (!ready) return '先确认参与名单，再设置本轮中奖名额。';
    if (winnerCount === 1) return `${participants.length} 位朋友已经就位，今天的幸运儿会是谁？`;
    return `${participants.length} 位朋友都在场，准备迎接 ${winnerCount} 份好运。`;
  }, [participants.length, winnerCount, ready]);

  const draw = () => { setResultUrl(''); setShareError(''); startDraw(participants, winnerCount); };
  const publishResult = async () => {
    if (!currentResult) return;
    setSharing(true); setShareError('');
    try { const result = await api<{id:string}>('results', 'POST', currentResult); setResultUrl(shareUrl('result', result.id)); }
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
          <a className="icon-link" href="https://github.com/Jadey-ovo/luckydog" target="_blank" rel="noopener noreferrer" aria-label="打开 GitHub"><Github size={19} /></a>
        </div>
      </header>

      {!isDesktop && privacyVisible && (
        <div className="privacy-banner" role="status">
          <ShieldCheck size={16} />
          <span>名单只停留在本次页面，刷新或关闭后自动清空，不会上传。<small>使用邀请或结果分享时，相应信息会提交至分享服务。</small></span>
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

          <ParticipantSetup participants={participants} setParticipants={setParticipants} locked={drawing} onReady={setReady} onReset={resetDraw}>
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
            <div className="idle-state">
              <span className="stage-kicker">A LITTLE MOMENT OF LUCK</span>
              <div className="lucky-seal"><i className="globe-ring ring-horizontal"/><i className="globe-ring ring-vertical"/><Sparkles size={30} /><span>LUCKY</span></div>
              <h1>探索幸运时刻</h1>
              <p>{helperText}</p>
              <button className="draw-button" disabled={!canDraw} onClick={draw}><Play size={21} fill="currentColor" />开始抽奖</button>
              <small>{canDraw ? `将从 ${participants.length} 人中抽出 ${winnerCount} 人` : '完成左侧三步配置后即可开始'}</small>
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
                <button className="primary" onClick={resetDraw}><ChevronLeft size={15} aria-hidden="true"/>返回</button>
                <button onClick={() => setShareOpen(true)}><Share2 size={17} />分享抽奖结果</button>
              </div>
            </div>
          )}
        </section>
      </main>
      <Toast message={shareError} onClose={()=>setShareError('')}/>
      {shareOpen && <div className="modal-backdrop"><div className="dialog" role="dialog" aria-modal="true" aria-labelledby="share-title"><button className="dialog-close" aria-label="关闭弹窗" disabled={sharing} onClick={()=>setShareOpen(false)}><X size={18}/></button><h2 id="share-title">分享抽奖结果</h2>{resultUrl ? <ShareLink url={resultUrl}/> : <><p>生成链接后，中奖用户名与抽奖时间将上传至分享服务。任何持有链接的人均可查看，七天后过期。</p><button autoFocus disabled={sharing} onClick={publishResult}>{sharing ? '正在生成…' : '生成分享链接'}</button></>}</div></div>}
    </div>
  );
};

export default function Entry() {
 const [hash,setHash]=useState(location.hash);
 useEffect(()=>{const update=()=>setHash(location.hash);window.addEventListener('hashchange',update);return()=>window.removeEventListener('hashchange',update);},[]);
 const match=/^#(join|result)=([a-f0-9]{48})$/.exec(hash);
 return match ? <SharedPage key={hash} kind={match[1]} id={match[2]}/> : <App/>;
}
