import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Phone, MapPin, Building2, ShieldCheck } from "lucide-react";
import { api } from "../services/api";
import { useLang } from "../context/LanguageContext";
import VerificationBadge from "../components/VerificationBadge";

export default function MatchedBuyersPage() {
  const { listingId } = useParams();
  const { t } = useLang();
  const nav = useNavigate();
  const [plan, setPlan] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get(`/api/buyers/matches/${listingId}`).then((r) => setPlan(r.data));
  }, [listingId]);

  const confirm = async () => {
    setLoading(true);
    try {
      const { data } = await api.post("/api/matches/confirm", { listing_id: listingId });
      nav(`/orders/${data.order.id}`);
    } catch (e) {
      setErr(e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  };

  if (!plan) return <div className="p-8 text-center text-sm text-soil-900/60">Loading matched wholesale buyers…</div>;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
      <div>
        <button
          onClick={() => nav("/farmer")}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-leaf-900 hover:text-leaf-700 mb-2"
        >
          <ArrowLeft size={14} /> Back to Dashboard
        </button>
        <h1 className="font-display text-3xl font-bold text-leaf-950">{t.farmer.matches}</h1>
        <p className="mt-1 text-sm text-soil-900/70">
          {plan.crop} · {plan.quantity} Quintals · Asking Price: <strong>₹{plan.agreed_price}/q</strong>
          {plan.split ? " · Split lot allocated across multiple verified buyers" : ""}
        </p>
      </div>

      <div className="space-y-3.5">
        {plan.matched_buyers.map((b) => (
          <div key={b.buyer_id} className="card p-5 hover:shadow-md transition">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-display font-bold text-lg text-leaf-950">{b.business_name}</span>
                  <VerificationBadge
                    level={b.verified ? 4 : 2}
                    status={b.verification_status || (b.verified ? "VERIFIED" : "REGISTERED")}
                    role="buyer"
                    trustScore={b.trust_score || 70}
                    size="sm"
                  />
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-soil-900/70">
                  <span className="flex items-center gap-1">
                    <MapPin size={12} className="text-leaf-700" /> {b.district} ({b.distance_km} km away)
                  </span>
                  {b.gstin && <span>GSTIN: {b.gstin}</span>}
                  {b.phone && (
                    <span className="flex items-center gap-1 font-mono font-bold text-leaf-900">
                      <Phone size={12} /> +91 {b.phone}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="font-display text-2xl font-bold text-leaf-900">{b.allocated_qty} q</p>
                <p className="text-[11px] text-soil-900/50 uppercase font-semibold">Allocated Quantity</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {plan.unallocated_qty > 0 && (
        <div className="rounded-xl bg-harvest-400/20 border border-harvest-500/30 p-3 text-xs text-soil-950 font-semibold">
          Remaining lot: {plan.unallocated_qty} quintals awaiting additional buyer matching.
        </div>
      )}

      <div className="card bg-leaf-900 text-cream-50 p-5 flex items-center justify-between">
        <div>
          <p className="text-xs text-cream-100/80">Estimated Gross Trade Value</p>
          <p className="font-display text-3xl font-extrabold text-cream-50">
            ₹{plan.estimated_total?.toLocaleString("en-IN")}
          </p>
        </div>
        <div className="text-right text-xs text-cream-100/70">
          Direct Payment to Farmer Bank
        </div>
      </div>

      {err && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-800 font-semibold">
          {err}
        </div>
      )}

      <button
        className="btn-primary w-full text-base shadow-card"
        onClick={confirm}
        disabled={loading || !plan.matched_buyers.length}
      >
        {loading ? "Connecting..." : "Confirm Match & Proceed to Deal →"}
      </button>
    </div>
  );
}
