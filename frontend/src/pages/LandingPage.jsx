import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Sparkles,
  ShieldCheck,
  TrendingUp,
  PhoneCall,
  Lock,
  Sprout,
} from "lucide-react";
import { useLang } from "../context/LanguageContext";
import { getMarketPrices } from "../services/api";

const CROPS = ["Wheat", "Rice", "Potato", "Tomato", "Cotton"];

export default function LandingPage() {
  const { t, lang } = useLang();
  const nav = useNavigate();

  const locale =
    lang === "hi" ? "hi-IN" :
    lang === "mr" ? "mr-IN" :
    "en-IN";

  const formatNumber = (value) =>
    Number(value || 0).toLocaleString(locale);

  const cropLabel = (crop) =>
    t.crops?.[crop] || crop;

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

        const match = prices.find(
          (p) => p.crop === selectedCrop
        );

        if (match) {
          setPriceData(match);
        }
      }
    } catch (e) {
      // fallback to defaults
    }
  };

  useEffect(() => {
    if (marketPrices.length > 0) {
      const match = marketPrices.find(
        (p) => p.crop === selectedCrop
      );

      if (match) {
        setPriceData(match);
      }
    }
  }, [selectedCrop, marketPrices]);

  const mandiRate = priceData.avg_price || 2400;

  const farmerMandiRevenue =
    mandiRate * 0.75 * quantity;

  const farmLinkRate =
    Math.round(mandiRate * 0.98);

  const farmLinkRevenue =
    farmLinkRate * quantity;

  const extraFarmerProfit =
    Math.round(
      farmLinkRevenue - farmerMandiRevenue
    );

  return (
    <div className="space-y-16 pb-16">

      {/* 1. Hero Section */}
      <section className="mx-auto max-w-6xl px-4 pt-10 pb-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">

          <div className="lg:col-span-7 space-y-5">

            <div className="inline-flex items-center gap-2 rounded-full bg-leaf-100 px-3.5 py-1.5 text-xs font-bold text-leaf-900 shadow-sm border border-leaf-700/20">
              <Sprout size={15} />
              {t.landing.heroBadge}
            </div>

            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.15] text-leaf-950">
              {t.landing.heroTitle1}
              <br />
              <span className="text-leaf-700">
                {t.landing.heroTitle2}
              </span>{" "}
              {t.landing.heroTitle3}
            </h1>

            <p className="text-lg text-soil-900/80 max-w-xl">
              {t.landing.heroBody}
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">

              <button
                className="btn-primary text-base md:text-lg !px-6"
                onClick={() =>
                  nav("/signup?role=farmer")
                }
              >
                {t.landing.startFarmer}
                <ArrowRight size={18} />
              </button>

              <button
                className="btn-gold text-base md:text-lg !px-6"
                onClick={() =>
                  nav("/signup?role=buyer")
                }
              >
                {t.landing.startBuyer}
              </button>

              <Link
                to="/login"
                className="btn-ghost text-base !px-5"
              >
                {t.nav.login}
              </Link>

            </div>

            <div className="pt-3 flex flex-wrap items-center gap-4 text-xs text-soil-900/70 border-t border-leaf-900/10">

              <span>{t.landing.demoLogin}</span>

              <Link
                className="underline font-semibold hover:text-leaf-900"
                to="/login?role=farmer"
              >
                {t.landing.farmerDemo}
              </Link>

              <span>·</span>

              <Link
                className="underline font-semibold hover:text-leaf-900"
                to="/login?role=buyer"
              >
                {t.landing.buyerDemo}
              </Link>

              <span>·</span>

              <Link
                to="/login?role=admin"
                className="inline-flex items-center gap-1 font-bold text-leaf-900 underline hover:text-leaf-700"
              >
                <Lock size={12} />
                {t.landing.adminAccess}
              </Link>

            </div>
          </div>

          {/* AI Price Calculator */}
          <div className="lg:col-span-5">

            <div className="card bg-leaf-900 text-cream-50 shadow-2xl relative overflow-hidden border border-leaf-700/40">

              <div className="absolute top-0 right-0 translate-x-4 -translate-y-4 w-28 h-28 bg-harvest-500/10 rounded-full blur-xl pointer-events-none" />

              <div className="flex items-center justify-between pb-3 border-b border-white/10">

                <div className="flex items-center gap-2">
                  <Sparkles
                    size={18}
                    className="text-harvest-400"
                  />

                  <h3 className="font-display font-bold text-xl text-cream-50">
                    {t.landing.calcTitle}
                  </h3>
                </div>

                <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full text-cream-100/90 font-mono">
                  {t.landing.realMandiFeed}
                </span>

              </div>

              <div className="mt-4 space-y-3.5">

                <div>
                  <label className="label text-xs text-cream-100">
                    {t.landing.selectCommodity}
                  </label>

                  <select
                    className="field text-soil-950 font-bold text-sm bg-white"
                    value={selectedCrop}
                    onChange={(e) =>
                      setSelectedCrop(e.target.value)
                    }
                  >
                    {CROPS.map((crop) => (
                      <option
                        key={crop}
                        value={crop}
                      >
                        {cropLabel(crop)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>

                  <div className="flex justify-between text-xs text-cream-100 mb-1">

                    <label className="font-semibold">
                      {t.landing.harvestQuantity}
                    </label>

                    <span className="font-bold text-harvest-400">
                      {formatNumber(quantity)}{" "}
                      {t.landing.quintals}
                    </span>

                  </div>

                  <input
                    type="range"
                    min="5"
                    max="500"
                    step="5"
                    value={quantity}
                    onChange={(e) =>
                      setQuantity(
                        Number(e.target.value)
                      )
                    }
                    className="w-full accent-harvest-400 h-2 bg-white/20 rounded-lg cursor-pointer"
                  />

                </div>

                <div className="rounded-2xl bg-white/10 p-3.5 space-y-2 border border-white/10">

                  <div className="flex justify-between items-center text-xs">
                    <span className="text-cream-100/80">
                      {t.landing.govtMandiBenchmark}
                    </span>
                    <span className="font-bold">
                      ₹{formatNumber(mandiRate)} /{" "}
                      {t.landing.quintal}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-xs">
                    <span className="text-cream-100/80">
                      {t.landing.recommendedPrice}
                    </span>
                    <span className="font-bold text-harvest-400 text-sm">
                      ₹{formatNumber(farmLinkRate)} /{" "}
                      {t.landing.quintal}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-white/10 flex justify-between items-baseline">

                    <span className="text-xs font-semibold text-cream-50">
                      {t.landing.farmerNetEarnings}
                    </span>

                    <span className="font-display font-extrabold text-2xl text-cream-50">
                      ₹{formatNumber(farmLinkRevenue)}
                    </span>

                  </div>

                </div>

                <div className="rounded-xl bg-leaf-700/60 p-2.5 border border-leaf-500/30 text-xs flex items-center justify-between">

                  <span className="font-bold text-harvest-400">
                    {t.landing.farmerProfit}
                  </span>

                  <span className="font-bold text-cream-50">
                    +₹{formatNumber(extraFarmerProfit)}{" "}
                    {t.landing.vsMiddleman}
                  </span>

                </div>

              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Market Ticker */}
      <section className="bg-leaf-950 text-cream-50 py-3.5 border-y border-leaf-700/30 overflow-x-auto">

        <div className="mx-auto max-w-6xl px-4 flex items-center gap-6 text-xs whitespace-nowrap">

          <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-harvest-400 shrink-0">
            <TrendingUp size={14} />
            {t.landing.liveMandiRates}
          </div>

          <div className="flex items-center gap-8 overflow-x-auto">

            {(marketPrices.length > 0
              ? marketPrices
              : [
                  {
                    crop: "Wheat",
                    avg_price: 2275,
                    source: "agmarknet",
                  },
                  {
                    crop: "Rice",
                    avg_price: 2300,
                    source: "agmarknet",
                  },
                  {
                    crop: "Potato",
                    avg_price: 1800,
                    source: "agmarknet",
                  },
                  {
                    crop: "Tomato",
                    avg_price: 2000,
                    source: "agmarknet",
                  },
                  {
                    crop: "Cotton",
                    avg_price: 7121,
                    source: "agmarknet",
                  },
                ]
            ).map((item) => (

              <div
                key={item.crop}
                className="flex items-center gap-2"
              >
                <span className="font-semibold text-cream-100">
                  {cropLabel(item.crop)}:
                </span>

                <span className="font-mono font-bold text-harvest-400">
                  ₹{formatNumber(item.avg_price)}/q
                </span>

                <span className="text-[10px] text-cream-100/50">
                  ({item.source})
                </span>
              </div>

            ))}

          </div>
        </div>
      </section>

      {/* 3. Voice & SMS */}
      <section className="mx-auto max-w-6xl px-4">

        <div className="card bg-cream-50 border-2 border-harvest-500/40 p-6 md:p-8 shadow-card relative">

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">

            <div className="md:col-span-8 space-y-3">

              <div className="inline-flex items-center gap-2 rounded-full bg-harvest-400/20 px-3 py-1 text-xs font-bold text-soil-950 border border-harvest-500/30">

                <PhoneCall
                  size={14}
                  className="text-harvest-500"
                />

                {t.landing.voiceSmsService}

              </div>

              <h2 className="font-display text-2xl md:text-3xl font-bold text-leaf-950">
                {t.landing.noSmartphoneTitle}
              </h2>

              <p className="text-soil-900/80 text-sm md:text-base">
                {t.landing.noSmartphoneBody}
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-1">

                <div className="rounded-2xl bg-white px-4 py-2.5 border-2 border-leaf-900/20 shadow-sm flex items-center gap-2">

                  <PhoneCall
                    size={18}
                    className="text-leaf-700"
                  />

                  <span className="font-mono font-bold text-lg text-leaf-950">
                    +91 XXXXX XXXXX
                  </span>

                </div>

                <button
                  onClick={() => nav("/voice")}
                  className="btn-primary !py-2.5 !px-4 text-sm"
                >
                  {t.landing.tryVoiceDemo}
                </button>

                <button
                  onClick={() => nav("/sms")}
                  className="btn-ghost !py-2.5 !px-4 text-sm"
                >
                  {t.landing.trySmsDemo}
                </button>

              </div>
            </div>

            <div className="md:col-span-4 rounded-2xl bg-white p-4 border border-leaf-900/10 shadow-sm space-y-2.5 text-xs">

              <p className="font-bold text-leaf-950 uppercase tracking-wider">
                {t.landing.exampleSmsCommands}
              </p>

              <div className="rounded-xl bg-cream-50 p-2 font-mono text-[11px] text-leaf-900 border border-leaf-900/5">
                "Today tomato rate in Nashik"
              </div>

              <div className="rounded-xl bg-cream-50 p-2 font-mono text-[11px] text-leaf-900 border border-leaf-900/5">
                "Sell 50 quintal wheat in Pune grade A"
              </div>

              <p className="text-[11px] text-soil-900/60 pt-1">
                {t.landing.aiExtracts}
              </p>

            </div>
          </div>
        </div>
      </section>

      {/* 4. Verification */}
      <section className="mx-auto max-w-6xl px-4">

        <div className="text-center max-w-2xl mx-auto mb-10">

          <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-leaf-700 mb-2">
            <ShieldCheck size={16} />
            {t.landing.trustVerification}
          </div>

          <h2 className="font-display text-3xl md:text-4xl font-bold text-leaf-950">
            {t.landing.verificationTitle}
          </h2>

          <p className="mt-2 text-sm text-soil-900/70">
            {t.landing.verificationBody}
          </p>

        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          <div className="card p-6 space-y-3">

            <span className="grid h-10 w-10 place-items-center rounded-xl bg-leaf-100 text-leaf-900 font-bold">
              {formatNumber(1)}
            </span>

            <h3 className="font-display font-bold text-lg text-leaf-950">
              {t.landing.identityCheckTitle}
            </h3>

            <p className="text-sm text-soil-900/70">
              {t.landing.identityCheckBody}
            </p>

          </div>

          <div className="card p-6 space-y-3">

            <span className="grid h-10 w-10 place-items-center rounded-xl bg-leaf-100 text-leaf-900 font-bold">
              {formatNumber(2)}
            </span>

            <h3 className="font-display font-bold text-lg text-leaf-950">
              {t.landing.businessProofTitle}
            </h3>

            <p className="text-sm text-soil-900/70">
              {t.landing.businessProofBody}
            </p>

          </div>

          <div className="card p-6 space-y-3">

            <span className="grid h-10 w-10 place-items-center rounded-xl bg-leaf-100 text-leaf-900 font-bold">
              {formatNumber(3)}
            </span>

            <h3 className="font-display font-bold text-lg text-leaf-950">
              {t.landing.directTradeTitle}
            </h3>

            <p className="text-sm text-soil-900/70">
              {t.landing.directTradeBody}
            </p>

          </div>

        </div>
      </section>

      {/* 5. Metrics */}
      <section className="mx-auto max-w-6xl px-4">

        <div className="card bg-leaf-900 text-cream-50 p-8 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">

          <div>
            <p className="font-display text-3xl md:text-4xl font-bold text-harvest-400">
              {formatNumber(100)}%
            </p>
            <p className="mt-1 text-xs text-cream-100/80 font-medium">
              {t.landing.realMandiPricing}
            </p>
          </div>

          <div>
            <p className="font-display text-3xl md:text-4xl font-bold text-cream-50">
              1,200+
            </p>
            <p className="mt-1 text-xs text-cream-100/80 font-medium">
              {t.landing.verifiedFarmers}
            </p>
          </div>

          <div>
            <p className="font-display text-3xl md:text-4xl font-bold text-cream-50">
              450+
            </p>
            <p className="mt-1 text-xs text-cream-100/80 font-medium">
              {t.landing.verifiedBuyers}
            </p>
          </div>

          <div>
            <p className="font-display text-3xl md:text-4xl font-bold text-harvest-400">
              {formatNumber(0)}%
            </p>
            <p className="mt-1 text-xs text-cream-100/80 font-medium">
              {t.landing.middlemanCommission}
            </p>
          </div>

        </div>
      </section>
    </div>
  );
}
