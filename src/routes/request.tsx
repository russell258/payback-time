import { createFileRoute } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Marquee } from "@/components/Marquee";

const searchSchema = z.object({
  r: fallback(z.string(), "Someone").default("Someone"),
  to: fallback(z.string(), "You").default("You"),
  link: fallback(z.string(), "https://example.com").default("https://example.com"),
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

function RequestPage() {
  const { r, to, link, msg, tts, p, v } = Route.useSearch();
  const [stage, setStage] = useState<Stage>("intro");
  const [qr, setQr] = useState<string>("");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (stage === "reveal") {
      QRCode.toDataURL(link, { width: 240, margin: 2, color: { dark: "#000000", light: "#ffffff" } })
        .then(setQr)
        .catch(() => setQr(""));
    }
  }, [stage, link]);

  const handleOpen = () => {
    setStage("flash");
    // Speak
    try {
      const utter = new SpeechSynthesisUtterance(tts);
      utter.pitch = Math.min(2, Math.max(0.5, p));
      utter.volume = Math.min(1, Math.max(0, v));
      utter.rate = 1;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utter);
    } catch { /* ignore */ }
    // Move to reveal after flash
    setTimeout(() => setStage("reveal"), 1600);
  };

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
    return (
      <div className="min-h-screen flash-screen flex items-center justify-center">
        <div className="text-white text-6xl md:text-9xl font-black text-shadow-neon shake text-center">
          💸 PAY!!! 💸
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-4">
        <marquee scrollamount="12" className="bg-hot-red text-neon-yellow font-black text-xl py-2 border-4 border-neon-yellow">
          🚨🚨🚨 URGENT PAYMENT REQUEST FROM {r.toUpperCase()} — DO NOT IGNORE — PAY NOW — 🚨🚨🚨
        </marquee>

        <div className="bevel-out bg-neon-yellow text-black p-4 text-center">
          <div className="text-sm font-bold">📣 A MESSAGE FOR {to.toUpperCase()}:</div>
          <div className="text-2xl md:text-3xl font-black mt-2 rainbow-text">
            "{msg}"
          </div>
        </div>

        <div className="bevel-out bg-black p-6 text-center space-y-4">
          <div className="text-neon-cyan text-xl font-black blink-slow">
            💳 PAY {r.toUpperCase()} RIGHT NOW 💳
          </div>
          <a
            href={link}
            target="_blank"
            rel="noreferrer"
            className="block bevel-out bg-neon-green text-black font-black text-lg md:text-xl p-3 break-all hover:bg-neon-pink"
          >
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
          <canvas ref={canvasRef} className="hidden" />
        </div>

        <button
          onClick={handleOpen}
          className="w-full bevel-out bg-neon-pink text-black font-black text-lg py-2 cursor-pointer hover:bg-neon-yellow"
        >
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
