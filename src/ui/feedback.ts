let audioCtx: AudioContext | null = null;
let lastSoundTime = 0;

export function triggerHaptic(): void {
  if (
    typeof navigator !== "undefined" &&
    typeof navigator.vibrate === "function"
  ) {
    try {
      navigator.vibrate(8);
    } catch {}
  }
}

export function playClick(variant: "on" | "off" = "on"): void {
  if (typeof window === "undefined") return;
  const now = performance.now();
  if (now - lastSoundTime < 25) return;
  lastSoundTime = now;

  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioContextClass) return;

    if (!audioCtx) {
      audioCtx = new AudioContextClass();
    }
    if (audioCtx.state === "suspended") {
      audioCtx.resume().catch(() => {});
    }

    const t = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    const startFreq = variant === "on" ? 1300 : 950;
    const endFreq = variant === "on" ? 180 : 140;

    osc.type = "sine";
    osc.frequency.setValueAtTime(startFreq, t);
    osc.frequency.exponentialRampToValueAtTime(endFreq, t + 0.009);

    gain.gain.setValueAtTime(0.07, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.011);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start(t);
    osc.stop(t + 0.014);
  } catch {}
}

export function triggerFeedback(
  settings: { sound: boolean; haptics: boolean },
  variant: "on" | "off" = "on",
): void {
  if (settings.haptics) {
    triggerHaptic();
  }
  if (settings.sound) {
    playClick(variant);
  }
}
