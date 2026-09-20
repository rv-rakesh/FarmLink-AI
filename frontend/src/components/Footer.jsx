import { Link } from "react-router-dom";
import { PhoneCall, ShieldCheck, Lock, Sprout } from "lucide-react";
import { useLang } from "../context/LanguageContext";

export default function Footer() {
  const { t, lang } = useLang();

  const locale =
    lang === "hi" ? "hi-IN" :
    lang === "mr" ? "mr-IN" :
    "en-IN";

  const year = new Date().getFullYear().toLocaleString(locale);

  return (
    <footer className="mt-16 border-t border-leaf-900/10 bg-white/60 py-10 text-sm text-soil-900/80">
      <div className="mx-auto max-w-6xl px-4">

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-8 border-b border-leaf-900/10">

          {/* Brand */}
          <div className="space-y-2 md:col-span-2">
            <div className="flex items-center gap-2 text-leaf-900 font-display font-bold text-lg">
              <span className="grid h-7 w-7 place-items-center rounded-xl bg-leaf-900 text-cream-50">
                <Sprout size={16} />
              </span>
              {t.footer.brandName}
            </div>

            <p className="text-xs text-soil-900/70 max-w-sm">
              {t.footer.description}
            </p>
          </div>

          {/* Voice & SMS */}
          <div className="space-y-1.5 text-xs">
            <p className="font-bold uppercase tracking-wider text-leaf-900">
              {t.footer.voiceSmsTitle}
            </p>

            <div className="flex items-center gap-2 font-mono font-bold text-sm text-leaf-950">
              <PhoneCall size={14} className="text-leaf-700" />
              +91 XXXXX XXXXX
            </div>

            <p className="text-[11px] text-soil-900/60">
              {t.footer.available}
            </p>

            <div className="pt-1 flex gap-3">
              <Link
                to="/voice"
                className="underline hover:text-leaf-900"
              >
                {t.footer.voiceIvr}
              </Link>

              <span>·</span>

              <Link
                to="/sms"
                className="underline hover:text-leaf-900"
              >
                {t.footer.smsHelpline}
              </Link>
            </div>
          </div>

          {/* Security */}
          <div className="space-y-1.5 text-xs">
            <p className="font-bold uppercase tracking-wider text-leaf-900">
              {t.footer.platformSecurity}
            </p>

            <p className="flex items-center gap-1.5 text-soil-900/70">
              <ShieldCheck size={14} className="text-leaf-700" />
              {t.footer.verifiedAccounts}
            </p>

            <p className="text-soil-900/70">
              {t.footer.zeroCommission}
            </p>

            <div className="pt-1">
              <Link
                to="/login?role=admin"
                className="inline-flex items-center gap-1 font-semibold text-leaf-900 hover:underline"
              >
                <Lock size={12} />
                {t.footer.adminPortal}
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-6 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-soil-900/60">
          <p>
            © {year} {t.footer.brandName} · {t.footer.directTrade} ·{" "}
            {t.footer.builtFor}
          </p>

          <p>
            {t.footer.mandiBenchmark}
          </p>
        </div>

      </div>
    </footer>
  );
}
