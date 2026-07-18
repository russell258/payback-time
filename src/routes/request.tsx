import { createFileRoute } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Marquee } from "@/components/Marquee";
import { playRecordedWithEffects, type RecPreset } from "@/lib/audio-effects";

const searchSchema = z.object({
  id: fallback(z.string(), "").default(""),
  r: fallback(z.string(), "Someone").default("Someone"),
  to: fallback(z.string(), "You").default("You"),
  link: fallback(z.string(), "dbs.com.sg").default("dbs.com.sg"),
  msg: fallback(z.string(), "You owe me!").default("You owe me!"),
  tts: fallback(z.string(), "Pay me back!").default("Pay me back!"),
  p: fallback(z.number(), 1).default(1),
  v: fallback(z.number(), 1).default(1),
});

export const Route = createFileRoute("/request")({
  validateSearch: zodValidator(searchSchema),
  head: () => ({
    meta: [
      { title: "🚨 YOU HAVE A MESSAGE!!! 🚨" },
      { name: "description", content: "You've got an urgent payment reminder waiting." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: RequestPage,
});

type Stage = "intro" | "flash" | "reveal";
type RecPreset = "none" | "chipmunk" | "monstrous" | "walkie";
type Payload = {
  r: string; to: string; link: string; msg: string;
  audioMode: "tts" | "record";
  tts: string; pitch: number; volume: number;
  audioDataUrl?: string;
  recPitch?: number;
  recVolume?: number;
  recPreset?: RecPreset;
  visualUrl?: string;
};

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

async function playRecordedWithEffects(dataUrl: string, pitch: number, volume: number, preset: RecPreset) {
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
    // tremolo
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
    node = gain;
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

function RequestPage() {
  const search = Route.useSearch();
  const [payload, setPayload] = useState<Payload | null>(null);
  const [stage, setStage] = useState<Stage>("intro");
  const [qr, setQr] = useState<string>("");

  useEffect(() => {
    if (search.id && typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(search.id);
        if (raw) { setPayload(JSON.parse(raw)); return; }
      } catch { /* ignore */ }
    }
    setPayload({
      r: search.r, to: search.to, link: search.link, msg: search.msg,
      audioMode: "tts", tts: search.tts, pitch: search.p, volume: search.v,
    });
  }, [search]);

  useEffect(() => {
    if (stage === "reveal" && payload) {
      QRCode.toDataURL(payload.link, { width: 240, margin: 2, color: { dark: "#000000", light: "#ffffff" } })
        .then(setQr).catch(() => setQr(""));
    }
  }, [stage, payload]);

  const handleOpen = () => {
    if (!payload) return;
    setStage("flash");
    try {
      if (payload.audioMode === "record" && payload.audioDataUrl) {
        void playRecordedWithEffects(
          payload.audioDataUrl,
          payload.recPitch ?? 1,
          payload.recVolume ?? 1,
          payload.recPreset ?? "none",
        );
      } else {
        const utter = new SpeechSynthesisUtterance(payload.tts);
        utter.pitch = Math.min(2, Math.max(0.5, payload.pitch));
        utter.volume = Math.min(1, Math.max(0, payload.volume));
        utter.rate = 1;
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utter);
      }
    } catch { /* ignore */ }
    setTimeout(() => setStage("reveal"), 2400);
  };

  if (!payload) {
    return <div className="min-h-screen flex items-center justify-center text-neon-yellow">Loading...</div>;
  }

  const { r, to, link, msg, visualUrl } = payload;

  if (stage === "intro") {
    return (
      <div className="min-h-screen tiled-stars flex items-center justify-center p-6">
        <div className="max-w-2xl w-full text-center bevel-out bg-black p-8">
          <div className="rainbow-text text-3xl md:text-5xl font-black text-shadow-neon mb-4">
            📬 HEY {to.toUpperCase()}!!! 📬
          </div>
          <p className="text-neon-cyan text-lg mb-6 blink-slow font-bold">
            YOU HAVE (1) NEW URGENT MESSAGE
          </p>
          <button onClick={handleOpen}
            className="bevel-out bg-neon-yellow text-black font-black text-2xl md:text-3xl px-6 py-6 cursor-pointer hover:bg-neon-pink shake w-full">
            🔔 CLICK TO OPEN YOUR MESSAGE
            <br />
            FROM {r.toUpperCase()} 🔔
          </button>
          <p className="text-neon-green text-xs mt-4">
            ⚠ WARNING: Contains sound. Turn up volume for maximum impact. ⚠
          </p>
        </div>
      </div>
    );
  }

  if (stage === "flash") {
    if (visualUrl) {
      const tiles = Array.from({ length: 48 });
      return (
        <div className="fixed inset-0 z-50 bg-black overflow-hidden">
          <div className="grid grid-cols-6 md:grid-cols-8 gap-1 w-full h-full">
            {tiles.map((_, i) => (
              <img
                key={i}
                src={visualUrl}
                alt=""
                className="w-full h-full object-cover shake"
                style={{ animationDelay: `${(i % 8) * 0.03}s`, animationDuration: `${0.25 + (i % 5) * 0.05}s` }}
              />
            ))}
          </div>
        </div>
      );
    }
    return (
      <div className="fixed inset-0 z-50 flash-screen flex items-center justify-center overflow-hidden">
        <div className="text-white text-6xl md:text-9xl font-black text-shadow-neon shake text-center">
          💸 PAY!!! 💸
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-4">
        <Marquee scrollamount={12} className="bg-hot-red text-neon-yellow font-black text-xl py-2 border-4 border-neon-yellow">
          🚨🚨🚨 URGENT PAYMENT REQUEST FROM {r.toUpperCase()} — DO NOT IGNORE — PAY NOW — 🚨🚨🚨
        </Marquee>

        <div className="bevel-out bg-neon-yellow text-black p-4 text-center">
          <div className="text-sm font-bold">📣 A MESSAGE FOR {to.toUpperCase()}:</div>
          <div className="text-2xl md:text-3xl font-black mt-2 rainbow-text">
            "{msg}"
          </div>
        </div>

        {visualUrl && (
          <div className="bevel-in bg-black p-2 flex justify-center">
            <img src={visualUrl} alt="" className="max-h-64" />
          </div>
        )}

        <div className="bevel-out bg-black p-6 text-center space-y-4">
          <div className="text-neon-cyan text-xl font-black blink-slow">
            💳 PAY {r.toUpperCase()} RIGHT NOW 💳
          </div>
          <a href={link.startsWith("http") ? link : `https://${link}`} target="_blank" rel="noreferrer"
            className="block bevel-out bg-neon-green text-black font-black text-lg md:text-xl p-3 break-all hover:bg-neon-pink">
            {link}
          </a>
          {qr && (
            <div className="flex flex-col items-center gap-2">
              <div className="text-neon-yellow font-bold">📱 OR SCAN WITH YOUR PDA / CELL PHONE 📱</div>
              <div className="bevel-in bg-white p-3 inline-block">
                <img src={qr} alt="Payment QR code" width={240} height={240} />
              </div>
            </div>
          )}
        </div>

        <button onClick={handleOpen}
          className="w-full bevel-out bg-neon-pink text-black font-black text-lg py-2 cursor-pointer hover:bg-neon-yellow">
          🔁 PLAY MESSAGE AGAIN
        </button>

        <footer className="text-center text-neon-yellow text-xs mt-6">
          <hr className="border-neon-pink my-3" />
          <p>Powered by PAY-UP.NET ~ Sign the guestbook! ✍️</p>
        </footer>
      </div>
    </div>
  );
}
