import { useState } from "react";
import VoiceSimulator from "../components/VoiceSimulator";
import { useAuth } from "../context/AuthContext";
import { useLang } from "../context/LanguageContext";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function VoiceCallPage() {
  const { user, login } = useAuth();
  const { t } = useLang();
  const nav = useNavigate();

  const [busy, setBusy] = useState(false);

  const handleDemoLogin = async () => {
    if (busy) return;

    setBusy(true);

    try {
      await login({
        role: "farmer",
        phone: "9876540001",
        password: "Farm@123",
      });
    } catch (e) {
      nav("/login?role=farmer");
    } finally {
      setBusy(false);
    }
  };

  if (!user || user.role !== "farmer") {
    return (
      <div className="mx-auto max-w-md space-y-4 p-8 text-center">
        <h2 className="font-display text-2xl font-bold text-leaf-950">
          {t.sim?.voiceTitle || "Voice Call"}
        </h2>

        <p className="text-sm text-soil-900/70">
          {t.sim?.loginRequired ||
            "Please log in as a farmer to use the voice service."}
        </p>

        <button
          type="button"
          onClick={handleDemoLogin}
          disabled={busy}
          className="btn-primary w-full text-sm disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy
            ? t.sim?.connecting || "Connecting..."
            : t.sim?.quickDemoLogin || "Quick Demo Login →"}
        </button>

        <Link
          className="block text-xs text-leaf-700 underline"
          to="/login?role=farmer"
        >
          {t.sim?.existingLogin ||
            "Or log in with an existing account"}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-4">
        <button
          type="button"
          onClick={() => nav("/farmer")}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-leaf-900 hover:text-leaf-700"
        >
          <ArrowLeft size={14} />
          {t.sim?.backToDashboard || "Back to Dashboard"}
        </button>
      </div>

      <VoiceSimulator />
    </div>
  );
}
