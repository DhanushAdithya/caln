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
  if (now - lastSoundTime < 35) return;
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

    const oscClick = audioCtx.createOscillator();
    const gainClick = audioCtx.createGain();

    oscClick.type = "triangle";
    const clickStartFreq = variant === "on" ? 2200 : 1600;
    const clickEndFreq = variant === "on" ? 520 : 380;
    oscClick.frequency.setValueAtTime(clickStartFreq, t);
    oscClick.frequency.exponentialRampToValueAtTime(clickEndFreq, t + 0.016);

    gainClick.gain.setValueAtTime(0.28, t);
    gainClick.gain.exponentialRampToValueAtTime(0.001, t + 0.022);

    oscClick.connect(gainClick);
    gainClick.connect(audioCtx.destination);
    oscClick.start(t);
    oscClick.stop(t + 0.025);

    // Body resonance (mechanical switch bottom-out thump)
    const oscBody = audioCtx.createOscillator();
    const gainBody = audioCtx.createGain();

    oscBody.type = "sine";
    const bodyStartFreq = variant === "on" ? 360 : 280;
    const bodyEndFreq = variant === "on" ? 140 : 110;
    oscBody.frequency.setValueAtTime(bodyStartFreq, t);
    oscBody.frequency.exponentialRampToValueAtTime(bodyEndFreq, t + 0.028);

    gainBody.gain.setValueAtTime(0.22, t);
    gainBody.gain.exponentialRampToValueAtTime(0.001, t + 0.032);

    oscBody.connect(gainBody);
    gainBody.connect(audioCtx.destination);
    oscBody.start(t);
    oscBody.stop(t + 0.035);
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
