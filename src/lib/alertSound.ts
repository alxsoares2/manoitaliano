let audioCtx: AudioContext | null = null;
let loopInterval: ReturnType<typeof setInterval> | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}

function playBeepOnce() {
  try {
    const ctx = getAudioContext();
    if (ctx.state === "suspended") ctx.resume();

    const now = ctx.currentTime;
    const playTone = (startTime: number, freq: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.exponentialRampToValueAtTime(0.4, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + 0.3);
    };

    playTone(now, 880);
    playTone(now + 0.3, 1100);
    playTone(now + 0.6, 880);
  } catch {
    // Audio not available
  }
}

export function startAlertLoop() {
  if (loopInterval) return;
  playBeepOnce();
  loopInterval = setInterval(playBeepOnce, 3000);
}

export function stopAlertLoop() {
  if (loopInterval) {
    clearInterval(loopInterval);
    loopInterval = null;
  }
}

export function isAlertPlaying(): boolean {
  return loopInterval !== null;
}
