import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Marquee } from "@/components/Marquee";
import { playRecordedWithEffects, type RecPreset } from "@/lib/audio-effects";
import { supabase } from "@/integrations/supabase/client";
import defaultVisualAsset from "@/assets/beg_kitten.gif.asset.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Pay Back Time" },
      { name: "description", content: "Crimson Cows Red Bull Gives you Wins" },
      { property: "og:title", content: "Pay Back Time" },
      { property: "og:description", content: "Crimson Cows Red Bull Gives you Wins" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: GeneratorPage,
});

type AudioMode = "tts" | "record";
type StoredPayload = {
  r: string;
  to: string;
  link: string;
  msg: string;
  audioMode: AudioMode;
  tts: string;
  pitch: number;
  volume: number;
  audioDataUrl?: string;
  recPitch?: number;
  recVolume?: number;
  recPreset?: RecPreset;
  visualUrl?: string;
};

function GeneratorPage() {
  const navigate = useNavigate();
  const [requestor, setRequestor] = useState("Cool Dude");
  const [recipient, setRecipient] = useState("Best Friend");
  const [paymentLink, setPaymentLink] = useState("");
  const [message, setMessage] = useState("You owe me for pizza! Pay up!!!");

  const [audioMode, setAudioMode] = useState<AudioMode>("tts");
  const [ttsPhrase, setTtsPhrase] = useState("Hey! You forgot to pay me back!");
  const [pitch, setPitch] = useState(1);
  const [volume, setVolume] = useState(1);

  // Recording state
  const [recording, setRecording] = useState(false);
  const [audioDataUrl, setAudioDataUrl] = useState<string>("");
  const [recPitch, setRecPitch] = useState(1);
  const [recVolume, setRecVolume] = useState(1);
  const [recPreset, setRecPreset] = useState<RecPreset>("none");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Visual state
  const [visualUrl, setVisualUrl] = useState<string>("");

  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [generatedQr, setGeneratedQr] = useState<string>("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!generatedUrl) {
      setGeneratedQr("");
      return;
    }
    QRCode.toDataURL(generatedUrl, { width: 220, margin: 2 })
      .then(setGeneratedQr)
      .catch(() => setGeneratedQr(""));
  }, [generatedUrl]);

  const previewRecording = () => {
    if (!audioDataUrl) return;
    void playRecordedWithEffects(audioDataUrl, recPitch, recVolume, recPreset);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" });
        const reader = new FileReader();
        reader.onloadend = () => setAudioDataUrl(reader.result as string);
        reader.readAsDataURL(blob);
        stream.getTracks().forEach((t) => t.stop());
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setRecording(true);
    } catch (err) {
      alert("Could not access microphone: " + (err as Error).message);
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  const handleUpload = (file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => setVisualUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const id = "pay_" + Math.random().toString(36).slice(2, 10);
    const payload: StoredPayload = {
      r: requestor,
      to: recipient,
      link: paymentLink || "dbs.com.sg",
      msg: message,
      audioMode,
      tts: ttsPhrase,
      pitch,
      volume,
      audioDataUrl: audioMode === "record" ? audioDataUrl : undefined,
      recPitch: audioMode === "record" ? recPitch : undefined,
      recVolume: audioMode === "record" ? recVolume : undefined,
      recPreset: audioMode === "record" ? recPreset : undefined,
      visualUrl: visualUrl || undefined,
    };
    const { error } = await supabase.from("payloads").insert({ id, data: payload as never });
    setSaving(false);
    if (error) {
      alert("Failed to save your reminder to the cloud: " + error.message);
      return;
    }
    setGeneratedUrl(`${window.location.origin}/request?id=${id}`);
  };

  const openIt = () => {
    if (!generatedUrl) return;
    const url = new URL(generatedUrl);
    navigate({ to: "/request", search: Object.fromEntries(url.searchParams) as never });
  };

  const presets: { id: RecPreset; label: string }[] = [
    { id: "none", label: "🎙️ NORMAL" },
    { id: "chipmunk", label: "🐿️ CHIPMUNK" },
    { id: "monstrous", label: "👹 MONSTROUS" },
    { id: "walkie", label: "📻 WALKIE-TALKIE" },
  ];

  return (
    <div className="min-h-screen p-4 md:p-8 font-[Comic_Sans_MS]">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-6">
          <Marquee
            behavior="alternate"
            scrollamount={8}
            className="text-neon-yellow bg-black py-1 text-lg font-bold border-4 border-neon-pink"
          >
            ★彡 WELCOME TO PAYBACK TIME ~ GET YOUR MONEY BACK 彡★
          </Marquee>
          <h1 className="rainbow-text text-5xl md:text-7xl font-black mt-4 text-shadow-neon shake inline-block">
            💰 PAY UP!!! 💰
          </h1>
          <p className="text-neon-cyan text-xl mt-2 blink-slow font-bold">
            &gt;&gt;&gt; GENERATE YOUR ULTIMATE PAYMENT DEMAND &lt;&lt;&lt;
          </p>
          <div className="text-sm text-neon-yellow mt-2">
            👁 You are visitor #
            <span className="bg-black px-2 border border-neon-green text-neon-green">00013,371</span>
          </div>
        </div>

        <form onSubmit={handleGenerate} className="bevel-out bg-[#c0c0c0] p-6 space-y-4 text-black">
          <div className="bg-neon-pink text-black px-2 py-1 font-black text-xl border-2 border-black">
            ★ THE MAGIC FORM ★
          </div>

          <Field label="👤 YOUR NAME (Requestor):">
            <input
              value={requestor}
              onChange={(e) => setRequestor(e.target.value)}
              className="w-full p-2 bevel-in bg-white text-black font-mono"
              required
            />
          </Field>
          <Field label="🎯 VICTIM (Recipient's Name):">
            <input
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              className="w-full p-2 bevel-in bg-white text-black font-mono"
              required
            />
          </Field>
          <Field label="💸 PAYMENT LINK:">
            <input
              type="text"
              value={paymentLink}
              onChange={(e) => setPaymentLink(e.target.value)}
              placeholder="dbs.com.sg"
              className="w-full p-2 bevel-in bg-white text-black font-mono"
            />
          </Field>
          <Field label="📢 CUSTOM MESSAGE:">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={2}
              className="w-full p-2 bevel-in bg-white text-black font-mono"
              required
            />
          </Field>

          {/* Audio mode tabs */}
          <div className="bevel-in bg-white p-3 space-y-3">
            <div className="font-black">🔊 AUDIO METHOD:</div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setAudioMode("tts")}
                className={`flex-1 bevel-out font-bold py-2 cursor-pointer ${audioMode === "tts" ? "bg-neon-yellow" : "bg-[#c0c0c0]"}`}
              >
                🗣️ TEXT-TO-SPEECH
              </button>
              <button
                type="button"
                onClick={() => setAudioMode("record")}
                className={`flex-1 bevel-out font-bold py-2 cursor-pointer ${audioMode === "record" ? "bg-neon-yellow" : "bg-[#c0c0c0]"}`}
              >
                🎤 RECORD VOICE
              </button>
            </div>

            {audioMode === "tts" ? (
              <>
                <Field label="🗣️ TTS PHRASE:">
                  <textarea
                    value={ttsPhrase}
                    onChange={(e) => setTtsPhrase(e.target.value)}
                    rows={2}
                    className="w-full p-2 bevel-in bg-white text-black font-mono"
                  />
                </Field>
                <div className="grid md:grid-cols-2 gap-4">
                  <Field label={`🎚️ PITCH: ${pitch.toFixed(2)}`}>
                    <input
                      type="range"
                      min={0.5}
                      max={2}
                      step={0.05}
                      value={pitch}
                      onChange={(e) => setPitch(parseFloat(e.target.value))}
                      className="w-full"
                    />
                  </Field>
                  <Field label={`🔊 VOLUME: ${volume.toFixed(2)}`}>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={volume}
                      onChange={(e) => setVolume(parseFloat(e.target.value))}
                      className="w-full"
                    />
                  </Field>
                </div>
              </>
            ) : (
              <div className="space-y-3">
                <div className="flex gap-2">
                  {!recording ? (
                    <button
                      type="button"
                      onClick={startRecording}
                      className="bevel-out bg-hot-red text-white font-bold px-4 py-2 cursor-pointer"
                    >
                      ● START RECORDING
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={stopRecording}
                      className="bevel-out bg-black text-neon-yellow font-bold px-4 py-2 cursor-pointer"
                    >
                      ■ STOP
                    </button>
                  )}
                  {audioDataUrl && (
                    <button
                      type="button"
                      onClick={() => setAudioDataUrl("")}
                      className="bevel-out bg-[#c0c0c0] px-4 py-2 cursor-pointer"
                    >
                      🗑️ CLEAR
                    </button>
                  )}
                </div>

                <div>
                  <div className="text-xs font-bold mb-1">🎛️ VOICE PRESET:</div>
                  <div className="grid grid-cols-2 gap-2">
                    {presets.map((p) => (
                      <button
                        type="button"
                        key={p.id}
                        onClick={() => setRecPreset(p.id)}
                        className={`bevel-out font-bold py-2 cursor-pointer text-sm ${recPreset === p.id ? "bg-neon-yellow" : "bg-[#c0c0c0]"}`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <Field label={`🎚️ PITCH: ${recPitch.toFixed(2)}`}>
                    <input
                      type="range"
                      min={0.5}
                      max={2}
                      step={0.05}
                      value={recPitch}
                      onChange={(e) => setRecPitch(parseFloat(e.target.value))}
                      className="w-full"
                    />
                  </Field>
                  <Field label={`🔊 VOLUME: ${recVolume.toFixed(2)}`}>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={recVolume}
                      onChange={(e) => setRecVolume(parseFloat(e.target.value))}
                      className="w-full"
                    />
                  </Field>
                </div>
                {audioDataUrl && (
                  <button
                    type="button"
                    onClick={previewRecording}
                    className="bevel-out bg-neon-green text-black font-bold px-4 py-2 cursor-pointer hover:bg-neon-yellow"
                  >
                    ▶ PREVIEW WITH EFFECTS
                  </button>
                )}
                <div className="text-[10px] text-gray-600">
                  Effects apply to preview and to what the recipient hears.
                </div>
              </div>
            )}
          </div>

          {/* Visual selection */}
          <div className="bevel-in bg-white p-3 space-y-3">
            <div className="font-black">🎬 CHOOSE JUMPSCARE VISUAL:</div>

            <div>
              <div className="text-xs font-bold mb-1">📁 UPLOAD IMAGE / GIF:</div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,image/gif"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleUpload(f);
                }}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="bevel-out bg-neon-cyan text-black font-bold px-4 py-2 cursor-pointer hover:bg-neon-yellow"
              >
                📂 CHOOSE FILE...
              </button>
            </div>

            {visualUrl && (
              <div>
                <div className="text-xs font-bold mb-1">SELECTED:</div>
                <img src={visualUrl} alt="selected" className="max-h-40 border-2 border-black" />
                <button
                  type="button"
                  onClick={() => setVisualUrl("")}
                  className="bevel-out bg-[#c0c0c0] px-3 py-1 mt-1 text-xs cursor-pointer"
                >
                  🗑️ CLEAR VISUAL
                </button>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full bevel-out bg-neon-yellow text-black font-black text-2xl py-3 hover:bg-neon-pink hover:text-white cursor-pointer disabled:opacity-60"
          >
            {saving ? "☁️ SAVING TO CLOUD..." : "✨ GENERATE LINK!!! ✨"}
          </button>
        </form>

        {generatedUrl && (
          <div className="mt-6 bevel-out bg-black p-4 space-y-3">
            <div className="text-neon-green text-xl font-black blink-slow">
              ✅ LINK GENERATED! SEND IT TO YOUR FRIEND!!!
            </div>
            <div className="bevel-in bg-white text-black p-2 font-mono text-sm break-all">{generatedUrl}</div>
            {generatedQr && (
              <div className="flex flex-col items-center gap-1">
                <div className="text-neon-yellow font-bold text-sm">📱 SCAN TO SHARE</div>
                <div className="bevel-in bg-white p-2 inline-block">
                  <img src={generatedQr} alt="Generated link QR code" width={220} height={220} />
                </div>
              </div>
            )}
            <div className="text-neon-yellow text-xs">☁️ Saved to the cloud — this link works on any device.</div>
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
          <p>© 2026 Crimson Cow</p>
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
