export type RecPreset = "none" | "chipmunk" | "monstrous" | "walkie";

function makeDistortionCurve(amount: number) {
  const n = 44100;
  const curve = new Float32Array(n);
  const deg = Math.PI / 180;
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1;
    curve[i] = ((3 + amount) * x * 20 * deg) / (Math.PI + amount * Math.abs(x));
  }
  return curve;
}

export async function playRecordedWithEffects(
  dataUrl: string,
  pitch: number,
  volume: number,
  preset: RecPreset,
) {
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new AC();
  const res = await fetch(dataUrl);
  const buf = await res.arrayBuffer();
  const audioBuf = await ctx.decodeAudioData(buf.slice(0));

  const src = ctx.createBufferSource();
  src.buffer = audioBuf;
  src.playbackRate.value = Math.min(2, Math.max(0.5, pitch));

  const gain = ctx.createGain();
  gain.gain.value = Math.min(1, Math.max(0, volume));

  let node: AudioNode = src;

  if (preset === "chipmunk") {
    src.playbackRate.value = Math.min(2, src.playbackRate.value * 1.6);
  } else if (preset === "monstrous") {
    src.playbackRate.value = Math.max(0.5, src.playbackRate.value * 0.6);
    const shaper = ctx.createWaveShaper();
    shaper.curve = makeDistortionCurve(50);
    shaper.oversample = "4x";
    const delay = ctx.createDelay();
    delay.delayTime.value = 0.18;
    const feedback = ctx.createGain();
    feedback.gain.value = 0.4;
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 6;
    lfoGain.gain.value = 0.5;
    lfo.connect(lfoGain).connect(gain.gain);
    lfo.start();
    node.connect(shaper);
    shaper.connect(delay);
    delay.connect(feedback).connect(delay);
    shaper.connect(gain);
    delay.connect(gain);
    gain.connect(ctx.destination);
    src.start();
    src.onended = () => { try { lfo.stop(); ctx.close(); } catch { /* noop */ } };
    return;
  } else if (preset === "walkie") {
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass"; hp.frequency.value = 900;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass"; lp.frequency.value = 2500;
    const shaper = ctx.createWaveShaper();
    shaper.curve = makeDistortionCurve(20);
    node.connect(hp); hp.connect(lp); lp.connect(shaper);
    node = shaper;
  }

  node.connect(gain).connect(ctx.destination);
  src.start();
  src.onended = () => { try { ctx.close(); } catch { /* noop */ } };
}
