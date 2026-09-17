import { Link } from "react-router-dom";
import { PhoneCall, ShieldCheck, Lock, Sprout } from "lucide-react";

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-leaf-900/10 bg-white/60 py-10 text-sm text-soil-900/80">
      <div className="mx-auto max-w-6xl px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-8 border-b border-leaf-900/10">
          <div className="space-y-2 md:col-span-2">
            <div className="flex items-center gap-2 text-leaf-900 font-display font-bold text-lg">
              <span className="grid h-7 w-7 place-items-center rounded-xl bg-leaf-900 text-cream-50">
                <Sprout size={16} />
              </span>
              FarmLink AI
            </div>
            <p className="text-xs text-soil-900/70 max-w-sm">
              Direct Farmer ↔ Buyer Agricultural Marketplace. Real Agmarknet mandi benchmarks, AI-calculated fair price discovery, and multi-step trusted verification.
            </p>
          </div>

          <div className="space-y-1.5 text-xs">
            <p className="font-bold uppercase tracking-wider text-leaf-900">Voice & SMS Helpline</p>
            <div className="flex items-center gap-2 font-mono font-bold text-sm text-leaf-950">
              <PhoneCall size={14} className="text-leaf-700" /> +91 9000-346-276
            </div>
            <p className="text-[11px] text-soil-900/60">
              Available 24/7 in Hindi, Marathi, and English.
            </p>
            <div className="pt-1 flex gap-3">
              <Link to="/voice" className="underline hover:text-leaf-900">Voice IVR</Link>
              <span>·</span>
              <Link to="/sms" className="underline hover:text-leaf-900">SMS Helpline</Link>
            </div>
          </div>

          <div className="space-y-1.5 text-xs">
            <p className="font-bold uppercase tracking-wider text-leaf-900">Platform & Security</p>
            <p className="flex items-center gap-1.5 text-soil-900/70">
              <ShieldCheck size={14} className="text-leaf-700" /> Multi-Step Verified Accounts
            </p>
            <p className="text-soil-900/70">Zero Middlemen Commission</p>
            <div className="pt-1">
              <Link to="/login?role=admin" className="inline-flex items-center gap-1 font-semibold text-leaf-900 hover:underline">
                <Lock size={12} /> Admin Portal
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-soil-900/60">
          <p>© {new Date().getFullYear()} FarmLink AI · Direct Agriculture Trade · Built for Indian Farmers & Wholesale Buyers</p>
          <p>Mandi Benchmark: data.gov.in / Agmarknet</p>
        </div>
      </div>
    </footer>
  );
}
