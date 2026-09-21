import { useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { DrawStatus, type DrawResult, type Participant } from '../types';
import { pickWinners } from '../utils/random';
import { playCelebrationSound, prepareCelebrationSound } from '../services/celebration';
export function useDraw() {
  const [status, setStatus] = useState(DrawStatus.IDLE);
  const [currentResult, setCurrentResult] = useState<DrawResult | null>(null);
  const [flickerName, setFlickerName] = useState('???');
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const cleanup = () => { if (timer.current !== null) clearInterval(timer.current); timer.current = null; };
  useEffect(() => () => { cleanup(); confetti.reset(); }, []);
  function startDraw(participants: Participant[], count: number) {
    if (timer.current !== null || !Number.isInteger(count) || count < 1 || count > participants.length) return;
    prepareCelebrationSound();
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
        playCelebrationSound();
        confetti({ particleCount: 150, angle: 62, spread: 72, startVelocity: 56, origin: { x: 0.06, y: 0.82 }, disableForReducedMotion: true });
        confetti({ particleCount: 150, angle: 118, spread: 72, startVelocity: 56, origin: { x: 0.94, y: 0.82 }, disableForReducedMotion: true });
        window.setTimeout(() => confetti({ particleCount: 90, spread: 125, startVelocity: 32, origin: { x: 0.5, y: 0.38 }, disableForReducedMotion: true }), 220);
      }
    }, 100);
  }
  function resetDraw() { cleanup(); setStatus(DrawStatus.IDLE); setCurrentResult(null); setFlickerName('???'); }
  return { status, currentResult, flickerName, startDraw, resetDraw };
}
