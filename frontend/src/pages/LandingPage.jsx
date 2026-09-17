import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Sparkles,
  ShieldCheck,
  TrendingUp,
  PhoneCall,
  MessageSquare,
  Lock,
  Sprout,
  Users,
  CheckCircle2,
  HelpCircle,
  Award,
} from "lucide-react";
import { useLang } from "../context/LanguageContext";
import { getMarketPrices } from "../services/api";

const CROPS = ["Wheat", "Rice", "Potato", "Tomato", "Cotton"];

export default function LandingPage() {
  const { t } = useLang();
  const nav = useNavigate();

  // Calculator states
  const [selectedCrop, setSelectedCrop] = useState("Wheat");
  const [quantity, setQuantity] = useState(50);
  const [marketPrices, setMarketPrices] = useState([]);
  const [priceData, setPriceData] = useState({
    avg_price: 2600,
    min_price: 2390,
    max_price: 2810,
  });

  useEffect(() => {
    loadPrices();
  }, []);

  const loadPrices = async () => {
    try {
      const prices = await getMarketPrices();
      if (prices && prices.length > 0) {
        setMarketPrices(prices);
        const match = prices.find((p) => p.crop === selectedCrop);
        if (match) setPriceData(match);
      }
    } catch (e) {
      // fallback to defaults
    }
  };

  useEffect(() => {
    if (marketPrices.length > 0) {
      const match = marketPrices.find((p) => p.crop === selectedCrop);
      if (match) setPriceData(match);
    }
  }, [selectedCrop, marketPrices]);

  // Financial calculations
  const mandiRate = priceData.avg_price || 2400;
  // Traditional middleman cuts: commission, transport cut, APMC cess approx 25-30%
  const farmerMandiRevenue = mandiRate * 0.75 * quantity;
  // FarmLink AI fair price (direct trade, fair value for buyer, full profit for farmer)
  const farmLinkRate = Math.round(mandiRate * 0.98);
  const farmLinkRevenue = farmLinkRate * quantity;
  const extraFarmerProfit = Math.round(farmLinkRevenue - farmerMandiRevenue);
  const buyerDirectSavings = Math.round(mandiRate * 1.15 * quantity - farmLinkRevenue);

  return (
    <div className="space-y-16 pb-16">
      {/* 1. Hero Section */}
      <section className="mx-auto max-w-6xl px-4 pt-10 pb-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7 space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full bg-leaf-100 px-3.5 py-1.5 text-xs font-bold text-leaf-900 shadow-sm border border-leaf-700/20">
              <Sprout size={15} /> 100% Direct Farmer ↔ Buyer Marketplace
            </div>

            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.15] text-leaf-950">
              Farmer meets Buyer. <br />
              <span className="text-leaf-700">Best Price.</span> Zero Middlemen.
            </h1>

            <p className="text-lg text-soil-900/80 max-w-xl">
              FarmLink AI connects verified Indian farmers directly to verified wholesale buyers. 
              Real mandi prices, AI-calculated fair rates, zero commissions, and complete price transparency.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                className="btn-primary text-base md:text-lg !px-6"
                onClick={() => nav("/signup?role=farmer")}
              >
                Join as Farmer <ArrowRight size={18} />
              </button>
              <button
                className="btn-gold text-base md:text-lg !px-6"
                onClick={() => nav("/signup?role=buyer")}
              >
                Join as Buyer
              </button>
              <Link
                to="/login"
                className="btn-ghost text-base !px-5"
              >
                Login
              </Link>
            </div>

            {/* Quick Demo Credentials & Admin Link */}
            <div className="pt-3 flex flex-wrap items-center gap-4 text-xs text-soil-900/70 border-t border-leaf-900/10">
              <span>Demo Login:</span>
              <Link className="underline font-semibold hover:text-leaf-900" to="/login?role=farmer">
                Farmer (9876540001)
              </Link>
              <span>·</span>
              <Link className="underline font-semibold hover:text-leaf-900" to="/login?role=buyer">
                Buyer (9000000001)
              </Link>
              <span>·</span>
              {/* Mandatory Admin Login Link on Home Page */}
              <Link
                to="/login?role=admin"
                className="inline-flex items-center gap-1 font-bold text-leaf-900 underline hover:text-leaf-700"
              >
                <Lock size={12} /> Admin Access →
              </Link>
            </div>
          </div>

          {/* AI Price Calculator Card */}
          <div className="lg:col-span-5">
            <div className="card bg-leaf-900 text-cream-50 shadow-2xl relative overflow-hidden border border-leaf-700/40">
              <div className="absolute top-0 right-0 translate-x-4 -translate-y-4 w-28 h-28 bg-harvest-500/10 rounded-full blur-xl pointer-events-none" />

              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <Sparkles size={18} className="text-harvest-400" />
                  <h3 className="font-display font-bold text-xl text-cream-50">AI Price Calculator</h3>
                </div>
                <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full text-cream-100/90 font-mono">
                  Real Mandi Feed
                </span>
              </div>

              <div className="mt-4 space-y-3.5">
                <div>
                  <label className="label text-xs text-cream-100">Select Commodity</label>
                  <select
                    className="field text-soil-950 font-bold text-sm bg-white"
                    value={selectedCrop}
                    onChange={(e) => setSelectedCrop(e.target.value)}
                  >
                    {CROPS.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex justify-between text-xs text-cream-100 mb-1">
                    <label className="font-semibold">Harvest Quantity</label>
                    <span className="font-bold text-harvest-400">{quantity} Quintals</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="500"
                    step="5"
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    className="w-full accent-harvest-400 h-2 bg-white/20 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Calculation Display */}
                <div className="rounded-2xl bg-white/10 p-3.5 space-y-2 border border-white/10">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-cream-100/80">Govt Mandi Benchmark:</span>
                    <span className="font-bold">₹{mandiRate} / quintal</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-cream-100/80">FarmLink AI Recommended Price:</span>
                    <span className="font-bold text-harvest-400 text-sm">₹{farmLinkRate} / quintal</span>
                  </div>
                  <div className="pt-2 border-t border-white/10 flex justify-between items-baseline">
                    <span className="text-xs font-semibold text-cream-50">Farmer Net Earnings:</span>
                    <span className="font-display font-extrabold text-2xl text-cream-50">
                      ₹{farmLinkRevenue.toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>

                {/* Profit highlight */}
                <div className="rounded-xl bg-leaf-700/60 p-2.5 border border-leaf-500/30 text-xs flex items-center justify-between">
                  <span className="font-bold text-harvest-400">Farmers Profit:</span>
                  <span className="font-bold text-cream-50">+₹{extraFarmerProfit.toLocaleString("en-IN")} vs Middleman Cut</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Real Market Ticker */}
      <section className="bg-leaf-950 text-cream-50 py-3.5 border-y border-leaf-700/30 overflow-x-auto">
        <div className="mx-auto max-w-6xl px-4 flex items-center gap-6 text-xs whitespace-nowrap">
          <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-harvest-400 shrink-0">
            <TrendingUp size={14} /> Live Mandi Rates:
          </div>
          <div className="flex items-center gap-8 overflow-x-auto">
            {(marketPrices.length > 0 ? marketPrices : [
              { crop: "Wheat", avg_price: 2275, source: "agmarknet" },
              { crop: "Rice", avg_price: 2300, source: "agmarknet" },
              { crop: "Potato", avg_price: 1800, source: "agmarknet" },
              { crop: "Tomato", avg_price: 2000, source: "agmarknet" },
              { crop: "Cotton", avg_price: 7121, source: "agmarknet" },
            ]).map((item) => (
              <div key={item.crop} className="flex items-center gap-2">
                <span className="font-semibold text-cream-100">{item.crop}:</span>
                <span className="font-mono font-bold text-harvest-400">₹{item.avg_price}/q</span>
                <span className="text-[10px] text-cream-100/50">({item.source})</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. Voice & SMS AI Helpline Banner (Mandatory requirement) */}
      <section className="mx-auto max-w-6xl px-4">
        <div className="card bg-cream-50 border-2 border-harvest-500/40 p-6 md:p-8 shadow-card relative">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            <div className="md:col-span-8 space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full bg-harvest-400/20 px-3 py-1 text-xs font-bold text-soil-950 border border-harvest-500/30">
                <PhoneCall size={14} className="text-harvest-500" />
                Dedicated Voice & SMS Service
              </div>

              <h2 className="font-display text-2xl md:text-3xl font-bold text-leaf-950">
                No Smartphone? Call or SMS Our AI Service
              </h2>

              <p className="text-soil-900/80 text-sm md:text-base">
                Farmers without internet can dial or text our dedicated toll-free helpline. Speak naturally or send simple messages in <strong>Hindi, Marathi, or English</strong> to list crops and receive instant market rates.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <div className="rounded-2xl bg-white px-4 py-2.5 border-2 border-leaf-900/20 shadow-sm flex items-center gap-2">
                  <PhoneCall size={18} className="text-leaf-700" />
                  <span className="font-mono font-bold text-lg text-leaf-950">+91 9000-346-276</span>
                </div>
                <button
                  onClick={() => nav("/voice")}
                  className="btn-primary !py-2.5 !px-4 text-sm"
                >
                  Try Voice IVR Demo
                </button>
                <button
                  onClick={() => nav("/sms")}
                  className="btn-ghost !py-2.5 !px-4 text-sm"
                >
                  Try SMS Simulator
                </button>
              </div>
            </div>

            <div className="md:col-span-4 rounded-2xl bg-white p-4 border border-leaf-900/10 shadow-sm space-y-2.5 text-xs">
              <p className="font-bold text-leaf-950 uppercase tracking-wider">Example SMS Commands:</p>
              <div className="rounded-xl bg-cream-50 p-2 font-mono text-[11px] text-leaf-900 border border-leaf-900/5">
                "Today tomato rate in Nashik"
              </div>
              <div className="rounded-xl bg-cream-50 p-2 font-mono text-[11px] text-leaf-900 border border-leaf-900/5">
                "Sell 50 quintal wheat in Pune grade A"
              </div>
              <p className="text-[11px] text-soil-900/60 pt-1">
                AI extracts crop, quantity, and location automatically.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Multi-Step Verification & Trust Section */}
      <section className="mx-auto max-w-6xl px-4">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-leaf-700 mb-2">
            <ShieldCheck size={16} /> Trust & Verification
          </div>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-leaf-950">
            Why FarmLink Verification Matters
          </h2>
          <p className="mt-2 text-sm text-soil-900/70">
            No anonymous buyers, no fictitious listings. Every user completes multi-step verification before direct contact details are shared.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card p-6 space-y-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-leaf-100 text-leaf-900 font-bold">
              1
            </span>
            <h3 className="font-display font-bold text-lg text-leaf-950">Identity & Mobile Check</h3>
            <p className="text-sm text-soil-900/70">
              Every farmer and buyer verifies their mobile via 6-digit OTP and completes sandbox KYC check.
            </p>
          </div>

          <div className="card p-6 space-y-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-leaf-100 text-leaf-900 font-bold">
              2
            </span>
            <h3 className="font-display font-bold text-lg text-leaf-950">Agricultural & Business Proof</h3>
            <p className="text-sm text-soil-900/70">
              Farmers confirm land/FPO registration. Buyers submit valid GSTIN, Udyam, or municipal trade licence.
            </p>
          </div>

          <div className="card p-6 space-y-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-leaf-100 text-leaf-900 font-bold">
              3
            </span>
            <h3 className="font-display font-bold text-lg text-leaf-950">Direct Contact & Fair Trade</h3>
            <p className="text-sm text-soil-900/70">
              Only verified buyers see direct farmer phone numbers, ensuring privacy, zero middlemen, and reliable payments.
            </p>
          </div>
        </div>
      </section>

      {/* 5. Trust Metrics Bar */}
      <section className="mx-auto max-w-6xl px-4">
        <div className="card bg-leaf-900 text-cream-50 p-8 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div>
            <p className="font-display text-3xl md:text-4xl font-bold text-harvest-400">100%</p>
            <p className="mt-1 text-xs text-cream-100/80 font-medium">Real Mandi Pricing</p>
          </div>
          <div>
            <p className="font-display text-3xl md:text-4xl font-bold text-cream-50">1,200+</p>
            <p className="mt-1 text-xs text-cream-100/80 font-medium">Verified Farmers</p>
          </div>
          <div>
            <p className="font-display text-3xl md:text-4xl font-bold text-cream-50">450+</p>
            <p className="mt-1 text-xs text-cream-100/80 font-medium">Verified Buyers</p>
          </div>
          <div>
            <p className="font-display text-3xl md:text-4xl font-bold text-harvest-400">0%</p>
            <p className="mt-1 text-xs text-cream-100/80 font-medium">Middleman Commission</p>
          </div>
        </div>
      </section>
    </div>
  );
}
