import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ShieldCheck,
  ArrowRight,
} from "lucide-react";
import { api } from "../services/api";
import { useLang } from "../context/LanguageContext";

export default function AdminDashboard() {
  const { t, lang } = useLang();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  const locale =
    lang === "hi"
      ? "hi-IN"
      : lang === "mr"
      ? "mr-IN"
      : "en-IN";

  const formatNumber = (value) =>
    Number(value || 0).toLocaleString(locale);

  const translateRole = (role) => {
    if (role === "farmer") return t.roles.farmer;
    if (role === "buyer") return t.roles.buyer;
    if (role === "admin") return t.roles.admin;
    return role || t.roles.buyer;
  };

  const translateStatus = (status) => {
    if (!status) return "";
    return t.status?.[status] || t.admin?.statusPending || status;
  };

  const load = async () => {
    try {
      setError("");
      const r = await api.get("/api/admin/overview");
      setData(r.data);
    } catch (e) {
      setError(
        e?.response?.data?.error ||
          e?.message ||
          t.admin.loadFailed
      );
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (error) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="card text-center">
          <p className="text-red-700 font-semibold">
            {error}
          </p>

          <button
            type="button"
            onClick={load}
            className="btn-primary mt-4"
          >
            {t.admin.tryAgain}
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <p className="p-8 text-center text-sm text-soil-900/60">
        {t.admin.loading}
      </p>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">

        <div>
          <h1 className="font-display text-3xl font-bold text-leaf-950">
            {t.admin.title}
          </h1>

          <p className="text-xs text-soil-900/60">
            {t.admin.database}:{" "}
            {data.using_mongomock
              ? "MongoMock"
              : "MongoDB"}
          </p>
        </div>

        <Link
          to="/admin/verifications"
          className="btn-primary !py-2.5 !px-5 text-sm self-start sm:self-auto"
        >
          <ShieldCheck size={16} />
          {t.admin.verificationPortal}
          <ArrowRight size={16} />
        </Link>

      </div>

      {/* Verification Hero */}
      <div className="card bg-leaf-900 text-cream-50 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border border-leaf-700/40 shadow-xl">

        <div className="space-y-1.5">

          <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-harvest-400">
            <ShieldCheck size={16} />
            {t.admin.verificationQueueActive}
          </div>

          <h2 className="font-display text-2xl font-bold text-cream-50">
            {t.admin.userVerificationTitle}
          </h2>

          <p className="text-xs text-cream-100/80 max-w-xl">
            {t.admin.userVerificationBody}
          </p>

        </div>

        <Link
          to="/admin/verifications"
          className="btn-gold !py-3 !px-6 text-sm shrink-0"
        >
          {t.admin.openVerificationQueue} (
          {formatNumber(
            data.counts?.pending_verifications
          )})
          <ArrowRight size={16} />
        </Link>

      </div>

      {/* Counts */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">

        <div className="card text-center p-4">
          <p className="text-xs font-semibold text-soil-900/60 uppercase">
            {t.admin.farmers}
          </p>
          <p className="font-display text-3xl font-bold text-leaf-950">
            {formatNumber(data.counts?.farmers)}
          </p>
        </div>

        <div className="card text-center p-4">
          <p className="text-xs font-semibold text-soil-900/60 uppercase">
            {t.admin.buyers}
          </p>
          <p className="font-display text-3xl font-bold text-leaf-950">
            {formatNumber(data.counts?.buyers)}
          </p>
        </div>

        <div className="card text-center p-4">
          <p className="text-xs font-semibold text-soil-900/60 uppercase">
            {t.admin.listings}
          </p>
          <p className="font-display text-3xl font-bold text-leaf-950">
            {formatNumber(data.counts?.listings)}
          </p>
        </div>

        <div className="card text-center p-4">
          <p className="text-xs font-semibold text-soil-900/60 uppercase">
            {t.admin.orders}
          </p>
          <p className="font-display text-3xl font-bold text-leaf-950">
            {formatNumber(data.counts?.orders)}
          </p>
        </div>

        <div className="card text-center p-4">
          <p className="text-xs font-semibold text-soil-900/60 uppercase">
            {t.admin.pendingReview}
          </p>
          <p className="font-display text-3xl font-bold text-harvest-500">
            {formatNumber(
              data.counts?.pending_verifications
            )}
          </p>
        </div>

      </div>

      {/* GMV Metrics */}
      <div className="grid md:grid-cols-3 gap-4">

        <div className="card p-5">
          <p className="text-xs font-semibold text-soil-900/60 uppercase">
            {t.admin.totalGmv}
          </p>
          <p className="font-display text-2xl font-bold text-leaf-950">
            ₹{formatNumber(data.gmv)}
          </p>
        </div>

        <div className="card p-5">
          <p className="text-xs font-semibold text-soil-900/60 uppercase">
            {t.admin.escrowHeld}
          </p>
          <p className="font-display text-2xl font-bold text-harvest-500">
            ₹{formatNumber(data.escrow_held_value)}
          </p>
        </div>

        <div className="card p-5">
          <p className="text-xs font-semibold text-soil-900/60 uppercase">
            {t.admin.directPayouts}
          </p>
          <p className="font-display text-2xl font-bold text-leaf-700">
            ₹{formatNumber(data.released_value)}
          </p>
        </div>

      </div>

      {/* Verification Queue */}
      <div className="card">

        <div className="flex items-center justify-between mb-4">

          <h2 className="font-display text-xl font-bold text-leaf-950">
            {t.admin.pending}
          </h2>

          <Link
            to="/admin/verifications"
            className="text-xs font-bold text-leaf-700 underline"
          >
            {t.admin.viewAll} (
            {formatNumber(
              data.pending_verifications?.length
            )}) →
          </Link>

        </div>

        {!data.pending_verifications ||
        data.pending_verifications.length === 0 ? (
          <p className="text-sm text-soil-900/60">
            {t.admin.queueClear}
          </p>
        ) : (
          <ul className="space-y-2.5">

            {data.pending_verifications
              .slice(0, 5)
              .map((b) => (

                <li
                  key={b.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-2xl bg-cream-50 p-3.5 border border-leaf-900/10"
                >

                  <div>

                    <div className="flex items-center gap-2 flex-wrap">

                      <span className="font-bold text-sm text-leaf-950">
                        {b.name || b.business_name}
                      </span>

                      <span className="text-[10px] bg-leaf-100 text-leaf-900 font-bold px-2 py-0.5 rounded-full uppercase">
                        {translateRole(b.role)}
                      </span>

                      <span className="text-xs text-harvest-500 font-semibold">
                        {translateStatus(b.status)}
                      </span>

                    </div>

                    <p className="text-xs text-soil-900/70 mt-0.5">
                      {t.admin.phone}: +91{" "}
                      {b.phone || t.admin.notAvailable} ·{" "}
                      {t.admin.district}:{" "}
                      {b.district || t.admin.notAvailable}
                    </p>

                  </div>

                  <Link
                    to="/admin/verifications"
                    className="btn-primary !py-1.5 !px-3 text-xs self-start sm:self-auto"
                  >
                    {t.admin.reviewDetails}
                    <ArrowRight size={14} />
                  </Link>

                </li>

              ))}

          </ul>
        )}

      </div>

      {/* Escrow Flags */}
      <div className="card">

        <h2 className="font-display text-xl font-bold text-leaf-950 mb-3">
          {t.admin.flags}
        </h2>

        {!data.escrow_flags ||
        data.escrow_flags.length === 0 ? (
          <p className="text-sm text-soil-900/60">
            {t.admin.noPaymentFlags}
          </p>
        ) : (
          <ul className="space-y-2">

            {data.escrow_flags.map((f) => (

              <li
                key={f.id}
                className="rounded-2xl border border-leaf-900/10 p-3 text-xs bg-cream-50"
              >
                {t.admin.order} #
                {f.id?.slice(-6)?.toUpperCase()} · ₹
                {formatNumber(f.total_amount)} ·{" "}
                {t.admin.delivery}:{" "}
                {f.delivery_status || t.admin.notAvailable}
                {" / "}
                {t.admin.payment}:{" "}
                {f.payment_status || t.admin.notAvailable}
              </li>

            ))}

          </ul>
        )}

      </div>

    </div>
  );
}
