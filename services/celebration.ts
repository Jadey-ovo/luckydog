let audioContext: AudioContext | null = null;

export function prepareCelebrationSound() {
  if (!audioContext) audioContext = new AudioContext();
  void audioContext.resume();
}

export function playCelebrationSound() {
  if (!audioContext || audioContext.state !== 'running') return;
  const now = audioContext.currentTime;
  const master = audioContext.createGain();
  master.gain.setValueAtTime(0.0001, now);
  master.gain.exponentialRampToValueAtTime(0.22, now + 0.03);
  master.gain.exponentialRampToValueAtTime(0.0001, now + 1.45);
  master.connect(audioContext.destination);

  [523.25, 659.25, 783.99, 1046.5].forEach((frequency, index) => {
    const oscillator = audioContext!.createOscillator();
    const gain = audioContext!.createGain();
    const start = now + index * 0.13;
    oscillator.type = index === 3 ? 'sine' : 'triangle';
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.5, start + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.42);
    oscillator.connect(gain).connect(master);
    oscillator.start(start);
    oscillator.stop(start + 0.45);
  });
}
