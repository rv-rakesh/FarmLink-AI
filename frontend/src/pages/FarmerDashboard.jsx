import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Plus,
  ShieldCheck,
  PhoneCall,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useLang } from "../context/LanguageContext";
import {
  api,
  recommendPrice,
  getFarmerVerificationStatus,
} from "../services/api";
import {
  cacheTrends,
  readCachedTrends,
} from "../utils/offlineStorage";
import StatusBadge from "../components/StatusBadge";
import PriceChart from "../components/PriceChart";
import VerificationBadge from "../components/VerificationBadge";

export default function FarmerDashboard() {
  const { user } = useAuth();
  const { t, lang } = useLang();
  const nav = useNavigate();

  const [listings, setListings] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [trend, setTrend] = useState(readCachedTrends());
  const [verif, setVerif] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const locale =
    lang === "hi"
      ? "hi-IN"
      : lang === "mr"
      ? "mr-IN"
      : "en-IN";

  const formatNumber = (value) =>
    Number(value || 0).toLocaleString(locale);

  const farmerText = (key, fallback) =>
    t.farmer?.[key] || fallback;

  const cropLabel = (crop) =>
    t.crops?.[crop] || crop;

  const wastageAlertText = (alert) => {
    const crop = cropLabel(alert.crop);
    const price = formatNumber(alert.suggested_price);

    if (lang === "hi") {
      return `${crop} की लिस्टिंग 24 घंटे से अधिक समय से बिना खरीदार के है। भाव को ₹${price}/क्विंटल तक कम करने या पास के खरीदार से संपर्क करने पर विचार करें।`;
    }

    if (lang === "mr") {
      return `${crop} ची लिस्टिंग 24 तासांहून अधिक काळ खरेदीदाराशिवाय आहे. भाव ₹${price}/क्विंटलपर्यंत कमी करण्याचा किंवा जवळच्या खरेदीदाराशी संपर्क करण्याचा विचार करा.`;
    }

    return `${crop} listing has been unmatched for over 24 hours. Consider reducing ask to ₹${price}/q or contacting a nearby buyer.`;
  };

  useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true);
      setError("");

      try {
        const [
          listingsRes,
          alertsRes,
          verification,
          priceData,
        ] = await Promise.all([
          api.get("/api/listings"),
          api.get("/api/alerts/wastage"),
          getFarmerVerificationStatus().catch(() => null),
          recommendPrice({
            crop: "Wheat",
            quantity: 1,
            quality: "B",
            district: user?.district || "Nashik",
          }).catch(() => null),
        ]);

        setListings(listingsRes.data || []);
        setAlerts(alertsRes.data || []);
        setVerif(verification);

        if (priceData) {
          setTrend(priceData);
          cacheTrends(priceData);
        } else {
          setTrend(readCachedTrends());
        }
      } catch (e) {
        setError(
          e?.response?.data?.error ||
            e?.message ||
            farmerText("loadFailed", "Unable to load the dashboard.")
        );
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      loadDashboard();
    }
  }, [user, farmerText("loadFailed", "Unable to load the dashboard.")]);

  const isVerified =
    verif?.status === "VERIFIED" ||
    user?.is_verified;

  const currentLevel =
    verif?.verification_level ||
    user?.verification_level ||
    0;

  const currentTrust =
    verif?.trust_score ||
    user?.trust_score ||
    0;

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12 text-center">
        <p className="text-sm text-soil-900/60">
          {farmerText("loading", "Loading your dashboard...")}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}

      {/* Profile Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">

        <div>
          <div className="flex items-center gap-2 mb-1">

            <span className="text-sm font-bold text-leaf-700">
              {farmerText("hello", "Namaste")}, {user?.name}
            </span>

            <VerificationBadge
              level={currentLevel}
              status={
                verif?.status ||
                user?.verification_status ||
                "PENDING"
              }
              role="farmer"
              trustScore={currentTrust}
              size="sm"
            />

          </div>

          <h1 className="font-display text-3xl font-bold text-leaf-950">
            {t.nav?.dashboard || "Dashboard"}
          </h1>

          <p className="text-sm text-soil-900/70">
            {user?.village
              ? `${user.village}, `
              : ""}
            {user?.district ||
              farmerText("defaultDistrict", "Nashik")}
          </p>

        </div>

        <div className="flex flex-wrap items-center gap-2">

          <Link
            className="btn-primary"
            to="/farmer/new"
          >
            <Plus size={18} />
            {t.nav?.newListing || "New listing"}
          </Link>

          <Link
            className="btn-ghost"
            to="/voice"
          >
            {t.nav?.voice || "Voice (simulator)"}
          </Link>

          <Link
            className="btn-ghost"
            to="/sms"
          >
            {t.nav?.sms || "SMS (simulator)"}
          </Link>

        </div>
      </div>

      {/* Verification Banner */}
      {!isVerified ? (

        <div className="card bg-cream-50 border-2 border-harvest-500/40 p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">

          <div className="flex items-start gap-3">

            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-harvest-500 text-soil-950 font-bold">
              <ShieldCheck size={22} />
            </span>

            <div>

              <div className="flex items-center gap-2 flex-wrap">

                <h3 className="font-bold text-soil-950 text-base">
                  {farmerText("accountVerification", "Account Verification")}:{" "}
                  {verif?.status ||
                    farmerText("pending", "Pending")}
                  {" "}
                  ({farmerText("level", "Level")}{" "}
                  {formatNumber(currentLevel)}/4)
                </h3>

                <span className="text-xs bg-harvest-400/30 text-soil-950 font-bold px-2 py-0.5 rounded-md">
                  {farmerText("trust", "Trust")}:{" "}
                  {formatNumber(currentTrust)}/100
                </span>

              </div>

              <p className="text-xs text-soil-900/80 mt-1">
                {verif?.next_step ||
                  farmerText("verificationNextStep", "Complete verification to unlock all marketplace features.")}
              </p>

            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">

            <button
              type="button"
              onClick={() =>
                nav("/farmer/verify")
              }
              className="btn-primary !py-2.5 !px-5 text-sm"
            >
              {farmerText("verifyAccount", "Verify Account")}
              <ArrowRight size={16} />
            </button>

            <Link
              to="/verification/status"
              className="btn-ghost !py-2.5 !px-3 text-sm"
            >
              {farmerText("checklist", "Checklist")}
            </Link>

          </div>
        </div>

      ) : (

        <div className="rounded-2xl border border-leaf-700/30 bg-leaf-100/40 p-3 flex items-center justify-between">

          <div className="flex items-center gap-2 text-sm font-bold text-leaf-900">
            <CheckCircle2
              size={18}
              className="text-leaf-700"
            />
            {farmerText("verifiedFarmerAccess", "Verified farmer access is active.")}
          </div>

          <Link
            to="/verification/status"
            className="text-xs font-semibold text-leaf-900 underline"
          >
            {farmerText("viewTrustDetails", "View Trust Details")} (
            {formatNumber(currentTrust)}/100)
          </Link>

        </div>
      )}

      {/* Voice & SMS */}
      <div className="card bg-leaf-900 text-cream-50 p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">

        <div className="flex items-center gap-3">

          <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 text-harvest-400">
            <PhoneCall size={20} />
          </span>

          <div>

            <p className="text-xs font-bold uppercase tracking-wider text-harvest-400">
              {farmerText("offlineVoiceTitle", "Voice & SMS Service")}
            </p>

            <p className="text-sm font-semibold text-cream-100">
              {farmerText("callOrSms", "Call or SMS")}:{" "}
              <strong className="text-cream-50 font-mono">
                +91 XXXXX XXXXX
              </strong>
            </p>

          </div>
        </div>

        <div className="flex gap-2">

          <Link
            to="/voice"
            className="btn-gold !py-2 !px-3 text-xs"
          >
            {farmerText("voiceCallDemo", "Voice Demo")}
          </Link>

          <Link
            to="/sms"
            className="btn-ghost text-cream-50 !border-white/30 !bg-white/10 !py-2 !px-3 text-xs"
          >
            {farmerText("smsSimulator", "SMS Simulator")}
          </Link>

        </div>
      </div>

      {/* Wastage Alerts */}
      {alerts.length > 0 && (

        <div className="card border-2 border-harvest-500">

          <h2 className="font-display text-xl flex items-center gap-2">
            <AlertTriangle className="text-harvest-500" />
            {farmerText("alerts", "Wastage alerts")}
          </h2>

          <ul className="mt-3 space-y-2">

            {alerts.map((a) => (

              <li
                key={a.listing_id}
                className="rounded-2xl bg-cream-100 p-3 text-sm"
              >
                {wastageAlertText(a)}
              </li>

            ))}

          </ul>
        </div>
      )}

      {/* Listings + Trends */}
      <div className="grid gap-6 md:grid-cols-2">

        {/* Active Listings */}
        <div className="card">

          <div className="flex items-center justify-between mb-3">

            <h2 className="font-display text-xl">
              {farmerText("active", "Active listings")}
            </h2>

            <Link
              to="/farmer/new"
              className="text-xs font-bold text-leaf-700 underline"
            >
              + {farmerText("addHarvest", "Add harvest")}
            </Link>

          </div>

          {listings.length === 0 ? (

            <div className="rounded-2xl bg-cream-50 p-6 text-center text-sm text-soil-900/60">
              {farmerText("empty", "No listings yet. Create one to see matches.")}
            </div>

          ) : (

            <ul className="space-y-3">

              {listings.map((l) => (

                <li
                  key={l.id}
                  className="rounded-2xl border border-leaf-900/10 p-3.5 hover:shadow-sm transition bg-white/70"
                >

                  <div className="flex justify-between items-start gap-2">

                    <div>

                      <p className="font-bold text-leaf-950">
                        {cropLabel(l.crop)} ·{" "}
                        {formatNumber(l.quantity)}{" "}
                        {farmerText("quintals", "quintals")} ·{" "}
                        {farmerText("grade", "Grade")}{" "}
                        {l.quality_grade}
                      </p>

                      <p className="text-xs text-soil-900/70 mt-0.5">
                        ₹{formatNumber(
                          l.farmer_asking_price
                        )} /q ·{" "}
                        {l.district}
                      </p>

                    </div>

                    <div className="flex flex-col items-end gap-1">

                      <StatusBadge
                        status={l.status}
                      />

                      {l.risk_flagged && (
                        <span className="text-[10px] bg-red-100 text-red-700 font-bold px-1.5 py-0.5 rounded">
                          {farmerText("reviewFlag", "Review flag")}
                        </span>
                      )}

                    </div>
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-leaf-900/5 flex items-center justify-between text-xs">

                    <span className="text-soil-900/60">
                      {farmerText("fairBand", "Fair band")}: ₹
                      {formatNumber(
                        l.recommended_price_min
                      )}{" "}
                      - ₹
                      {formatNumber(
                        l.recommended_price_max
                      )}
                    </span>

                    <Link
                      className="font-bold text-leaf-900 underline"
                      to={`/farmer/matches/${l.id}`}
                    >
                      {farmerText("matches", "Matched buyers")} →
                    </Link>

                  </div>

                </li>

              ))}

            </ul>
          )}

        </div>

        {/* Trends */}
        <div className="card">

          <h2 className="font-display text-xl mb-1">
            {farmerText("trends", "Cached price trends")}
          </h2>

          <p className="text-xs text-soil-900/60 mb-3">
            {farmerText("trendDescription", "Cached market trend for")}{" "}
            {t.crops?.Wheat || "Wheat"}{" "}
            {farmerText("in", "in")}{" "}
            {user?.district ||
              farmerText("defaultDistrict", "Nashik")}
          </p>

          <PriceChart
            history={trend?.history || []}
            min={trend?.recommended_price_min}
            max={trend?.recommended_price_max}
            target={trend?.target_price}
          />

        </div>

      </div>

    </div>
  );
}
