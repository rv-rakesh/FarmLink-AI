import { useState } from "react";
import { Phone, PhoneCall, Mic, Volume2 } from "lucide-react";
import { api } from "../services/api";
import { useLang } from "../context/LanguageContext";

export default function VoiceSimulator() {
  const { t, lang } = useLang();
  const [log, setLog] = useState([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const speak = (msg) => {
    if (!window.speechSynthesis) return;
    const u = new SpeechSynthesisUtterance(msg);
    u.lang = lang === "hi" ? "hi-IN" : lang === "mr" ? "mr-IN" : "en-IN";
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  };

  const send = async (utterance, reset = false) => {
    setBusy(true);
    try {
      const { data } = await api.post("/api/voice/ingest", { utterance, language: lang, reset });
      const reply = data.reply;
      setLog((l) => [
        ...l,
        ...(utterance && !reset ? [{ who: "you", text: utterance }] : []),
        { who: "ivr", text: reply },
      ]);
      if (reply) speak(reply);
      setText("");
    } catch (e) {
      setLog((l) => [...l, { who: "ivr", text: e.response?.data?.error || e.message }]);
    } finally {
      setBusy(false);
    }
  };

  const listen = () => {
    const Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Rec) {
      alert("Microphone recognition not supported in this browser. Please type your message.");
      return;
    }
    const r = new Rec();
    r.lang = lang === "hi" ? "hi-IN" : lang === "mr" ? "mr-IN" : "en-IN";
    r.onresult = (ev) => {
      const said = ev.results[0][0].transcript;
      setText(said);
      send(said);
    };
    r.start();
  };

  return (
    <div className="card max-w-xl mx-auto space-y-4">
      {/* Service Number Banner */}
      <div className="flex items-center justify-between rounded-2xl bg-leaf-900 text-cream-50 p-4 border border-leaf-700/40">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/10 text-harvest-400">
            <PhoneCall size={18} />
          </span>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-harvest-400">Toll-Free Voice Helpline</p>
            <p className="font-mono font-bold text-base text-cream-50">+91 XXXXX XXXXX</p>
          </div>
        </div>
        <span className="text-xs bg-harvest-400/20 text-cream-50 px-2.5 py-1 rounded-full font-semibold">
          Hindi · Marathi · English
        </span>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold text-leaf-950 flex items-center gap-2">
            <Phone size={22} className="text-leaf-700" /> {t.sim.voiceTitle}
          </h2>
          <p className="text-xs text-soil-900/70 mt-0.5">
            AI voice assistant for farmers without internet or smartphones.
          </p>
        </div>
        <button
  type="button"
  className="btn-ghost !py-1.5 !px-3 text-xs"
  disabled={busy}
  onClick={() => send("", true)}
>
  {busy ? "Connecting..." : t.sim.call}
</button>
      </div>

      <div className="h-72 overflow-y-auto rounded-2xl bg-leaf-950 p-4 text-cream-50 space-y-3">
        {log.length === 0 && (
          <div className="h-full flex items-center justify-center text-center text-xs text-cream-100/50 p-4">
            Click 'Start Call' to connect with the FarmLink AI conversational voice assistant.
          </div>
        )}
        {log.map((m, i) => (
          <div key={i} className={m.who === "you" ? "text-right" : "text-left"}>
            <span
              className={`inline-block max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs font-medium leading-relaxed ${
                m.who === "you" ? "bg-leaf-700 text-white shadow-sm" : "bg-white/10 text-cream-50 border border-white/10"
              }`}
            >
              {m.text}
            </span>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <div className="flex gap-2">
          <input
            className="field text-sm"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type speech utterance (e.g. Wheat, 50 quintals, Grade A, Nashik)"
            onKeyDown={(e) => e.key === "Enter" && text && send(text)}
          />
          <button className="btn-primary shrink-0" disabled={busy || !text} onClick={() => send(text)}>
            {t.sim.send}
          </button>
        </div>

        <div className="flex items-center justify-between text-xs pt-1">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 font-semibold text-leaf-700 hover:underline"
            onClick={listen}
          >
            <Mic size={14} /> Speak via Microphone (Speech-to-Text)
          </button>
          <span className="text-soil-900/50">Audio synthesis plays automatically</span>
        </div>
      </div>
    </div>
  );
}
