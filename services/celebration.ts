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

  // Two short filtered noise bursts give the reveal a soft party-popper sound
  // without loading or streaming an external audio file.
  [0, 0.2].forEach((delay, index) => {
    const length = Math.floor(audioContext!.sampleRate * 0.18);
    const buffer = audioContext!.createBuffer(1, length, audioContext!.sampleRate);
    const channel = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) channel[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2);
    const source = audioContext!.createBufferSource();
    const filter = audioContext!.createBiquadFilter();
    const gain = audioContext!.createGain();
    filter.type = 'bandpass'; filter.frequency.value = index ? 1250 : 900; filter.Q.value = 0.7;
    gain.gain.setValueAtTime(0.42, now + delay);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.18);
    source.buffer = buffer; source.connect(filter).connect(gain).connect(master);
    source.start(now + delay); source.stop(now + delay + 0.19);
  });

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
