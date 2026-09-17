import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLang } from "../context/LanguageContext";
import { api, recommendPrice } from "../services/api";
import PriceChart from "../components/PriceChart";

const CROPS = ["Wheat", "Rice", "Potato", "Tomato", "Cotton"];
const DISTRICTS = [
  "Nashik",
  "Pune",
  "Karnal",
  "Ludhiana",
  "Nagpur",
  "Ahmedabad",
  "Indore",
  "Jaipur",
  "Hyderabad",
  "Bengaluru",
];

export default function NewListingPage() {
  const { t } = useLang();
  const { user } = useAuth();
  const nav = useNavigate();
  const [crop, setCrop] = useState("Wheat");
  const [quantity, setQuantity] = useState(50);
  const [quality, setQuality] = useState("A");
  const [district, setDistrict] = useState(user?.district || "Nashik");
  const [harvest, setHarvest] = useState("");
  const [price, setPrice] = useState(null);
  const [ask, setAsk] = useState(0);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const clampedAsk = useMemo(() => {
    if (!price) return ask;
    return Math.min(Math.max(ask, price.recommended_price_min), price.recommended_price_max);
  }, [ask, price]);

  const preview = async () => {
    setBusy(true);
    setErr("");
    try {
      const data = await recommendPrice({ crop, quantity, quality, district });
      setPrice(data);
      setAsk(data.target_price);
    } catch (e) {
      setErr(e.response?.data?.error || e.message);
    } finally {
      setBusy(false);
    }
  };

  const publish = async () => {
    setBusy(true);
    setErr("");
    try {
      const { data } = await api.post("/api/listings", {
        crop,
        quantity,
        quality,
        district,
        harvest_date: harvest,
        farmer_asking_price: clampedAsk,
      });
      nav(`/farmer/matches/${data.id}`);
    } catch (e) {
      setErr(e.response?.data?.error || e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <ol className="mb-6 flex gap-2 text-sm font-bold">
        <li className="rounded-full bg-leaf-900 text-white px-3 py-1">1 List</li>
        <li className="rounded-full bg-leaf-100 px-3 py-1">2 Price</li>
        <li className="rounded-full bg-leaf-100 px-3 py-1">3 Match</li>
      </ol>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="card">
          <h1 className="font-display text-3xl">{t.listing.title}</h1>
          <p className="text-leaf-900/70 mb-4">{t.listing.subtitle}</p>
          <label className="label">{t.landing.crop}</label>
          <select className="field" value={crop} onChange={(e) => setCrop(e.target.value)}>
            {CROPS.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <label className="label mt-3">{t.landing.qty}</label>
          <input className="field" type="number" min="1" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} />
          <label className="label mt-3">{t.listing.quality}</label>
          <div className="flex gap-2">
            {["A", "B", "C"].map((g) => (
              <button
                key={g}
                type="button"
                className={`btn flex-1 ${quality === g ? "btn-primary" : "btn-ghost"}`}
                onClick={() => setQuality(g)}
              >
                Grade {g}
              </button>
            ))}
          </div>
          <label className="label mt-3">{t.auth.district}</label>
          <select className="field" value={district} onChange={(e) => setDistrict(e.target.value)}>
            {DISTRICTS.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
          <label className="label mt-3">{t.listing.harvest}</label>
          <input className="field" type="date" value={harvest} onChange={(e) => setHarvest(e.target.value)} />
          <button className="btn-gold w-full mt-5" disabled={busy} onClick={preview}>
            {t.listing.preview}
          </button>
        </div>
        <div className="card">
          {price ? (
            <>
              <p className="text-sm font-bold text-leaf-700">{t.listing.band}</p>
              <p className="font-display text-3xl">
                ₹{price.recommended_price_min} – ₹{price.recommended_price_max}
              </p>
              <p className="mt-2 text-sm text-leaf-900/80">{price.basis_explanation}</p>
              <label className="label mt-4">{t.listing.ask}</label>
              <input
                className="w-full"
                type="range"
                min={price.recommended_price_min}
                max={price.recommended_price_max}
                step="1"
                value={clampedAsk}
                onChange={(e) => setAsk(Number(e.target.value))}
              />
              <p className="text-2xl font-bold">₹{Math.round(clampedAsk)}</p>
              <PriceChart
                history={price.history}
                min={price.recommended_price_min}
                max={price.recommended_price_max}
                target={price.target_price}
              />
              <button className="btn-primary w-full mt-4" disabled={busy} onClick={publish}>
                {t.listing.publish}
              </button>
            </>
          ) : (
            <p className="text-leaf-900/70">Tap “{t.listing.preview}” to see the Prophet band before publishing.</p>
          )}
          {err && <p className="mt-3 text-red-700 font-semibold">{err}</p>}
        </div>
      </div>
    </div>
  );
}
