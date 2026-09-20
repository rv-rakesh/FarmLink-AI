import { useEffect, useMemo, useState } from "react";
import {
  MessageSquare,
  Send,
  Sparkles,
} from "lucide-react";
import { api } from "../services/api";
import { useLang } from "../context/LanguageContext";

export default function SmsSimulator() {
  const { t, lang } = useLang();

  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const welcomeMessage = useMemo(() => {
    if (lang === "hi") {
      return "फार्मलिंक एआई एसएमएस सेवा में आपका स्वागत है। मंडी भाव पूछें या अपनी फसल बेचने के लिए संदेश भेजें।";
    }

    if (lang === "mr") {
      return "फार्मलिंक एआय एसएमएस सेवेत आपले स्वागत आहे. मंडी दर विचारा किंवा तुमचे पीक विकण्यासाठी संदेश पाठवा.";
    }

    return "Welcome to FarmLink AI SMS Gateway! Ask for crop rates or send a message to list your harvest.";
  }, [lang]);

  const samplePrompts = useMemo(() => {
    if (lang === "hi") {
      return [
        "आज नाशिक में टमाटर का भाव",
        "पुणे में 50 क्विंटल गेहूं ग्रेड A बेचना है",
        "नाशिक में आलू का आज का भाव",
        "करनाल में आज गेहूं का भाव",
      ];
    }

    if (lang === "mr") {
      return [
        "आज नाशिकमध्ये टोमॅटोचा भाव",
        "पुण्यात 50 क्विंटल गहू ग्रेड A विकायचा आहे",
        "नाशिकमध्ये आज बटाट्याचा भाव",
        "करनालमध्ये आज गव्हाचा भाव",
      ];
    }

    return [
      "Today tomato price in Nashik",
      "Sell 50 quintals wheat in Pune grade A",
      "Today potato price in Nashik",
      "Wheat rate today in Karnal",
    ];
  }, [lang]);

  const placeholder = useMemo(() => {
    if (lang === "hi") {
      return "जैसे: आज कपास का भाव या 30 क्विंटल आलू बेचना है";
    }

    if (lang === "mr") {
      return "उदा.: आज कापसाचा भाव किंवा 30 क्विंटल बटाटा विकायचा आहे";
    }

    return "e.g. Cotton rate today or Sell 30q potato";
  }, [lang]);

  const quickTestLabel =
    lang === "hi"
      ? "जल्दी जांच के लिए संदेश चुनें:"
      : lang === "mr"
      ? "जलद चाचणीसाठी संदेश निवडा:"
      : "Click to test queries:";

  const naturalLanguageLabel =
    lang === "hi"
      ? "नेचुरल लैंग्वेज एआई"
      : lang === "mr"
      ? "नैसर्गिक भाषा एआय"
      : "Natural Language AI";

  const serviceLabel =
    lang === "en"
      ? "SMS HELPLINE"
      : "एसएमएस हेल्पलाइन";

  const chatThinking =
    lang === "hi"
      ? "एआई जवाब तैयार कर रहा है..."
      : lang === "mr"
      ? "एआय उत्तर तयार करत आहे..."
      : "AI is preparing a reply...";

  const errorMessage =
    lang === "hi"
      ? "एसएमएस सेवा से उत्तर नहीं मिला। कृपया फिर प्रयास करें।"
      : lang === "mr"
      ? "एसएमएस सेवेकडून उत्तर मिळाले नाही. कृपया पुन्हा प्रयत्न करा."
      : "The SMS service did not respond. Please try again.";

  const naturalLanguageHint =
    lang === "hi"
      ? "प्राकृतिक भाषा में मंडी भाव पूछें या अपनी फसल की लिस्टिंग भेजें।"
      : lang === "mr"
      ? "नैसर्गिक भाषेत मंडी दर विचारा किंवा तुमच्या पिकाची लिस्टिंग पाठवा."
      : "Use natural language to ask mandi rates or list your harvest.";

  const [thread, setThread] = useState([
    {
      who: "sms",
      text: welcomeMessage,
    },
  ]);

  useEffect(() => {
    setThread((previous) => {
      // Update only the initial welcome message.
      // Do not overwrite an active conversation.
      if (
        previous.length === 1 &&
        previous[0].who === "sms"
      ) {
        return [
          {
            who: "sms",
            text: welcomeMessage,
          },
        ];
      }

      return previous;
    });
  }, [welcomeMessage]);

  const send = async (msgToSend) => {
    if (busy) return;

    const query = (msgToSend ?? text).trim();

    if (!query) return;

    setBusy(true);

    setThread((previous) => [
      ...previous,
      {
        who: "you",
        text: query,
      },
    ]);

    setText("");

    try {
      const { data } = await api.post(
        "/api/sms/webhook",
        {
          text: query,
          lang,
        }
      );

      const reply =
        data.reply_text ||
        data.sms?.body ||
        JSON.stringify(data);

      setThread((previous) => [
        ...previous,
        {
          who: "sms",
          text: reply,
        },
      ]);
    } catch (e) {
      setThread((previous) => [
        ...previous,
        {
          who: "sms",
          text:
            e.response?.data?.error ||
            e.message ||
            errorMessage,
        },
      ]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card mx-auto max-w-xl space-y-4">
      {/* Service banner */}
      <div className="flex items-center justify-between rounded-2xl border border-leaf-700/40 bg-leaf-900 p-4 text-cream-50">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/10 text-harvest-400">
            <MessageSquare size={18} />
          </span>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-harvest-400">
              {serviceLabel}
            </p>

            <p className="font-mono text-base font-bold text-cream-50">
              +91 XXXXX XXXXX
            </p>
          </div>
        </div>

        <span className="rounded-full bg-harvest-400/20 px-2.5 py-1 text-xs font-semibold text-cream-50">
          {naturalLanguageLabel}
        </span>
      </div>

      {/* Title */}
      <div>
        <h2 className="flex items-center gap-2 font-display text-2xl font-bold text-leaf-950">
          <MessageSquare
            size={22}
            className="text-leaf-700"
          />
          {t.sim?.smsTitle || "SMS Command Tester"}
        </h2>

        <p className="mt-0.5 text-xs text-soil-900/70">
          {naturalLanguageHint}
        </p>
      </div>

      {/* Conversation */}
      <div className="h-72 space-y-3 overflow-y-auto rounded-2xl border border-leaf-900/10 bg-cream-50 p-4">
        {thread.map((message, index) => (
          <div
            key={`${message.who}-${index}`}
            className={
              message.who === "you"
                ? "text-right"
                : "text-left"
            }
          >
            <span
              className={`inline-block max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs font-medium leading-relaxed ${
                message.who === "you"
                  ? "bg-leaf-900 text-white shadow-sm"
                  : "border border-leaf-900/10 bg-white text-soil-950 shadow-sm"
              }`}
            >
              {message.text}
            </span>
          </div>
        ))}

        {busy && (
          <div className="text-left">
            <span className="inline-block rounded-2xl border border-leaf-900/10 bg-white px-3.5 py-2.5 text-xs font-medium text-soil-900/60">
              {chatThinking}
            </span>
          </div>
        )}
      </div>

      {/* Quick suggestions */}
      <div>
        <p className="mb-1.5 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-soil-900/60">
          <Sparkles
            size={12}
            className="text-harvest-500"
          />
          {quickTestLabel}
        </p>

        <div className="flex flex-wrap gap-1.5">
          {samplePrompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              disabled={busy}
              onClick={() => send(prompt)}
              className="rounded-lg border border-leaf-900/10 bg-white px-2.5 py-1 text-[11px] text-soil-900 transition hover:bg-leaf-100 hover:text-leaf-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              "{prompt}"
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
          placeholder={placeholder}
          disabled={busy}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              send();
            }
          }}
        />

        <button
          type="button"
          className="btn-primary shrink-0"
          disabled={busy || !text.trim()}
          onClick={() => send()}
        >
          <Send size={16} />

          {busy
            ? t.sim?.connecting || "Connecting..."
            : t.sim?.send || "Send"}
        </button>
      </div>
    </div>
  );
}
