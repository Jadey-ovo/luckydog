import { useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { DrawStatus, type DrawResult, type Participant } from '../types';
import { pickWinners } from '../utils/random';
export function useDraw() {
  const [status, setStatus] = useState(DrawStatus.IDLE);
  const [currentResult, setCurrentResult] = useState<DrawResult | null>(null);
  const [flickerName, setFlickerName] = useState('???');
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const cleanup = () => { if (timer.current !== null) clearInterval(timer.current); timer.current = null; };
  useEffect(() => () => { cleanup(); confetti.reset(); }, []);
  function startDraw(participants: Participant[], count: number) {
    if (timer.current !== null || !Number.isInteger(count) || count < 1 || count > participants.length) return;
    const snapshot = participants.map(p => ({ ...p }));
    const winners = pickWinners(snapshot, count);
    setStatus(DrawStatus.DRAWING);
    setCurrentResult(null);
    setFlickerName(snapshot[0].name);
    let tick = 0;
    timer.current = setInterval(() => {
      setFlickerName(snapshot[Math.floor(Math.random() * snapshot.length)].name);
      if (++tick >= 30) {
        cleanup();
        setCurrentResult({ winners, timestamp: Date.now() });
        setStatus(DrawStatus.FINISHED);
        confetti({ particleCount: 150, spread: 90, origin: { y: 0.6 }, disableForReducedMotion: true });
      }
    }, 100);
  }
  function resetDraw() { cleanup(); setStatus(DrawStatus.IDLE); setCurrentResult(null); setFlickerName('???'); }
  return { status, currentResult, flickerName, startDraw, resetDraw };
}
