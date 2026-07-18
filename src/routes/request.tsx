import { createFileRoute } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Marquee } from "@/components/Marquee";
import { playRecordedWithEffects, type RecPreset } from "@/lib/audio-effects";
import { supabase } from "@/integrations/supabase/client";

const searchSchema = z.object({
  id: fallback(z.string(), "").default(""),
  r: fallback(z.string(), "Someone").default("Someone"),
  to: fallback(z.string(), "You").default("You"),
  link: fallback(z.string(), "https://www.dbs.com.sg/personal/mobile/paylink/index.html?tranRef=Wj0kQIlFdc").default(
    "https://www.dbs.com.sg/personal/mobile/paylink/index.html?tranRef=Wj0kQIlFdc",
  ),
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
type Payload = {
  r: string;
  to: string;
  link: string;
  msg: string;
  audioMode: "tts" | "record";
  tts: string;
  pitch: number;
  volume: number;
  audioDataUrl?: string;
  recPitch?: number;
  recVolume?: number;
  recPreset?: RecPreset;
  visualUrl?: string;
};

function RequestPage() {
  const search = Route.useSearch();
  const [payload, setPayload] = useState<Payload | null>(null);
  const [stage, setStage] = useState<Stage>("intro");
  const [qr, setQr] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (search.id) {
        const { data } = await supabase.from("payloads").select("data").eq("id", search.id).maybeSingle();
        if (!cancelled && data?.data) {
          setPayload(data.data as Payload);
          return;
        }
        if (typeof window !== "undefined") {
          try {
            const raw = localStorage.getItem(search.id);
            if (raw) {
              if (!cancelled) setPayload(JSON.parse(raw));
              return;
            }
          } catch {
            /* ignore */
          }
        }
      }
      if (!cancelled)
        setPayload({
          r: search.r,
          to: search.to,
          link: search.link,
          msg: search.msg,
          audioMode: "tts",
          tts: search.tts,
          pitch: search.p,
          volume: search.v,
        });
    })();
    return () => {
      cancelled = true;
    };
  }, [search]);

  useEffect(() => {
    if (stage === "reveal" && payload) {
      QRCode.toDataURL(payload.link, { width: 240, margin: 2, color: { dark: "#000000", light: "#ffffff" } })
        .then(setQr)
        .catch(() => setQr(""));
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
    } catch {
      /* ignore */
    }
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
          <p className="text-neon-cyan text-lg mb-6 blink-slow font-bold">YOU HAVE (1) NEW URGENT MESSAGE</p>
          <button
            onClick={handleOpen}
            className="bevel-out bg-neon-yellow text-black font-black text-2xl md:text-3xl px-6 py-6 cursor-pointer hover:bg-neon-pink shake w-full"
          >
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
        <Marquee
          scrollamount={12}
          className="bg-hot-red text-neon-yellow font-black text-xl py-2 border-4 border-neon-yellow"
        >
          🚨🚨🚨 URGENT PAYMENT REQUEST FROM {r.toUpperCase()} — DO NOT IGNORE — PAY NOW — 🚨🚨🚨
        </Marquee>

        <div className="bevel-out bg-neon-yellow text-black p-4 text-center">
          <div className="text-sm font-bold">📣 A MESSAGE FOR {to.toUpperCase()}:</div>
          <div className="text-2xl md:text-3xl font-black mt-2 rainbow-text">"{msg}"</div>
        </div>

        <div className="bevel-out bg-black p-6 text-center space-y-4">
          <div className="text-neon-cyan text-xl font-black blink-slow">💳 PAY {r.toUpperCase()} RIGHT NOW 💳</div>
          <a
            href={link.startsWith("http") ? link : `https://${link}`}
            target="_blank"
            rel="noreferrer"
            className="block bevel-out bg-neon-green text-black font-black text-lg md:text-xl p-3 break-all hover:bg-neon-pink"
          >
            {link}
          </a>
          {qr && (
            <div className="flex flex-col items-center gap-2">
              <div className="text-neon-yellow font-bold">📱 OR SCAN WITH YOUR PHONE 📱</div>
              <div className="bevel-in bg-white p-3 inline-block">
                <img src={qr} alt="Payment QR code" width={240} height={240} />
              </div>
            </div>
          )}
        </div>

        <button
          onClick={handleOpen}
          className="w-full bevel-out bg-neon-pink text-black font-black text-lg py-2 cursor-pointer hover:bg-neon-yellow"
        >
          🔁 PLAY MESSAGE AGAIN
        </button>

        <footer className="text-center text-neon-yellow text-xs mt-6">
          <hr className="border-neon-pink my-3" />
          <p>Crimson Cow</p>
        </footer>
      </div>
    </div>
  );
}
