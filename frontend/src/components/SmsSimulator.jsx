import { useState } from "react";
import { MessageSquare, PhoneCall, Send, Sparkles } from "lucide-react";
import { api } from "../services/api";
import { useLang } from "../context/LanguageContext";

export default function SmsSimulator() {
  const { t } = useLang();
  const [text, setText] = useState("Today tomato price in Nashik");
  const [thread, setThread] = useState([
    { who: "sms", text: "Welcome to FarmLink AI SMS Gateway! Text crop rates (e.g. 'Wheat rate Pune') or sell harvest ('Sell 50q wheat Nashik')." }
  ]);
  const [busy, setBusy] = useState(false);

  const send = async (msgToSend) => {
    const query = msgToSend || text;
    if (!query) return;
    setBusy(true);
    setThread((th) => [...th, { who: "you", text: query }]);
    setText("");
    try {
      const { data } = await api.post("/api/sms/webhook", { text: query });
      const reply = data.reply_text || data.sms?.body || JSON.stringify(data);
      setThread((th) => [...th, { who: "sms", text: reply }]);
    } catch (e) {
      setThread((th) => [...th, { who: "sms", text: e.response?.data?.error || e.message }]);
    } finally {
      setBusy(false);
    }
  };

  const samplePrompts = [
    "Today tomato price in Nashik",
    "Sell 50 quintals wheat in Pune grade A",
    "LIST POTATO 40 B PUNE",
    "Wheat rate today in Karnal",
  ];

  return (
    <div className="card max-w-xl mx-auto space-y-4">
      {/* Service Number Banner */}
      <div className="flex items-center justify-between rounded-2xl bg-leaf-900 text-cream-50 p-4 border border-leaf-700/40">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/10 text-harvest-400">
            <MessageSquare size={18} />
          </span>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-harvest-400">SMS Gateway Number</p>
            <p className="font-mono font-bold text-base text-cream-50">+91 9000-346-276</p>
          </div>
        </div>
        <span className="text-xs bg-harvest-400/20 text-cream-50 px-2.5 py-1 rounded-full font-semibold">
          Natural Language AI
        </span>
      </div>

      <div>
        <h2 className="font-display text-2xl font-bold text-leaf-950 flex items-center gap-2">
          <MessageSquare size={22} className="text-leaf-700" /> {t.sim.smsTitle}
        </h2>
        <p className="text-xs text-soil-900/70 mt-0.5">
          Natural language SMS assistant. Inquire mandi rates or list produce without rigid templates.
        </p>
      </div>

      {/* Chat conversation */}
      <div className="h-72 overflow-y-auto rounded-2xl bg-cream-50 p-4 space-y-3 border border-leaf-900/10">
        {thread.map((m, i) => (
          <div key={i} className={m.who === "you" ? "text-right" : "text-left"}>
            <span
              className={`inline-block max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs font-medium leading-relaxed ${
                m.who === "you"
                  ? "bg-leaf-900 text-white shadow-sm"
                  : "bg-white text-soil-950 border border-leaf-900/10 shadow-sm"
              }`}
            >
              {m.text}
            </span>
          </div>
        ))}
      </div>

      {/* Quick suggestions */}
      <div>
        <p className="text-[11px] font-bold text-soil-900/60 uppercase tracking-wider mb-1.5 flex items-center gap-1">
          <Sparkles size={12} className="text-harvest-500" /> Click to test queries:
        </p>
        <div className="flex flex-wrap gap-1.5">
          {samplePrompts.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => {
                setText(p);
                send(p);
              }}
              className="rounded-lg bg-white px-2.5 py-1 text-[11px] text-soil-900 border border-leaf-900/10 hover:bg-leaf-100 hover:text-leaf-900 transition"
            >
              "{p}"
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <input
          className="field text-sm"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="e.g. Rate for cotton today or Sell 30q potato"
          onKeyDown={(e) => e.key === "Enter" && send()}
        />
        <button className="btn-primary shrink-0" disabled={busy || !text} onClick={() => send()}>
          <Send size={16} /> {t.sim.send}
        </button>
      </div>
    </div>
  );
}
