import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  Phone,
  MapPin,
  User,
  Building2,
  ShieldCheck,
} from "lucide-react";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useLang } from "../context/LanguageContext";
import StatusBadge from "../components/StatusBadge";

const NEXT = {
  matched: "in_transit",
  in_transit: "delivered",
  delivered: "payment_released",
};

const STEPS = [
  "matched",
  "in_transit",
  "delivered",
  "payment_released",
];

export default function OrderTrackingPage() {
  const { orderId } = useParams();
  const { user } = useAuth();
  const { t, lang } = useLang();

  const [order, setOrder] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const locale =
    lang === "hi"
      ? "hi-IN-u-nu-deva"
      : lang === "mr"
      ? "mr-IN-u-nu-deva"
      : "en-IN";

  const formatNumber = (value) =>
    Number(value || 0).toLocaleString(locale);

  const formatDate = (value) => {
    if (!value) {
      return (
        t.order?.pending ||
        "Pending"
      );
    }

    return new Date(value).toLocaleDateString(locale, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const stepLabel = (status) => {
    const labels = {
      matched:
        t.order?.statusMatched || "Matched",
      in_transit:
        t.order?.statusInTransit || "In Transit",
      delivered:
        t.order?.statusDelivered || "Delivered",
      payment_released:
        t.order?.statusPaymentReleased || "Payment Released",
    };

    return labels[status] || status;
  };

  const load = async () => {
    try {
      setErr("");

      const response = await api.get(
        `/api/orders/${orderId}`
      );

      setOrder(response.data);
    } catch (e) {
      setErr(
        e.response?.data?.error ||
          e.message ||
          t.order?.loadFailed ||
          "Unable to load deal details."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    load();
  }, [orderId]);

  const advance = async () => {
    if (updating || !order) return;

    const nxt = NEXT[order.delivery_status];

    if (!nxt) return;

    setUpdating(true);
    setErr("");

    try {
      await api.post(`/api/orders/${orderId}/status`, {
        status: nxt,
      });

      await load();
    } catch (e) {
      setErr(
        e.response?.data?.error ||
          e.message ||
          t.order?.updateFailed ||
          "Unable to update the order."
      );
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-sm text-soil-900/60">
        {t.order?.loading || "Loading deal details..."}
      </div>
    );
  }

  if (!order) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">
          {err ||
            t.order?.notFound ||
            "Order details could not be loaded."}
        </div>

        <Link
          to={
            user?.role === "buyer"
              ? "/buyer"
              : user?.role === "admin"
              ? "/admin"
              : "/farmer"
          }
          className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-leaf-900 hover:text-leaf-700"
        >
          <ArrowLeft size={14} />
          {t.order?.backDashboard || "Back to Dashboard"}
        </Link>
      </div>
    );
  }

  const idx = STEPS.indexOf(order.delivery_status);

  const backPath =
    user?.role === "buyer"
      ? "/buyer"
      : user?.role === "admin"
      ? "/admin"
      : "/farmer";

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      {/* Header */}
      <div>
        <Link
          to={backPath}
          className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold text-leaf-900 hover:text-leaf-700"
        >
          <ArrowLeft size={14} />
          {t.order?.backDashboard || "Back to Dashboard"}
        </Link>

        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <h1 className="font-display text-3xl font-bold text-leaf-950">
            {t.order?.order || "Order"} #
            {String(orderId).slice(-6).toUpperCase()}
          </h1>

          <div className="flex items-center gap-2">
            <StatusBadge status={order.delivery_status} />
            <StatusBadge status={order.payment_status} />
          </div>
        </div>
      </div>

      {/* Farmer + Buyer */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Farmer */}
        <div className="card space-y-2 border-l-4 border-l-leaf-700 p-4">
          <div className="flex items-center gap-2">
            <User size={16} className="text-leaf-700" />

            <h4 className="text-sm font-bold text-leaf-950">
              {t.order?.farmerDetails || "Farmer Details"}
            </h4>
          </div>

          <p className="text-sm font-semibold text-soil-950">
            {order.farmer?.name ||
              t.order?.farmer || "Farmer"}
          </p>

          <p className="flex items-center gap-1 text-xs text-soil-900/70">
            <MapPin
              size={12}
              className="text-leaf-700"
            />

            {order.farmer?.village
              ? `${order.farmer.village}, `
              : ""}

            {order.farmer?.district ||
              t.order?.districtFallback ||
              "Maharashtra"}
          </p>

          {order.farmer?.phone && (
            <p className="flex items-center gap-1 pt-1 font-mono text-xs font-bold text-leaf-900">
              <Phone size={12} />
              +91 XXXXX XXXXX
            </p>
          )}
        </div>

        {/* Buyer */}
        <div className="card space-y-2 border-l-4 border-l-harvest-500 p-4">
          <div className="flex items-center gap-2">
            <Building2
              size={16}
              className="text-harvest-500"
            />

            <h4 className="text-sm font-bold text-leaf-950">
              {t.order?.buyerDetails || "Wholesale Buyer"}
            </h4>
          </div>

          <p className="text-sm font-semibold text-soil-950">
            {order.buyer?.business_name ||
              t.order?.verifiedBuyer ||
              "Verified Wholesale Buyer"}
          </p>

          <p className="flex items-center gap-1 text-xs text-soil-900/70">
            <MapPin
              size={12}
              className="text-harvest-500"
            />
            {order.buyer?.district ||
              t.order?.districtFallback ||
              "Maharashtra"}
          </p>

          {order.buyer?.phone && (
            <p className="flex items-center gap-1 pt-1 font-mono text-xs font-bold text-leaf-900">
              <Phone size={12} />
              +91 XXXXX XXXXX
            </p>
          )}
        </div>
      </div>

      {/* Deal progress */}
      <div className="card p-5">
        <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-soil-900/60">
          {t.order?.dealProgress || "Deal Progress"}
        </h4>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {STEPS.map((status, i) => (
            <div
              key={status}
              className={`rounded-2xl p-2.5 text-center text-xs font-bold transition ${
                i <= idx
                  ? "bg-leaf-900 text-white shadow-sm"
                  : "bg-leaf-100/50 text-leaf-900/40"
              }`}
            >
              {stepLabel(status)}
            </div>
          ))}
        </div>
      </div>

      {/* Trade value */}
      <div className="card flex items-center justify-between bg-leaf-900 p-5 text-cream-50">
        <div>
          <p className="text-xs text-cream-100/80">
            {t.order.escrow}
          </p>

          <p className="font-display text-3xl font-bold text-cream-50">
            ₹{formatNumber(order.total_amount)}
          </p>

          <p className="mt-0.5 text-xs text-cream-100/60">
            {t.order?.pickupScheduled ||
              "Pickup Scheduled"}
            :{" "}
            {formatDate(order.pickup_time)}
          </p>
        </div>

        <div className="text-right">
          <span className="inline-flex items-center gap-1 rounded-full bg-leaf-700/80 px-3 py-1 text-xs font-bold text-cream-50">
            <ShieldCheck size={14} />
            {t.order?.escrowSecured ||
              "Escrow Secured"}
          </span>
        </div>
      </div>

      {/* Error */}
      {err && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-800">
          {err}
        </div>
      )}

      {/* Next action */}
      {NEXT[order.delivery_status] && (
        <button
          className="btn-primary w-full text-base shadow-card"
          onClick={advance}
          disabled={updating}
        >
          {updating
            ? t.order?.updating || "Updating..."
            : order.delivery_status === "delivered" &&
              (user?.role === "buyer" ||
                user?.role === "admin")
            ? t.order?.releasePayment ||
              "Release Payment to Farmer Bank Account ✓"
            : t.order.advance}
        </button>
      )}

      {/* Farmer payment message */}
      {order.delivery_status === "delivered" &&
        user?.role === "farmer" && (
          <div className="rounded-2xl border border-leaf-700/30 bg-leaf-100/40 p-4 text-center text-sm font-semibold text-leaf-900">
            {t.order?.farmerPaymentMessage ||
              "Harvest successfully received. Buyer is releasing payment to your registered bank account."}
          </div>
        )}
    </div>
  );
}
