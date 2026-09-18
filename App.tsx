
import React, { useState, useEffect } from 'react';
import { Users, Trophy, Play, RotateCcw, UserPlus, Trash2, Sparkles, CheckCircle2, X } from 'lucide-react';
import { DrawStatus } from './types';
import { Card } from './components/Card';
import { useParticipants } from './hooks/useParticipants';
import { useDraw } from './hooks/useDraw';
import { importParticipants } from './services/participants';

const App: React.FC = () => {
  const { participants, setParticipants, storageError, remember, changeRemember, isDesktop } = useParticipants();
  const [inputText, setInputText] = useState('');
  const [winnerCount, setWinnerCount] = useState(1);
  const { status, currentResult, flickerName, startDraw, resetDraw } = useDraw();
  const drawing = status === DrawStatus.DRAWING;
  useEffect(() => { setWinnerCount(n => Math.min(n, Math.max(1, participants.length))); }, [participants.length]);
  const handleImport = () => {
    if (drawing) return;
    setParticipants(previous => importParticipants(inputText, previous));
    setInputText('');
  };
  const handleClearAll = () => {
    if (drawing || !window.confirm('确定要清空名单库中所有的参与者信息吗？')) return;
    setParticipants([]);
    setInputText('');
    resetDraw();
  };
  const draw = () => startDraw(participants, winnerCount);

  return (
    <div className="h-screen flex flex-col w-full overflow-hidden bg-[#f9fafb] text-[#4b5563]">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-8 py-4 shrink-0 flex items-center justify-between z-30 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-[#3b82f6] p-2 rounded-xl shadow-lg shadow-blue-100">
            <Trophy className="text-white" size={20} />
          </div>
          <h1 className="text-xl font-black text-[#111827] tracking-tighter">Luckydog</h1>
        </div>
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-100 px-4 py-1.5 rounded-full">
          <Users size={14} className="text-[#3b82f6]" />
          <span className="text-xs font-black text-[#111827]">{participants.length} 参与名单</span>
        </div>
      </header>

      {!isDesktop && (
        <div className="web-privacy flex flex-wrap items-center justify-between gap-2 px-8 py-3 bg-blue-50 text-xs text-blue-900 shrink-0">
          <div>
            <label className="inline-flex items-center gap-2 cursor-pointer font-bold">
              <input type="checkbox" checked={remember} disabled={drawing} onChange={event => changeRemember(event.target.checked)} />
              在此浏览器记住名单
            </label>
            <span className="ml-3">{remember ? '仅保存在当前浏览器，取消勾选即可删除已保存名单。' : '名单仅用于本次页面，刷新或关闭即清空。'}</span>
          </div>
          <nav className="flex gap-4" aria-label="项目链接">
            <a className="underline" href="./privacy.html" target="_blank" rel="noopener noreferrer">隐私说明</a>
            <a className="underline" href="https://github.com/Jadey-ovo/luckydog/releases/latest" target="_blank" rel="noopener noreferrer">下载桌面版</a>
          </nav>
        </div>
      )}
      {storageError && <div role="alert" className="bg-red-50 text-red-700 px-8 py-2">{storageError}</div>}
      <main className="flex-1 p-6 flex flex-col lg:flex-row gap-6 max-w-[1600px] mx-auto w-full overflow-hidden">

        {/* Sidebar */}
        <aside className="w-full lg:w-80 xl:w-96 flex flex-col gap-4 shrink-0 overflow-hidden h-full">
          <Card className="flex-1 border-none shadow-xl shadow-gray-200/50">
            <div className="flex flex-col h-full p-6 space-y-6 overflow-hidden">
              <div className="shrink-0 bg-blue-50/50 p-4 rounded-2xl border border-blue-100/30">
                <label className="block text-[11px] font-black text-blue-400 uppercase tracking-widest mb-3">中奖名额</label>
                <input
                  aria-label="中奖名额"
                  disabled={drawing}
                  type="number"
                  min="1"
                  max={participants.length || 1}
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-black text-[#111827] focus:border-[#3b82f6] focus:ring-4 focus:ring-blue-50"
                  value={winnerCount}
                  onChange={(e) => setWinnerCount(Math.max(1, parseInt(e.target.value) || 1))}
                />
              </div>

              <div className="space-y-3 shrink-0">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest">导入名单</label>
                  {inputText && (
                    <button onClick={() => setInputText('')} className="text-[10px] text-gray-400 hover:text-red-500 font-bold flex items-center gap-1">
                      <X size={12} /> 清除
                    </button>
                  )}
                </div>
                <textarea
                  aria-label="参与名单"
                  disabled={drawing}
                  className="w-full border border-gray-200 rounded-2xl p-4 text-xs text-[#4b5563] focus:border-[#3b82f6] focus:ring-4 focus:ring-blue-50 min-h-[140px] resize-none leading-relaxed transition-all bg-gray-50/30"
                  placeholder="每行一个姓名..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                />
                <button
                  onClick={handleImport}
                  disabled={drawing || !inputText.trim()}
                  className="w-full flex items-center justify-center gap-2 bg-[#111827] text-white py-4 rounded-2xl text-sm font-black hover:bg-black active:scale-[0.98] transition-all disabled:opacity-20 shadow-xl shadow-gray-200"
                >
                  <UserPlus size={18} /> 批量导入
                </button>
              </div>

              <div className="flex-1 overflow-hidden flex flex-col min-h-0 pt-4 border-t border-gray-50">
                <div className="flex items-center justify-between mb-4 shrink-0">
                  <span className="text-[11px] font-black text-[#111827] uppercase tracking-widest">名单库 ({participants.length})</span>
                  <button disabled={drawing} onClick={handleClearAll} className="text-[11px] text-[#EF4444] hover:bg-red-50 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 font-black uppercase transition-all">
                    <Trash2 size={12} /> 全部清空
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                  {participants.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full py-10 opacity-20">
                      <Users size={40} className="mb-2" />
                      <p className="text-[10px] font-bold uppercase">待录入</p>
                    </div>
                  ) : (
                    participants.map((p) => (
                      <div key={p.id} className="flex items-center justify-between bg-white px-4 py-2.5 rounded-xl border border-gray-100 group hover:border-blue-200 transition-all">
                        <span className="text-xs font-bold text-[#111827] truncate">{p.name}</span>
                        <button aria-label={`删除 ${p.name}`} disabled={drawing} onClick={() => setParticipants(prev => prev.filter(item => item.id !== p.id))} className="text-gray-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                          <X size={16} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </Card>
        </aside>

        {/* Main Stage */}
        <section className="flex-1 overflow-hidden h-full">
          <Card className="h-full relative overflow-hidden bg-white border-none shadow-2xl shadow-blue-500/5">
            <div className="absolute inset-0 pointer-events-none opacity-[0.02] flex items-center justify-center select-none scale-150">
              <Trophy size={600} />
            </div>

            <div className="w-full h-full flex flex-col items-center justify-center z-10 p-8 text-center relative overflow-hidden">

              {status === DrawStatus.IDLE && (
                <div className="flex flex-col items-center justify-center animate-in fade-in zoom-in duration-700 max-w-2xl w-full">
                  <div className="w-28 h-28 bg-[#3b82f6] rounded-[2.5rem] flex items-center justify-center mb-10 text-white shadow-2xl shadow-blue-200 transform rotate-12 hover:rotate-0 transition-all duration-500">
                    <Play className="ml-1.5 w-12 h-12 fill-white" />
                  </div>
                  <h2 className="text-5xl md:text-7xl font-black text-[#111827] mb-6 tracking-tighter leading-none">探索幸运时刻</h2>
                  <p className="text-[#4b5563] text-lg md:text-xl font-medium mb-12 leading-relaxed">
                    使用系统安全随机数，每轮中奖人员不重复。<br className="hidden md:block"/>
                    名单在本机处理，幸运由这一刻揭晓。
                  </p>
                  <button
                    disabled={participants.length < winnerCount || participants.length === 0}
                    onClick={draw}
                    className="px-20 py-5 bg-[#3b82f6] text-white rounded-[2rem] text-2xl font-black shadow-2xl shadow-blue-300 hover:bg-[#2563eb] active:scale-[0.96] transition-all flex items-center gap-4 disabled:opacity-10 disabled:grayscale disabled:cursor-not-allowed"
                  >
                    <Sparkles size={28} /> 开始抽奖
                  </button>
                </div>
              )}

              {status === DrawStatus.DRAWING && (
                <div className="flex flex-col items-center justify-center w-full animate-in fade-in duration-300">
                  <span className="px-10 py-3 bg-[#111827] text-white rounded-full text-xs font-black uppercase tracking-[0.4em] mb-16 shadow-2xl">
                    Randomizing...
                  </span>
                  {/* Reduced Font Size for the Flickering Name */}
                  <div className="text-5xl md:text-7xl font-black text-[#111827] animate-flicker tracking-tighter drop-shadow-2xl text-center break-words max-w-full leading-tight">
                    {flickerName}
                  </div>
                </div>
              )}

              {status === DrawStatus.FINISHED && currentResult && (
                <div className="w-full h-full flex flex-col items-center animate-in fade-in zoom-in duration-700 overflow-hidden">
                  <h2 className="text-5xl md:text-7xl font-black text-[#111827] mt-4 mb-6 flex items-center gap-4 tracking-tighter">
                    中奖名单 <CheckCircle2 className="text-[#10B981] w-14 h-14" />
                  </h2>

                  <div className="flex-1 w-full flex flex-wrap justify-center content-start gap-6 overflow-y-auto px-4 py-8 custom-scrollbar">
                    {currentResult.winners.map((winner, idx) => (
                      <div key={winner.id} className="bg-white border-2 border-gray-50 p-10 rounded-[3.5rem] text-center shadow-xl shadow-gray-200/40 min-w-[260px] transform hover:-translate-y-2 transition-all duration-500">
                        <div className="inline-flex items-center justify-center w-10 h-10 bg-[#3b82f6] text-white rounded-2xl font-black text-xs mb-6">
                          {idx + 1}
                        </div>
                        <div className="text-4xl font-black text-[#111827] tracking-tight">{winner.name}</div>
                      </div>
                    ))}
                  </div>

                  <div className="w-full max-w-2xl mt-4 mb-6 shrink-0">
                    <p className="text-lg font-bold text-blue-500">幸运如约而至，恭喜中奖！</p>
                  </div>

                  <div className="flex justify-center gap-6 shrink-0 mb-6">
                    <button disabled={participants.length === 0} onClick={draw} className="flex items-center gap-3 px-12 py-4 bg-[#3b82f6] text-white rounded-[1.5rem] text-lg font-black hover:bg-[#2563eb] shadow-xl shadow-blue-200"><RotateCcw size={20} /> 再抽一次</button>
                    <button onClick={resetDraw} className="flex items-center gap-3 px-12 py-4 bg-white border-2 border-gray-200 text-[#4b5563] rounded-[1.5rem] text-lg font-black hover:bg-gray-50"><X size={20} /> 关闭结果</button>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </section>
      </main>

      <footer className="py-5 px-10 border-t border-gray-100 bg-white shrink-0 text-center flex items-center justify-center gap-10 text-gray-300 text-[10px] font-black tracking-[0.4em] uppercase">
        <span>Aimall Design</span>
        <div className="w-1.5 h-1.5 bg-gray-100 rounded-full"></div>
        <span>纯本地抽奖 · 名单不上传</span>
        <div className="w-1.5 h-1.5 bg-gray-100 rounded-full"></div>
        <span>&copy; {new Date().getFullYear()}</span>
      </footer>
    </div>
  );
};

export default App;
