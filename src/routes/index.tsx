import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PAY UP!!! ~ Retro Payment Reminder Generator ~" },
      { name: "description", content: "Create over-the-top 90s-style payment reminders with talking messages, flashing screens and QR codes." },
      { property: "og:title", content: "PAY UP!!! Retro Payment Reminder" },
      { property: "og:description", content: "Generate a GeoCities-style payment demand your friends can't ignore." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: GeneratorPage,
});

function GeneratorPage() {
  const navigate = useNavigate();
  const [requestor, setRequestor] = useState("Cool Dude");
  const [recipient, setRecipient] = useState("Best Friend");
  const [paymentLink, setPaymentLink] = useState("https://venmo.com/u/example");
  const [message, setMessage] = useState("You owe me for pizza! Pay up!!!");
  const [ttsPhrase, setTtsPhrase] = useState("Hey! You forgot to pay me back!");
  const [pitch, setPitch] = useState(1);
  const [volume, setVolume] = useState(1);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams({
      r: requestor,
      to: recipient,
      link: paymentLink,
      msg: message,
      tts: ttsPhrase,
      p: String(pitch),
      v: String(volume),
    });
    const path = `/request?${params.toString()}`;
    const full = `${window.location.origin}${path}`;
    setGeneratedUrl(full);
  };

  const openIt = () => {
    if (!generatedUrl) return;
    const url = new URL(generatedUrl);
    navigate({ to: "/request", search: Object.fromEntries(url.searchParams) as never });
  };

  return (
    <div className="min-h-screen p-4 md:p-8 font-[Comic_Sans_MS]">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-6">
          <marquee behavior="alternate" scrollamount="8" className="text-neon-yellow bg-black py-1 text-lg font-bold border-4 border-neon-pink">
            ★彡 WELCOME TO PAY-UP.NET ~ THE #1 PAYMENT REMINDER ON THE WORLD WIDE WEB ~ EST. 1999 彡★
          </marquee>
          <h1 className="rainbow-text text-5xl md:text-7xl font-black mt-4 text-shadow-neon shake inline-block">
            💰 PAY UP!!! 💰
          </h1>
          <p className="text-neon-cyan text-xl mt-2 blink-slow font-bold">
            &gt;&gt;&gt; GENERATE YOUR ULTIMATE PAYMENT DEMAND &lt;&lt;&lt;
          </p>
          <div className="text-sm text-neon-yellow mt-2">
            👁 You are visitor #<span className="bg-black px-2 border border-neon-green text-neon-green">00013,371</span>
          </div>
        </div>

        <form
          onSubmit={handleGenerate}
          className="bevel-out bg-[#c0c0c0] p-6 space-y-4 text-black"
        >
          <div className="bg-neon-pink text-black px-2 py-1 font-black text-xl border-2 border-black">
            ★ THE MAGIC FORM ★
          </div>

          <Field label="👤 YOUR NAME (Requestor):">
            <input value={requestor} onChange={e => setRequestor(e.target.value)} className="w-full p-2 bevel-in bg-white text-black font-mono" required />
          </Field>
          <Field label="🎯 VICTIM (Recipient's Name):">
            <input value={recipient} onChange={e => setRecipient(e.target.value)} className="w-full p-2 bevel-in bg-white text-black font-mono" required />
          </Field>
          <Field label="💸 PAYMENT LINK (Venmo/PayPal/URL):">
            <input type="url" value={paymentLink} onChange={e => setPaymentLink(e.target.value)} className="w-full p-2 bevel-in bg-white text-black font-mono" required />
          </Field>
          <Field label="📢 CUSTOM MESSAGE:">
            <textarea value={message} onChange={e => setMessage(e.target.value)} rows={2} className="w-full p-2 bevel-in bg-white text-black font-mono" required />
          </Field>
          <Field label="🗣️ TEXT-TO-SPEECH PHRASE:">
            <textarea value={ttsPhrase} onChange={e => setTtsPhrase(e.target.value)} rows={2} className="w-full p-2 bevel-in bg-white text-black font-mono" required />
          </Field>

          <div className="grid md:grid-cols-2 gap-4">
            <Field label={`🎚️ PITCH: ${pitch.toFixed(2)}`}>
              <input type="range" min={0.5} max={2} step={0.05} value={pitch} onChange={e => setPitch(parseFloat(e.target.value))} className="w-full" />
            </Field>
            <Field label={`🔊 VOLUME: ${volume.toFixed(2)}`}>
              <input type="range" min={0} max={1} step={0.05} value={volume} onChange={e => setVolume(parseFloat(e.target.value))} className="w-full" />
            </Field>
          </div>

          <button
            type="submit"
            className="w-full bevel-out bg-neon-yellow text-black font-black text-2xl py-3 hover:bg-neon-pink hover:text-white cursor-pointer"
          >
            ✨ GENERATE LINK!!! ✨
          </button>
        </form>

        {generatedUrl && (
          <div className="mt-6 bevel-out bg-black p-4 space-y-3">
            <div className="text-neon-green text-xl font-black blink-slow">
              ✅ LINK GENERATED! SEND IT TO YOUR FRIEND!!!
            </div>
            <div className="bevel-in bg-white text-black p-2 font-mono text-sm break-all">
              {generatedUrl}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => navigator.clipboard.writeText(generatedUrl)}
                className="bevel-out bg-neon-cyan text-black font-bold px-4 py-2 cursor-pointer hover:bg-neon-yellow"
              >
                📋 COPY LINK
              </button>
              <button
                onClick={openIt}
                className="bevel-out bg-neon-pink text-black font-bold px-4 py-2 cursor-pointer hover:bg-neon-yellow"
              >
                👀 PREVIEW IT
              </button>
            </div>
          </div>
        )}

        <footer className="text-center mt-8 text-neon-yellow text-xs">
          <hr className="border-neon-pink my-4" />
          <p>© 1999 PAY-UP.NET ~ Best viewed in Netscape Navigator 4.0 @ 800×600 ~</p>
          <p className="mt-1">🚧 THIS SITE IS UNDER CONSTRUCTION 🚧</p>
        </footer>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block font-black text-black mb-1">{label}</span>
      {children}
    </label>
  );
}
