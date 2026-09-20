import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ShieldCheck,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import { api } from "../services/api";
import { useLang } from "../context/LanguageContext";

export default function AdminDashboard() {
  const { t, lang } = useLang();

  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const locale =
    lang === "hi"
      ? "hi-IN-u-nu-deva"
      : lang === "mr"
      ? "mr-IN-u-nu-deva"
      : "en-IN";

  const formatNumber = (value) =>
    Number(value || 0).toLocaleString(locale);

  const translateRole = (role) => {
    if (role === "farmer") {
      return t.roles?.farmer || "Farmer";
    }

    if (role === "buyer") {
      return t.roles?.buyer || "Buyer";
    }

    if (role === "admin") {
      return t.roles?.admin || "Admin";
    }

    return role || "";
  };

  const translateStatus = (status) => {
    if (!status) {
      return t.admin?.pending || "Pending";
    }

    const labels = {
      PENDING:
        t.admin?.pending || "Pending",

      SUBMITTED:
        t.verification?.submitted || "Submitted",

      UNDER_REVIEW:
        t.admin?.underReview || "Under Review",

      VERIFIED:
        t.admin?.fullyVerified || "Fully Verified",

      REJECTED:
        t.admin?.rejected || "Rejected",

      SUSPENDED:
        t.admin?.suspended || "Suspended",

      listed:
        t.status?.listed || "Listed",

      matched:
        t.status?.matched || "Matched",

      in_transit:
        t.status?.in_transit || "In Transit",

      delivered:
        t.status?.delivered || "Delivered",

      payment_released:
        t.status?.payment_released || "Paid",
    };

    return labels[status] || status;
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get(
        "/api/admin/overview"
      );

      setData(response.data);
    } catch (e) {
      setError(
        e?.response?.data?.error ||
          e?.message ||
          t.admin?.loadFailed ||
          "Unable to load the admin dashboard."
      );
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading && !data) {
    return (
      <div className="flex min-h-[300px] items-center justify-center p-8">
        <div className="text-center">
          <RefreshCw
            size={24}
            className="mx-auto mb-3 animate-spin text-leaf-700"
          />
          <p className="text-sm text-soil-900/60">
            {t.admin?.loading ||
              "Loading admin dashboard..."}
          </p>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="card text-center">
          <p className="font-semibold text-red-700">
            {error}
          </p>

          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="btn-primary mt-4 inline-flex items-center gap-2"
          >
            <RefreshCw
              size={15}
              className={
                loading ? "animate-spin" : ""
              }
            />
            {t.admin?.tryAgain ||
              "Try Again"}
          </button>
        </div>
      </div>
    );
  }

  const counts = data?.counts || {};
  const pendingVerifications =
    data?.pending_verifications || [];
  const escrowFlags = data?.escrow_flags || [];

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      {/* Header */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-3xl font-bold text-leaf-950">
            {t.admin?.title ||
              "Platform Overview"}
          </h1>

          <p className="text-xs text-soil-900/60">
            {t.admin?.database ||
              "Database"}:{" "}
            {data?.using_mongomock
              ? "MongoMock"
              : "MongoDB"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="btn-ghost !px-3 !py-2 text-sm"
          >
            <RefreshCw
              size={15}
              className={
                loading ? "animate-spin" : ""
              }
            />
            {loading
              ? t.admin?.refreshing ||
                "Refreshing..."
              : t.admin?.refreshList ||
                "Refresh"}
          </button>

          <Link
            to="/admin/verifications"
            className="btn-primary !px-4 !py-2.5 text-sm"
          >
            <ShieldCheck size={16} />

            {t.admin?.verificationPortal ||
              "Verification Portal"}

            <ArrowRight size={16} />
          </Link>
        </div>
      </div>

      {/* Error while retaining current data */}
      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800">
          {error}
        </div>
      )}

      {/* Verification Hero */}
      <div className="card flex flex-col justify-between gap-4 border border-leaf-700/40 bg-leaf-900 p-6 text-cream-50 shadow-xl md:flex-row md:items-center">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-harvest-400">
            <ShieldCheck size={16} />

            {t.admin?.verificationQueueActive ||
              "Verification Queue Active"}
          </div>

          <h2 className="font-display text-2xl font-bold text-cream-50">
            {t.admin?.userVerificationTitle ||
              "User Verification Management"}
          </h2>

          <p className="max-w-xl text-xs text-cream-100/80">
            {t.admin?.userVerificationBody ||
              "Review submitted verification details and approve or reject marketplace accounts."}
          </p>
        </div>

        <Link
          to="/admin/verifications"
          className="btn-gold shrink-0 !px-6 !py-3 text-sm"
        >
          {t.admin?.openVerificationQueue ||
            "Open Verification Queue"}{" "}
          (
          {formatNumber(
            counts.pending_verifications
          )}
          )
          <ArrowRight size={16} />
        </Link>
      </div>

      {/* Counts */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <div className="card p-4 text-center">
          <p className="text-xs font-semibold uppercase text-soil-900/60">
            {t.admin?.farmers || "Farmers"}
          </p>

          <p className="font-display text-3xl font-bold text-leaf-950">
            {formatNumber(counts.farmers)}
          </p>
        </div>

        <div className="card p-4 text-center">
          <p className="text-xs font-semibold uppercase text-soil-900/60">
            {t.admin?.buyers || "Buyers"}
          </p>

          <p className="font-display text-3xl font-bold text-leaf-950">
            {formatNumber(counts.buyers)}
          </p>
        </div>

        <div className="card p-4 text-center">
          <p className="text-xs font-semibold uppercase text-soil-900/60">
            {t.admin?.listings || "Listings"}
          </p>

          <p className="font-display text-3xl font-bold text-leaf-950">
            {formatNumber(counts.listings)}
          </p>
        </div>

        <div className="card p-4 text-center">
          <p className="text-xs font-semibold uppercase text-soil-900/60">
            {t.admin?.orders || "Orders"}
          </p>

          <p className="font-display text-3xl font-bold text-leaf-950">
            {formatNumber(counts.orders)}
          </p>
        </div>

        <div className="card p-4 text-center">
          <p className="text-xs font-semibold uppercase text-soil-900/60">
            {t.admin?.pendingReview ||
              "Pending Review"}
          </p>

          <p className="font-display text-3xl font-bold text-harvest-500">
            {formatNumber(
              counts.pending_verifications
            )}
          </p>
        </div>
      </div>

      {/* GMV */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="card p-5">
          <p className="text-xs font-semibold uppercase text-soil-900/60">
            {t.admin?.totalGmv ||
              "Total GMV"}
          </p>

          <p className="font-display text-2xl font-bold text-leaf-950">
            ₹{formatNumber(data?.gmv)}
          </p>
        </div>

        <div className="card p-5">
          <p className="text-xs font-semibold uppercase text-soil-900/60">
            {t.admin?.escrowHeld ||
              "Escrow Held"}
          </p>

          <p className="font-display text-2xl font-bold text-harvest-500">
            ₹{formatNumber(data?.escrow_held_value)}
          </p>
        </div>

        <div className="card p-5">
          <p className="text-xs font-semibold uppercase text-soil-900/60">
            {t.admin?.directPayouts ||
              "Direct Payouts"}
          </p>

          <p className="font-display text-2xl font-bold text-leaf-700">
            ₹{formatNumber(data?.released_value)}
          </p>
        </div>
      </div>

      {/* Verification Queue */}
      <div className="card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl font-bold text-leaf-950">
            {t.admin?.pending ||
              "Pending Verification"}
          </h2>

          <Link
            to="/admin/verifications"
            className="text-xs font-bold text-leaf-700 underline"
          >
            {t.admin?.viewAll || "View All"} (
            {formatNumber(
              pendingVerifications.length
            )}
            ) →
          </Link>
        </div>

        {pendingVerifications.length === 0 ? (
          <p className="text-sm text-soil-900/60">
            {t.admin?.queueClear ||
              "The verification queue is clear."}
          </p>
        ) : (
          <ul className="space-y-2.5">
            {pendingVerifications
              .slice(0, 5)
              .map((item) => (
                <li
                  key={item.id}
                  className="flex flex-col justify-between gap-2 rounded-2xl border border-leaf-900/10 bg-cream-50 p-3.5 sm:flex-row sm:items-center"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold text-leaf-950">
                        {item.name ||
                          item.business_name ||
                          t.admin?.unknownUser ||
                          "User"}
                      </span>

                      <span className="rounded-full bg-leaf-100 px-2 py-0.5 text-[10px] font-bold uppercase text-leaf-900">
                        {translateRole(item.role)}
                      </span>

                      <span className="text-xs font-semibold text-harvest-500">
                        {translateStatus(item.status)}
                      </span>
                    </div>

                    <p className="mt-0.5 text-xs text-soil-900/70">
                      {t.admin?.phone || "Phone"}:{" "}
                      +91 XXXXX XXXXX ·{" "}
                      {t.admin?.district ||
                        "District"}:{" "}
                      {item.district ||
                        t.admin?.notAvailable ||
                        "N/A"}
                    </p>
                  </div>

                  <Link
                    to="/admin/verifications"
                    className="btn-primary self-start !px-3 !py-1.5 text-xs sm:self-auto"
                  >
                    {t.admin?.reviewDetails ||
                      "Review Details"}

                    <ArrowRight size={14} />
                  </Link>
                </li>
              ))}
          </ul>
        )}
      </div>

      {/* Escrow Flags */}
      <div className="card">
        <h2 className="mb-3 font-display text-xl font-bold text-leaf-950">
          {t.admin?.flags ||
            "Escrow / Transaction Flags"}
        </h2>

        {escrowFlags.length === 0 ? (
          <p className="text-sm text-soil-900/60">
            {t.admin?.noPaymentFlags ||
              "No payment flags are currently detected."}
          </p>
        ) : (
          <ul className="space-y-2">
            {escrowFlags.map((flag) => (
              <li
                key={flag.id}
                className="rounded-2xl border border-leaf-900/10 bg-cream-50 p-3 text-xs"
              >
                {t.admin?.order || "Order"} #
                {flag.id
                  ?.slice(-6)
                  ?.toUpperCase()}{" "}
                · ₹
                {formatNumber(
                  flag.total_amount
                )}{" "}
                ·{" "}
                {t.admin?.delivery ||
                  "Delivery"}:{" "}
                {translateStatus(
                  flag.delivery_status
                )}{" "}
                /{" "}
                {t.admin?.payment ||
                  "Payment"}:{" "}
                {translateStatus(
                  flag.payment_status
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
