import { useEffect, useRef, useState } from "react";
import {
  Phone,
  PhoneCall,
  Mic,
  Volume2,
} from "lucide-react";
import { api } from "../services/api";
import { useLang } from "../context/LanguageContext";

export default function VoiceSimulator() {
  const { t, lang } = useLang();

  const [log, setLog] = useState([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);

  const recognitionRef = useRef(null);

  const targetLang =
    lang === "hi"
      ? "hi-IN"
      : lang === "mr"
      ? "mr-IN"
      : "en-IN";

  const speak = (message) => {
    if (
      !message ||
      typeof window === "undefined" ||
      !window.speechSynthesis
    ) {
      return;
    }

    const synth = window.speechSynthesis;

    const speakNow = () => {
      const voices = synth.getVoices();

      const exactVoice = voices.find(
        (voice) =>
          voice.lang?.toLowerCase() ===
          targetLang.toLowerCase()
      );

      const regionalVoice = voices.find((voice) =>
        voice.lang
          ?.toLowerCase()
          .startsWith(
            targetLang.slice(0, 2).toLowerCase()
          )
      );

      const indianEnglishVoice =
        voices.find((voice) =>
          voice.lang
            ?.toLowerCase()
            .startsWith("en-in")
        );

      const voice =
        exactVoice ||
        regionalVoice ||
        indianEnglishVoice ||
        voices[0];

      const utterance =
        new SpeechSynthesisUtterance(message);

      utterance.lang = targetLang;
      utterance.rate = 0.95;
      utterance.pitch = 1;

      if (voice) {
        utterance.voice = voice;
      }

      synth.cancel();
      synth.speak(utterance);
    };

    const voices = synth.getVoices();

    if (voices.length > 0) {
      speakNow();
      return;
    }

    const handleVoicesChanged = () => {
      synth.removeEventListener(
        "voiceschanged",
        handleVoicesChanged
      );
      speakNow();
    };

    synth.addEventListener(
      "voiceschanged",
      handleVoicesChanged
    );
  };

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Recognition may already be stopped.
        }
      }

      if (
        typeof window !== "undefined" &&
        window.speechSynthesis
      ) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const send = async (
    utterance = "",
    reset = false
  ) => {
    if (busy) return;

    const cleanUtterance = String(
      utterance || ""
    ).trim();

    setBusy(true);

    try {
      const { data } = await api.post(
        "/api/voice/ingest",
        {
          utterance: cleanUtterance,
          language: lang,
          reset,
        }
      );

      const reply =
        data?.reply ||
        data?.message ||
        "";

      setLog((previous) => [
        ...previous,
        ...(cleanUtterance && !reset
          ? [
              {
                who: "you",
                text: cleanUtterance,
              },
            ]
          : []),
        ...(reply
          ? [
              {
                who: "ivr",
                text: reply,
              },
            ]
          : []),
      ]);

      if (reply) {
        speak(reply);
      }

      setText("");
    } catch (e) {
      const errorText =
        e.response?.data?.error ||
        e.response?.data?.message ||
        e.message ||
        (lang === "hi"
          ? "वॉइस सेवा से उत्तर नहीं मिला। कृपया फिर प्रयास करें।"
          : lang === "mr"
          ? "व्हॉइस सेवेकडून उत्तर मिळाले नाही. कृपया पुन्हा प्रयत्न करा."
          : "The voice service did not respond. Please try again.");

      setLog((previous) => [
        ...previous,
        {
          who: "ivr",
          text: errorText,
        },
      ]);

      speak(errorText);
    } finally {
      setBusy(false);
    }
  };

  const startCall = async () => {
    if (busy) return;

    setLog([]);
    setText("");

    await send("", true);
  };

  const listen = () => {
    if (busy || listening) return;

    const Recognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    if (!Recognition) {
      const message =
        lang === "hi"
          ? "इस ब्राउज़र में माइक्रोफोन पहचान उपलब्ध नहीं है। कृपया अपना संदेश टाइप करें।"
          : lang === "mr"
          ? "या ब्राउझरमध्ये मायक्रोफोन ओळख उपलब्ध नाही. कृपया तुमचा संदेश टाइप करा."
          : "Microphone recognition is not supported in this browser. Please type your message.";

      setLog((previous) => [
        ...previous,
        {
          who: "ivr",
          text: message,
        },
      ]);

      return;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // Ignore if already stopped.
      }
    }

    const recognition = new Recognition();

    recognition.lang = targetLang;
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognitionRef.current = recognition;
    setListening(true);

    recognition.onresult = (event) => {
      const transcript =
        event.results?.[0]?.[0]?.transcript?.trim();

      setListening(false);

      if (!transcript) {
        return;
      }

      setText(transcript);
      send(transcript, false);
    };

    recognition.onerror = (event) => {
      setListening(false);

      if (event.error === "aborted") {
        return;
      }

      const message =
        event.error === "not-allowed"
          ? lang === "hi"
            ? "माइक्रोफोन की अनुमति नहीं मिली। कृपया ब्राउज़र में माइक्रोफोन की अनुमति दें।"
            : lang === "mr"
            ? "मायक्रोफोनची परवानगी मिळाली नाही. कृपया ब्राउझरमध्ये मायक्रोफोनला परवानगी द्या."
            : "Microphone permission was not granted. Please allow microphone access in your browser."
          : lang === "hi"
          ? "आवाज़ पहचान में समस्या हुई। कृपया फिर प्रयास करें।"
          : lang === "mr"
          ? "आवाज ओळखण्यात समस्या आली. कृपया पुन्हा प्रयत्न करा."
          : "Voice recognition failed. Please try again.";

      setLog((previous) => [
        ...previous,
        {
          who: "ivr",
          text: message,
        },
      ]);
    };

    recognition.onend = () => {
      setListening(false);
      recognitionRef.current = null;
    };

    try {
      recognition.start();
    } catch (e) {
      setListening(false);
      recognitionRef.current = null;
    }
  };

  const sendTypedMessage = () => {
    const cleanText = text.trim();

    if (!cleanText || busy) return;

    send(cleanText, false);
  };

  const startCallLabel = busy
    ? t.sim?.connecting || "Connecting..."
    : t.sim?.call || "Start Call";

  const microphoneLabel = listening
    ? lang === "hi"
      ? "सुन रहा है..."
      : lang === "mr"
      ? "ऐकत आहे..."
      : "Listening..."
    : t.sim?.microphone ||
      "Speak via Microphone";

  return (
    <div className="card mx-auto max-w-xl space-y-4">
      {/* Service number */}
      <div className="flex items-center justify-between rounded-2xl border border-leaf-700/40 bg-leaf-900 p-4 text-cream-50">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/10 text-harvest-400">
            <PhoneCall size={18} />
          </span>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-harvest-400">
              {t.sim?.voiceHelpline ||
                "Voice Helpline"}
            </p>

            <p className="font-mono text-base font-bold text-cream-50">
              +91 XXXXX XXXXX
            </p>
          </div>
        </div>

        <span className="rounded-full bg-harvest-400/20 px-2.5 py-1 text-xs font-semibold text-cream-50">
          {t.sim?.languages ||
            "Hindi · Marathi · English"}
        </span>
      </div>

      {/* Heading */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-display text-2xl font-bold text-leaf-950">
            <Phone
              size={22}
              className="text-leaf-700"
            />

            {t.sim?.voiceTitle ||
              "IVR Voice Assistant"}
          </h2>

          <p className="mt-0.5 text-xs text-soil-900/70">
            {t.sim?.voiceSubtitle ||
              "AI voice assistant for farmers."}
          </p>
        </div>

        <button
          type="button"
          className="btn-ghost shrink-0 !px-3 !py-1.5 text-xs"
          disabled={busy}
          onClick={startCall}
        >
          <PhoneCall size={14} />

          {startCallLabel}
        </button>
      </div>

      {/* Conversation */}
      <div className="h-72 space-y-3 overflow-y-auto rounded-2xl bg-leaf-950 p-4 text-cream-50">
        {log.length === 0 && (
          <div className="flex h-full items-center justify-center p-4 text-center text-xs text-cream-100/50">
            {t.sim?.startCallHint ||
              "Click Start Call to connect with the FarmLink AI voice assistant."}
          </div>
        )}

        {log.map((message, index) => (
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
                  ? "bg-leaf-700 text-white shadow-sm"
                  : "border border-white/10 bg-white/10 text-cream-50"
              }`}
            >
              {message.text}
            </span>
          </div>
        ))}

        {busy && (
          <div className="text-left">
            <span className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-3.5 py-2.5 text-xs text-cream-100/70">
              <Volume2 size={14} />
              {lang === "hi"
                ? "एआई जवाब दे रहा है..."
                : lang === "mr"
                ? "एआय उत्तर देत आहे..."
                : "AI is responding..."}
            </span>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <input
            className="field text-sm"
            value={text}
            onChange={(e) =>
              setText(e.target.value)
            }
            placeholder={
              t.sim?.typeUtterance ||
              "Type what you would say..."
            }
            disabled={busy || listening}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                sendTypedMessage();
              }
            }}
          />

          <button
            type="button"
            className="btn-primary shrink-0"
            disabled={
              busy ||
              listening ||
              !text.trim()
            }
            onClick={sendTypedMessage}
          >
            {busy
              ? t.sim?.connecting ||
                "Connecting..."
              : t.sim?.send || "Send"}
          </button>
        </div>

        {/* Microphone */}
        <div className="flex items-center justify-between pt-1 text-xs">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 font-semibold text-leaf-700 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
            onClick={listen}
            disabled={busy || listening}
          >
            <Mic size={14} />

            {microphoneLabel}
          </button>

          <span className="text-soil-900/50">
            {t.sim?.audioAuto ||
              "Audio synthesis plays automatically"}
          </span>
        </div>
      </div>
    </div>
  );
}
