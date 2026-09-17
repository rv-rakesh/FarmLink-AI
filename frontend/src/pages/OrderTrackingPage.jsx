import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Phone, MapPin, User, Building2, CheckCircle2, ShieldCheck } from "lucide-react";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useLang } from "../context/LanguageContext";
import StatusBadge from "../components/StatusBadge";

const NEXT = {
  matched: "in_transit",
  in_transit: "delivered",
  delivered: "payment_released",
};

export default function OrderTrackingPage() {
  const { orderId } = useParams();
  const { user } = useAuth();
  const { t } = useLang();
  const [order, setOrder] = useState(null);
  const [err, setErr] = useState("");
  const [updating, setUpdating] = useState(false);

  const load = () => api.get(`/api/orders/${orderId}`).then((r) => setOrder(r.data));
  useEffect(() => {
    load();
  }, [orderId]);

  const advance = async () => {
    const nxt = NEXT[order.delivery_status];
    if (!nxt) return;
    setUpdating(true);
    try {
      await api.post(`/api/orders/${orderId}/status`, { status: nxt });
      await load();
    } catch (e) {
      setErr(e.response?.data?.error || e.message);
    } finally {
      setUpdating(false);
    }
  };

  if (!order) return <div className="p-8 text-center text-sm text-soil-900/60">Loading deal details…</div>;

  const steps = ["matched", "in_transit", "delivered", "payment_released"];
  const idx = steps.indexOf(order.delivery_status);
  const backPath = user?.role === "buyer" ? "/buyer" : user?.role === "admin" ? "/admin" : "/farmer";

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
      <div>
        <Link
          to={backPath}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-leaf-900 hover:text-leaf-700 mb-2"
        >
          <ArrowLeft size={14} /> Back to Dashboard
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h1 className="font-display text-3xl font-bold text-leaf-950">
            Order #{orderId.slice(-6).toUpperCase()}
          </h1>
          <div className="flex gap-2 items-center">
            <StatusBadge status={order.delivery_status} />
            <StatusBadge status={order.payment_status} />
          </div>
        </div>
      </div>

      {/* Direct Farmer ↔ Buyer Contact Panel */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Farmer Card */}
        <div className="card p-4 space-y-2 border-l-4 border-l-leaf-700">
          <div className="flex items-center gap-2">
            <User size={16} className="text-leaf-700" />
            <h4 className="font-bold text-sm text-leaf-950">Farmer Details</h4>
          </div>
          <p className="font-semibold text-soil-950 text-sm">{order.farmer?.name || "Farmer"}</p>
          <p className="text-xs text-soil-900/70 flex items-center gap-1">
            <MapPin size={12} className="text-leaf-700" /> {order.farmer?.village ? order.farmer.village + ", " : ""}{order.farmer?.district || "Maharashtra"}
          </p>
          {order.farmer?.phone && (
            <p className="text-xs font-mono font-bold text-leaf-900 flex items-center gap-1 pt-1">
              <Phone size={12} /> +91 {order.farmer.phone}
            </p>
          )}
        </div>

        {/* Buyer Card */}
        <div className="card p-4 space-y-2 border-l-4 border-l-harvest-500">
          <div className="flex items-center gap-2">
            <Building2 size={16} className="text-harvest-500" />
            <h4 className="font-bold text-sm text-leaf-950">Wholesale Buyer</h4>
          </div>
          <p className="font-semibold text-soil-950 text-sm">{order.buyer?.business_name || "Verified Wholesale Buyer"}</p>
          <p className="text-xs text-soil-900/70 flex items-center gap-1">
            <MapPin size={12} className="text-harvest-500" /> {order.buyer?.district || "Maharashtra"}
          </p>
          {order.buyer?.phone && (
            <p className="text-xs font-mono font-bold text-leaf-900 flex items-center gap-1 pt-1">
              <Phone size={12} /> +91 {order.buyer.phone}
            </p>
          )}
        </div>
      </div>

      {/* Step Tracker */}
      <div className="card p-5">
        <h4 className="font-bold text-xs uppercase tracking-wider text-soil-900/60 mb-3">Deal Progress</h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {steps.map((s, i) => (
            <div
              key={s}
              className={`rounded-2xl p-2.5 text-center text-xs font-bold transition ${
                i <= idx
                  ? "bg-leaf-900 text-white shadow-sm"
                  : "bg-leaf-100/50 text-leaf-900/40"
              }`}
            >
              {s.replaceAll("_", " ").toUpperCase()}
            </div>
          ))}
        </div>
      </div>

      {/* Trade Value Card */}
      <div className="card bg-leaf-900 text-cream-50 p-5 flex items-center justify-between">
        <div>
          <p className="text-xs text-cream-100/80">{t.order.escrow}</p>
          <p className="font-display text-3xl font-bold text-cream-50">
            ₹{order.total_amount?.toLocaleString("en-IN")}
          </p>
          <p className="text-xs text-cream-100/60 mt-0.5">Pickup Scheduled: {order.pickup_time ? new Date(order.pickup_time).toLocaleDateString() : "Pending"}</p>
        </div>
        <div className="text-right">
          <span className="inline-flex items-center gap-1 rounded-full bg-leaf-700/80 px-3 py-1 text-xs font-bold text-cream-50">
            <ShieldCheck size={14} /> Escrow Secured
          </span>
        </div>
      </div>

      {err && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-xs text-red-800 font-semibold">
          {err}
        </div>
      )}

      {NEXT[order.delivery_status] && (
        <button
          className="btn-primary w-full text-base shadow-card"
          onClick={advance}
          disabled={updating}
        >
          {updating
            ? "Updating..."
            : order.delivery_status === "delivered" && (user?.role === "buyer" || user?.role === "admin")
            ? "Release Payment to Farmer Bank Account ✓"
            : t.order.advance}
        </button>
      )}

      {order.delivery_status === "delivered" && user?.role === "farmer" && (
        <div className="rounded-2xl border border-leaf-700/30 bg-leaf-100/40 p-4 text-center text-sm font-semibold text-leaf-900">
          Harvest successfully received. Buyer is releasing payment to your registered bank account.
        </div>
      )}
    </div>
  );
}
