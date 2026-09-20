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

const GRADES = ["A", "B", "C"];

export default function NewListingPage() {
  const { t, lang } = useLang();
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
  const [action, setAction] = useState("");

  const locale =
    lang === "hi"
      ? "hi-IN-u-nu-deva"
      : lang === "mr"
      ? "mr-IN-u-nu-deva"
      : "en-IN";

  const formatNumber = (value) =>
    Number(value || 0).toLocaleString(locale);

  const cropLabel = (value) => t.crops?.[value] || value;

  const gradeLabel = (value) =>
    t.listing?.grade ? `${t.listing.grade} ${value}` : `Grade ${value}`;

  const clampedAsk = useMemo(() => {
    if (!price) return ask;

    return Math.min(
      Math.max(ask, price.recommended_price_min),
      price.recommended_price_max
    );
  }, [ask, price]);

  const preview = async () => {
    if (busy) return;

    setBusy(true);
    setAction("preview");
    setErr("");

    try {
      const data = await recommendPrice({
        crop,
        quantity,
        quality,
        district,
      });

      setPrice(data);
      setAsk(data.target_price);
    } catch (e) {
      setErr(
        e.response?.data?.error ||
          e.message ||
          t.listing?.genericError ||
          "Something went wrong."
      );
    } finally {
      setBusy(false);
      setAction("");
    }
  };

  const publish = async () => {
    if (busy) return;

    setBusy(true);
    setAction("publish");
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
      setErr(
        e.response?.data?.error ||
          e.message ||
          t.listing?.genericError ||
          "Something went wrong."
      );
    } finally {
      setBusy(false);
      setAction("");
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* Progress */}
      <ol className="mb-6 flex flex-wrap gap-2 text-sm font-bold">
        <li className="rounded-full bg-leaf-900 px-3 py-1 text-white">
          1 {t.listing?.stepList || "List"}
        </li>

        <li className="rounded-full bg-leaf-100 px-3 py-1">
          2 {t.listing?.stepPrice || "Price"}
        </li>

        <li className="rounded-full bg-leaf-100 px-3 py-1">
          3 {t.listing?.stepMatch || "Match"}
        </li>
      </ol>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Listing form */}
        <div className="card">
          <h1 className="font-display text-3xl">
            {t.listing.title}
          </h1>

          <p className="mb-4 text-leaf-900/70">
            {t.listing.subtitle}
          </p>

          {/* Crop */}
          <label className="label">
            {t.landing.crop}
          </label>

          <select
            className="field"
            value={crop}
            onChange={(e) => setCrop(e.target.value)}
            disabled={busy}
          >
            {CROPS.map((c) => (
              <option key={c} value={c}>
                {cropLabel(c)}
              </option>
            ))}
          </select>

          {/* Quantity */}
          <label className="label mt-3">
            {t.landing.qty}
          </label>

          <input
            className="field"
            type="number"
            min="1"
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            disabled={busy}
          />

          {/* Quality */}
          <label className="label mt-3">
            {t.listing.quality}
          </label>

          <div className="flex gap-2">
            {GRADES.map((g) => (
              <button
                key={g}
                type="button"
                className={`btn flex-1 ${
                  quality === g ? "btn-primary" : "btn-ghost"
                }`}
                onClick={() => setQuality(g)}
                disabled={busy}
              >
                {gradeLabel(g)}
              </button>
            ))}
          </div>

          {/* District */}
          <label className="label mt-3">
            {t.auth.district}
          </label>

          <select
            className="field"
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
            disabled={busy}
          >
            {DISTRICTS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          {/* Harvest date */}
          <label className="label mt-3">
            {t.listing.harvest}
          </label>

          <input
            className="field"
            type="date"
            value={harvest}
            onChange={(e) => setHarvest(e.target.value)}
            disabled={busy}
          />

          {/* Preview */}
          <button
            className="btn-gold mt-5 w-full"
            disabled={busy}
            onClick={preview}
          >
            {action === "preview"
              ? t.listing?.loading || "Loading..."
              : t.listing.preview}
          </button>
        </div>

        {/* Price panel */}
        <div className="card">
          {price ? (
            <>
              <p className="text-sm font-bold text-leaf-700">
                {t.listing.band}
              </p>

              <p className="font-display text-3xl">
                ₹{formatNumber(price.recommended_price_min)} – ₹
                {formatNumber(price.recommended_price_max)}
              </p>

              <p className="mt-2 text-sm text-leaf-900/80">
                {price.basis_explanation}
              </p>

              {/* Asking price */}
              <label className="label mt-4">
                {t.listing.ask}
              </label>

              <input
                className="w-full"
                type="range"
                min={price.recommended_price_min}
                max={price.recommended_price_max}
                step="1"
                value={clampedAsk}
                onChange={(e) => setAsk(Number(e.target.value))}
                disabled={busy}
              />

              <p className="text-2xl font-bold">
                ₹{formatNumber(Math.round(clampedAsk))}
              </p>

              {/* Chart */}
              <PriceChart
                history={price.history}
                min={price.recommended_price_min}
                max={price.recommended_price_max}
                target={price.target_price}
              />

              {/* Publish */}
              <button
                className="btn-primary mt-4 w-full"
                disabled={busy}
                onClick={publish}
              >
                {action === "publish"
                  ? t.listing?.publishing || "Publishing..."
                  : t.listing.publish}
              </button>
            </>
          ) : (
            <p className="text-leaf-900/70">
              {t.listing?.previewHint ||
                `Tap "${t.listing.preview}" to see the recommended price before publishing.`}
            </p>
          )}

          {err && (
            <p className="mt-3 font-semibold text-red-700">
              {err}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
