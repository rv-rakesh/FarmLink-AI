import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Phone,
  MapPin,
} from "lucide-react";
import { api } from "../services/api";
import { useLang } from "../context/LanguageContext";
import VerificationBadge from "../components/VerificationBadge";

export default function MatchedBuyersPage() {
  const { listingId } = useParams();
  const { t, lang } = useLang();
  const nav = useNavigate();

  const [plan, setPlan] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);

  const locale =
    lang === "hi"
      ? "hi-IN-u-nu-deva"
      : lang === "mr"
      ? "mr-IN-u-nu-deva"
      : "en-IN";

  const formatNumber = (value) =>
    Number(value || 0).toLocaleString(locale);

  const cropLabel = (crop) => t.crops?.[crop] || crop;

  useEffect(() => {
    let active = true;

    const loadMatches = async () => {
      setLoading(true);
      setErr("");

      try {
        const response = await api.get(
          `/api/buyers/matches/${listingId}`
        );

        if (active) {
          setPlan(response.data);
        }
      } catch (e) {
        if (active) {
          setErr(
            e.response?.data?.error ||
              e.message ||
              t.matches?.loadFailed ||
              "Unable to load matched buyers."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadMatches();

    return () => {
      active = false;
    };
  }, [listingId]);

  const confirm = async () => {
    if (confirming || !plan?.matched_buyers?.length) return;

    setConfirming(true);
    setErr("");

    try {
      const { data } = await api.post("/api/matches/confirm", {
        listing_id: listingId,
      });

      nav(`/orders/${data.order.id}`);
    } catch (e) {
      setErr(
        e.response?.data?.error ||
          e.message ||
          t.matches?.confirmFailed ||
          "Unable to confirm this match."
      );
    } finally {
      setConfirming(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-sm text-soil-900/60">
        {t.matches?.loading || "Loading matched buyers..."}
      </div>
    );
  }

  if (err && !plan) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">
          {err}
        </div>

        <button
          onClick={() => nav("/farmer")}
          className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-leaf-900 hover:text-leaf-700"
        >
          <ArrowLeft size={14} />
          {t.matches?.backDashboard || "Back to Dashboard"}
        </button>
      </div>
    );
  }

  const buyers = plan?.matched_buyers || [];

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      {/* Header */}
      <div>
        <button
          onClick={() => nav("/farmer")}
          className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold text-leaf-900 hover:text-leaf-700"
        >
          <ArrowLeft size={14} />
          {t.matches?.backDashboard || "Back to Dashboard"}
        </button>

        <h1 className="font-display text-3xl font-bold text-leaf-950">
          {t.matches?.title || t.farmer.matches}
        </h1>

        <p className="mt-1 text-sm text-soil-900/70">
          {cropLabel(plan?.crop)} ·{" "}
          {formatNumber(plan?.quantity)}{" "}
          {t.matches?.quintals || "Quintals"} ·{" "}
          {t.matches?.askingPrice || "Asking Price"}:{" "}
          <strong>
            ₹{formatNumber(plan?.agreed_price)}/q
          </strong>

          {plan?.split && (
            <>
              {" · "}
              {t.matches?.splitLot ||
                "Split lot allocated across multiple verified buyers"}
            </>
          )}
        </p>
      </div>

      {/* Buyer matches */}
      {buyers.length > 0 ? (
        <div className="space-y-3.5">
          {buyers.map((b) => (
            <div
              key={b.buyer_id}
              className="card p-5 transition hover:shadow-md"
            >
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-display text-lg font-bold text-leaf-950">
                      {b.business_name}
                    </span>

                    <VerificationBadge
                      level={b.verified ? 4 : 2}
                      status={
                        b.verification_status ||
                        (b.verified
                          ? "VERIFIED"
                          : "REGISTERED")
                      }
                      role="buyer"
                      trustScore={b.trust_score || 70}
                      size="sm"
                    />
                  </div>

                  <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-soil-900/70">
                    <span className="flex items-center gap-1">
                      <MapPin
                        size={12}
                        className="text-leaf-700"
                      />
                      {b.district} (
                      {formatNumber(b.distance_km)}{" "}
                      {t.matches?.kmAway || "km away"})
                    </span>

                    {b.gstin && (
                      <span>
                        {t.matches?.gstin || "GSTIN"}: {b.gstin}
                      </span>
                    )}

                    {b.phone && (
                      <span className="flex items-center gap-1 font-mono font-bold text-leaf-900">
                        <Phone size={12} />
                        +91 {b.phone}
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <p className="font-display text-2xl font-bold text-leaf-900">
                    {formatNumber(b.allocated_qty)} q
                  </p>

                  <p className="text-[11px] font-semibold uppercase text-soil-900/50">
                    {t.matches?.allocatedQuantity ||
                      "Allocated Quantity"}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card p-5 text-center">
          <p className="font-semibold text-soil-900">
            {t.matches?.noMatches ||
              "No verified buyers are matched yet."}
          </p>
          <p className="mt-1 text-sm text-soil-900/60">
            {t.matches?.noMatchesHint ||
              "Your listing remains active for buyer matching."}
          </p>
        </div>
      )}

      {/* Remaining quantity */}
      {Number(plan?.unallocated_qty || 0) > 0 && (
        <div className="rounded-xl border border-harvest-500/30 bg-harvest-400/20 p-3 text-xs font-semibold text-soil-950">
          {t.matches?.remainingLot || "Remaining lot"}:{" "}
          {formatNumber(plan.unallocated_qty)}{" "}
          {t.matches?.quintals || "quintals"}{" "}
          {t.matches?.awaitingMatching ||
            "awaiting additional buyer matching."}
        </div>
      )}

      {/* Trade summary */}
      <div className="card flex items-center justify-between bg-leaf-900 p-5 text-cream-50">
        <div>
          <p className="text-xs text-cream-100/80">
            {t.matches?.estimatedGross ||
              "Estimated Gross Trade Value"}
          </p>

          <p className="font-display text-3xl font-extrabold text-cream-50">
            ₹{formatNumber(plan?.estimated_total)}
          </p>
        </div>

        <div className="text-right text-xs text-cream-100/70">
          {t.matches?.directPayment ||
            "Direct Payment to Farmer Bank"}
        </div>
      </div>

      {/* Error */}
      {err && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-800">
          {err}
        </div>
      )}

      {/* Confirm */}
      <button
        className="btn-primary w-full text-base shadow-card"
        onClick={confirm}
        disabled={confirming || !buyers.length}
      >
        {confirming
          ? t.matches?.connecting || "Connecting..."
          : t.matches?.confirm ||
            "Confirm Match & Proceed to Deal →"}
      </button>
    </div>
  );
}
