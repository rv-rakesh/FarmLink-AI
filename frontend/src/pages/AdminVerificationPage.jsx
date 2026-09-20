import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Clock,
  RefreshCw,
  Eye,
  X,
  Filter,
} from "lucide-react";
import { useLang } from "../context/LanguageContext";
import VerificationBadge from "../components/VerificationBadge";
import TrustScore from "../components/TrustScore";
import VerificationChecklist from "../components/VerificationChecklist";
import {
  getAdminVerifications,
  getAdminVerificationDetail,
  approveVerification,
  rejectVerification,
  suspendVerification,
  requestMoreVerificationInfo,
  getVerificationStats,
  getRiskFlags,
} from "../services/api";

export default function AdminVerificationPage() {
  const nav = useNavigate();
  const { t, lang } = useLang();

  const [tab, setTab] = useState("all");
  const [roleFilter, setRoleFilter] = useState("");
  const [verifications, setVerifications] = useState([]);
  const [stats, setStats] = useState(null);
  const [riskFlags, setRiskFlags] = useState({
    listings: [],
    accounts: [],
  });

  const [loading, setLoading] = useState(true);
  const [selectedVerif, setSelectedVerif] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [adminNotes, setAdminNotes] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);

  const [actionSuccess, setActionSuccess] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionBusy, setActionBusy] = useState(false);

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
      return t.admin?.pending || "Pending";
    }

    return new Date(value).toLocaleDateString(locale, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const roleLabel = (role) => {
    if (role === "farmer") {
      return t.admin?.farmer || "Farmer";
    }

    if (role === "buyer") {
      return t.admin?.buyer || "Buyer";
    }

    return role;
  };

  const statusLabel = (status) => {
    const labels = {
      UNDER_REVIEW:
        t.admin?.underReview || "Under Review",
      PENDING:
        t.admin?.pending || "Pending",
      VERIFIED:
        t.admin?.verified || "Verified",
      REJECTED:
        t.admin?.rejected || "Rejected",
      SUSPENDED:
        t.admin?.suspended || "Suspended",
    };

    return labels[status] || status;
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    setActionError("");

    try {
      const statusParam =
        tab === "all" || tab === "flags"
          ? ""
          : tab.toUpperCase();

      const [list, st, rf] = await Promise.all([
        getAdminVerifications(statusParam, roleFilter),
        getVerificationStats(),
        getRiskFlags(),
      ]);

      setVerifications(list || []);
      setStats(st || null);
      setRiskFlags(
        rf || {
          listings: [],
          accounts: [],
        }
      );
    } catch (e) {
      setActionError(
        e.response?.data?.error ||
          e.message ||
          t.admin?.loadFailed ||
          "Unable to load admin verification data."
      );
    } finally {
      setLoading(false);
    }
  }, [tab, roleFilter, t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSelect = async (v) => {
    if (detailLoading || actionBusy) return;

    setDetailLoading(true);
    setActionError("");

    try {
      const detail = await getAdminVerificationDetail(v.id);

      setSelectedVerif(detail);
      setAdminNotes(detail.admin_notes || "");
    } catch (e) {
      setSelectedVerif(v);
      setAdminNotes(v.admin_notes || "");

      setActionError(
        e.response?.data?.error ||
          e.message ||
          t.admin?.detailFailed ||
          "Could not load complete verification details."
      );
    } finally {
      setDetailLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedVerif || actionBusy) return;

    setActionBusy(true);
    setActionError("");
    setActionSuccess("");

    try {
      await approveVerification(
        selectedVerif.id,
        adminNotes
      );

      setActionSuccess(
        t.admin?.approveSuccess ||
          "Verification approved successfully."
      );

      setSelectedVerif(null);
      await loadData();
    } catch (e) {
      setActionError(
        e.response?.data?.error ||
          e.message ||
          t.admin?.approveFailed ||
          "Failed to approve verification."
      );
    } finally {
      setActionBusy(false);
    }
  };

  const handleReject = async () => {
    if (
      !selectedVerif ||
      !rejectReason.trim() ||
      actionBusy
    ) {
      return;
    }

    setActionBusy(true);
    setActionError("");
    setActionSuccess("");

    try {
      await rejectVerification(
        selectedVerif.id,
        rejectReason.trim()
      );

      setActionSuccess(
        t.admin?.rejectSuccess ||
          "Verification rejected."
      );

      setShowRejectModal(false);
      setRejectReason("");
      setSelectedVerif(null);

      await loadData();
    } catch (e) {
      setActionError(
        e.response?.data?.error ||
          e.message ||
          t.admin?.rejectFailed ||
          "Failed to reject verification."
      );
    } finally {
      setActionBusy(false);
    }
  };

  const handleSuspend = async () => {
    if (!selectedVerif || actionBusy) return;

    const confirmed = window.confirm(
      t.admin?.suspendConfirm ||
        "Are you sure you want to suspend this account?"
    );

    if (!confirmed) return;

    setActionBusy(true);
    setActionError("");
    setActionSuccess("");

    try {
      await suspendVerification(
        selectedVerif.id,
        t.admin?.administrativeSuspension ||
          "Administrative suspension"
      );

      setActionSuccess(
        t.admin?.suspendSuccess ||
          "Account suspended."
      );

      setSelectedVerif(null);
      await loadData();
    } catch (e) {
      setActionError(
        e.response?.data?.error ||
          e.message ||
          t.admin?.suspendFailed ||
          "Failed to suspend the account."
      );
    } finally {
      setActionBusy(false);
    }
  };

  const handleRequestInfo = async () => {
    if (!selectedVerif || actionBusy) return;

    setActionBusy(true);
    setActionError("");
    setActionSuccess("");

    try {
      await requestMoreVerificationInfo(
        selectedVerif.id,
        adminNotes?.trim() ||
          t.admin?.defaultInfoRequest ||
          "Please provide clearer verification evidence."
      );

      setActionSuccess(
        t.admin?.infoSuccess ||
          "Additional information requested."
      );

      setSelectedVerif(null);
      await loadData();
    } catch (e) {
      setActionError(
        e.response?.data?.error ||
          e.message ||
          t.admin?.infoFailed ||
          "Failed to request additional information."
      );
    } finally {
      setActionBusy(false);
    }
  };

  const tabs = [
    {
      key: "all",
      label: t.admin?.allRecords || "All Records",
    },
    {
      key: "under_review",
      label:
        t.admin?.underReviewTab ||
        "Under Review ⟳",
    },
    {
      key: "verified",
      label:
        t.admin?.verifiedTab ||
        "Verified ✓",
    },
    {
      key: "pending",
      label: t.admin?.pendingTab || "Pending",
    },
    {
      key: "rejected",
      label:
        t.admin?.rejectedTab || "Rejected",
    },
    {
      key: "suspended",
      label:
        t.admin?.suspendedTab || "Suspended",
    },
    {
      key: "flags",
      label:
        t.admin?.riskFlagsTab ||
        "Risk Flags ⚠",
    },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Header */}
      <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <button
            onClick={() => nav("/admin")}
            disabled={loading && detailLoading}
            className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-leaf-900 hover:text-leaf-700"
          >
            <ArrowLeft size={16} />
            {t.admin?.backOverview ||
              "Back to Admin Overview"}
          </button>

          <h1 className="font-display text-3xl font-bold text-leaf-950">
            {t.admin?.verificationTitle ||
              "Verification Management & Audit"}
          </h1>

          <p className="text-sm text-soil-900/70">
            {t.admin?.verificationSubtitle ||
              "Review identity submissions, inspect evidence, evaluate trust information, and manage verification records."}
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="btn-ghost self-start !px-4 !py-2 text-sm md:self-auto"
        >
          <RefreshCw
            size={15}
            className={
              loading ? "animate-spin" : ""
            }
          />
          {loading
            ? t.admin?.refreshing || "Refreshing..."
            : t.admin?.refreshList || "Refresh List"}
        </button>
      </div>

      {/* Success */}
      {actionSuccess && (
        <div className="mb-4 flex items-center justify-between rounded-2xl border border-leaf-700/30 bg-leaf-100/50 p-3 text-sm text-leaf-900">
          <div className="flex items-center gap-2">
            <CheckCircle2
              size={18}
              className="text-leaf-700"
            />
            <span>{actionSuccess}</span>
          </div>

          <button
            onClick={() => setActionSuccess("")}
            type="button"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Error */}
      {actionError && (
        <div className="mb-4 flex items-center justify-between rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <span>{actionError}</span>

          <button
            onClick={() => setActionError("")}
            type="button"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-5">
        <div className="card p-3 text-center">
          <p className="text-xs font-semibold uppercase text-soil-900/60">
            {t.admin?.underReview || "Under Review"}
          </p>
          <p className="font-display text-2xl font-bold text-harvest-500">
            {formatNumber(
              stats?.by_status?.UNDER_REVIEW
            )}
          </p>
        </div>

        <div className="card p-3 text-center">
          <p className="text-xs font-semibold uppercase text-soil-900/60">
            {t.admin?.pendingDetails ||
              "Pending Details"}
          </p>
          <p className="font-display text-2xl font-bold text-soil-900">
            {formatNumber(
              stats?.by_status?.PENDING
            )}
          </p>
        </div>

        <div className="card p-3 text-center">
          <p className="text-xs font-semibold uppercase text-soil-900/60">
            {t.admin?.fullyVerified ||
              "Fully Verified"}
          </p>
          <p className="font-display text-2xl font-bold text-leaf-700">
            {formatNumber(
              stats?.by_status?.VERIFIED
            )}
          </p>
        </div>

        <div className="card p-3 text-center">
          <p className="text-xs font-semibold uppercase text-soil-900/60">
            {t.admin?.rejected || "Rejected"}
          </p>
          <p className="font-display text-2xl font-bold text-red-600">
            {formatNumber(
              stats?.by_status?.REJECTED
            )}
          </p>
        </div>

        <div className="card p-3 text-center">
          <p className="text-xs font-semibold uppercase text-soil-900/60">
            {t.admin?.riskFlagged ||
              "Risk Flagged"}
          </p>
          <p className="font-display text-2xl font-bold text-red-700">
            {formatNumber(
              (riskFlags.listings?.length || 0) +
                (riskFlags.accounts?.length || 0)
            )}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-leaf-900/10 pb-3">
        <div className="flex flex-wrap gap-2 text-sm font-semibold">
          {tabs.map((item) => (
            <button
              key={item.key}
              onClick={() => setTab(item.key)}
              disabled={loading && tab === item.key}
              className={`rounded-xl px-3.5 py-1.5 text-xs transition ${
                tab === item.key
                  ? "bg-leaf-900 font-bold text-cream-50 shadow-card"
                  : "bg-white text-soil-900/70 hover:bg-cream-50"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Filter
            size={14}
            className="text-soil-900/60"
          />

          <select
            className="rounded-xl border border-leaf-900/15 bg-white px-2.5 py-1 text-xs font-semibold text-soil-950"
            value={roleFilter}
            onChange={(e) =>
              setRoleFilter(e.target.value)
            }
          >
            <option value="">
              {t.admin?.allRoles || "All Roles"}
            </option>
            <option value="farmer">
              {t.admin?.farmersOnly ||
                "Farmers Only"}
            </option>
            <option value="buyer">
              {t.admin?.buyersOnly ||
                "Buyers Only"}
            </option>
          </select>
        </div>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* List */}
        <div
          className={
            selectedVerif
              ? "lg:col-span-7"
              : "lg:col-span-12"
          }
        >
          {tab === "flags" ? (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-soil-950">
                {t.admin?.flaggedTitle ||
                  "Flagged Listings & Anomalies"}
              </h3>

              {riskFlags.listings?.length === 0 &&
              riskFlags.accounts?.length === 0 ? (
                <div className="card p-8 text-center text-sm text-soil-900/60">
                  {t.admin?.noRiskFlags ||
                    "No risk flags are currently detected."}
                </div>
              ) : (
                <div className="space-y-3">
                  {riskFlags.listings?.map((listing) => (
                    <div
                      key={listing.id}
                      className="card border-l-4 border-l-red-500 p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-bold text-soil-950">
                          {t.crops?.[listing.crop] ||
                            listing.crop}{" "}
                          -{" "}
                          {formatNumber(
                            listing.quantity
                          )}{" "}
                          {t.admin?.quintals ||
                            "Quintals"}
                        </span>

                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-bold text-red-800">
                          {t.admin?.flaggedListing ||
                            "Flagged Listing"}
                        </span>
                      </div>

                      <div className="mt-2 space-y-1">
                        {listing.risk_flags?.map(
                          (rf, i) => (
                            <p
                              key={`${listing.id}-${i}`}
                              className="text-xs font-medium text-red-700"
                            >
                              • {rf.message}
                            </p>
                          )
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {loading ? (
                <div className="card p-8 text-center text-sm text-soil-900/60">
                  {t.admin?.loadingRecords ||
                    "Loading verification records..."}
                </div>
              ) : verifications.length === 0 ? (
                <div className="card p-8 text-center text-sm text-soil-900/60">
                  {t.admin?.noRecords ||
                    "No records found for this filter."}
                </div>
              ) : (
                verifications.map((v) => (
                  <div
                    key={v.id}
                    onClick={() => handleSelect(v)}
                    className={`card cursor-pointer p-4 transition hover:shadow-md ${
                      selectedVerif?.id === v.id
                        ? "ring-2 ring-leaf-700"
                        : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-display text-base font-bold text-leaf-950">
                            {v.name}
                          </span>

                          <span className="rounded-full bg-cream-100 px-2 py-0.5 text-[11px] font-bold uppercase text-soil-900">
                            {roleLabel(v.role)}
                          </span>
                        </div>

                        <p className="mt-1 text-xs text-soil-900/70">
                          {t.admin?.phone || "Phone"}:
                          {" +91 XXXXX XXXXX"} ·{" "}
                          {t.admin?.district ||
                            "District"}
                          : {v.district}
                        </p>
                      </div>

                      <div className="flex flex-col items-end gap-1.5">
                        <VerificationBadge
                          level={v.verification_level}
                          status={v.status}
                          role={v.role}
                          trustScore={v.trust_score}
                          showDetailModal={false}
                          size="sm"
                        />

                        <span className="text-xs font-bold text-soil-900/60">
                          {t.admin?.trust || "Trust"}:{" "}
                          <span className="text-leaf-900">
                            {formatNumber(v.trust_score)}
                            /100
                          </span>
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between border-t border-leaf-900/5 pt-2 text-xs text-soil-900/60">
                      <span>
                        {t.admin?.submitted || "Submitted"}:{" "}
                        {formatDate(v.submitted_at)}
                      </span>

                      <span className="flex items-center gap-1 font-semibold text-leaf-700">
                        <Eye size={13} />
                        {t.admin?.viewDetails ||
                          "View Details →"}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Review panel */}
        {selectedVerif && (
          <div className="lg:col-span-5">
            <div className="card sticky top-20 space-y-4 bg-white shadow-xl">
              <div className="flex items-center justify-between border-b border-leaf-900/10 pb-3">
                <div>
                  <h3 className="font-display text-lg font-bold text-leaf-950">
                    {t.admin?.reviewTitle ||
                      "Verification Review"}
                  </h3>

                  <p className="text-xs text-soil-900/60">
                    {selectedVerif.name} (
                    {roleLabel(selectedVerif.role)})
                  </p>
                </div>

                <button
                  onClick={() =>
                    setSelectedVerif(null)
                  }
                  className="rounded-lg p-1 text-soil-900/50 hover:bg-leaf-100"
                  type="button"
                  disabled={actionBusy}
                >
                  <X size={18} />
                </button>
              </div>

              {detailLoading ? (
                <div className="py-8 text-center text-sm text-soil-900/60">
                  <RefreshCw
                    size={20}
                    className="mx-auto mb-2 animate-spin text-leaf-700"
                  />
                  {t.admin?.loadingDetails ||
                    "Loading details..."}
                </div>
              ) : (
                <>
                  {/* Status */}
                  <div className="rounded-2xl border border-leaf-900/10 bg-cream-50 p-3.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-soil-900">
                        {t.admin?.currentStatus ||
                          "Current Status"}
                      </span>

                      <VerificationBadge
                        level={
                          selectedVerif.verification_level
                        }
                        status={selectedVerif.status}
                        role={selectedVerif.role}
                        trustScore={
                          selectedVerif.trust_score
                        }
                        showDetailModal={false}
                      />
                    </div>

                    <div className="mt-1 text-right text-[11px] font-semibold text-soil-900/50">
                      {statusLabel(selectedVerif.status)}
                    </div>

                    <div className="mt-3">
                      <TrustScore
                        score={
                          selectedVerif.trust_score
                        }
                        breakdown={
                          selectedVerif.trust_score_breakdown
                        }
                      />
                    </div>
                  </div>

                  {/* Credentials */}
                  <div className="space-y-2 text-xs">
                    <h4 className="font-bold uppercase tracking-wider text-leaf-900">
                      {t.admin?.credentials ||
                        "Submitted Credentials"}
                    </h4>

                    <div className="rounded-xl border border-leaf-900/10 p-2.5">
                      <span className="font-semibold text-soil-900">
                        {t.admin?.mobileOtp ||
                          "Mobile OTP"}
                        :{" "}
                      </span>

                      <span
                        className={
                          selectedVerif.phone_verified
                            ? "font-bold text-leaf-700"
                            : "text-soil-900/60"
                        }
                      >
                        {selectedVerif.phone_verified
                          ? t.admin?.otpVerified ||
                            "Verified ✓"
                          : t.admin?.otpNotVerified ||
                            "Not Verified"}
                      </span>
                    </div>

                    <div className="rounded-xl border border-leaf-900/10 p-2.5">
                      <span className="font-semibold text-soil-900">
                        {t.admin?.identityKyc ||
                          "Identity KYC"}
                        :{" "}
                      </span>

                      <span
                        className={
                          selectedVerif.identity_verified
                            ? "font-bold text-leaf-700"
                            : "text-soil-900/60"
                        }
                      >
                        {selectedVerif.identity_verified
                          ? t.admin?.kycVerified ||
                            "Verified"
                          : t.admin?.kycPending ||
                            "Pending KYC"}
                      </span>
                    </div>

                    {selectedVerif.role === "farmer" ? (
                      <div className="rounded-xl border border-leaf-900/10 p-2.5">
                        <span className="font-semibold text-soil-900">
                          {t.admin?.agriculturalEvidence ||
                            "Agricultural Evidence"}
                          :{" "}
                        </span>

                        <p className="mt-1 text-soil-900/80">
                          {t.admin?.type || "Type"}:{" "}
                          <strong>
                            {selectedVerif
                              .agricultural_verification
                              ?.type || "None"}
                          </strong>
                          <br />

                          {t.admin?.reference ||
                            "Reference"}:{" "}
                          <strong>
                            {selectedVerif
                              .agricultural_verification
                              ?.reference || "None"}
                          </strong>
                          <br />

                          {t.admin?.status || "Status"}:{" "}
                          <strong>
                            {selectedVerif
                              .agricultural_verification
                              ?.status || "None"}
                          </strong>
                        </p>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-leaf-900/10 p-2.5">
                        <span className="font-semibold text-soil-900">
                          {t.admin?.businessRegistration ||
                            "Business Registration"}
                          :{" "}
                        </span>

                        <p className="mt-1 text-soil-900/80">
                          {t.admin?.type || "Type"}:{" "}
                          <strong>
                            {selectedVerif
                              .business_verification
                              ?.type || "None"}
                          </strong>
                          <br />

                          {t.admin?.reference ||
                            "Reference"}:{" "}
                          <strong>
                            {selectedVerif
                              .business_verification
                              ?.reference || "None"}
                          </strong>
                          <br />

                          {t.admin?.status || "Status"}:{" "}
                          <strong>
                            {selectedVerif
                              .business_verification
                              ?.status || "None"}
                          </strong>
                        </p>
                      </div>
                    )}

                    <div className="rounded-xl border border-leaf-900/10 p-2.5">
                      <span className="font-semibold text-soil-900">
                        {t.admin?.locationRecord ||
                          "Location Record"}
                        :{" "}
                      </span>

                      <span className="text-soil-900/80">
                        {selectedVerif.district ||
                          "N/A"}
                        ,{" "}
                        {selectedVerif
                          .location_verification
                          ?.state || "India"}
                      </span>
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="label text-xs">
                      {t.admin?.adminNotes ||
                        "Admin Notes"}
                    </label>

                    <textarea
                      rows={2}
                      className="field !py-2 text-xs"
                      placeholder={
                        t.admin?.notesPlaceholder ||
                        "Add notes about document validity or verification checks."
                      }
                      value={adminNotes}
                      onChange={(e) =>
                        setAdminNotes(e.target.value)
                      }
                      disabled={actionBusy}
                    />
                  </div>

                  {/* Actions */}
                  <div className="space-y-2 pt-2">
                    <button
                      type="button"
                      onClick={handleApprove}
                      className="btn-primary flex w-full items-center justify-center gap-2 !py-2.5 text-sm"
                      disabled={actionBusy}
                    >
                      <CheckCircle2 size={16} />

                      {actionBusy
                        ? t.admin?.processing ||
                          "Processing..."
                        : t.admin?.approve ||
                          "Approve & Grant Verified Badge"}
                    </button>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setShowRejectModal(true)
                        }
                        disabled={actionBusy}
                        className="btn-ghost w-full !border-red-300 !py-2 text-xs text-red-700 hover:bg-red-50"
                      >
                        {t.admin?.reject ||
                          "Reject Application"}
                      </button>

                      <button
                        type="button"
                        onClick={handleRequestInfo}
                        disabled={actionBusy}
                        className="btn-ghost w-full !py-2 text-xs"
                      >
                        {actionBusy
                          ? t.admin?.processing ||
                            "Processing..."
                          : t.admin?.requestInfo ||
                            "Request Info"}
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={handleSuspend}
                      disabled={actionBusy}
                      className="w-full pt-1 text-center text-xs font-semibold text-red-600 hover:underline disabled:opacity-50"
                    >
                      {t.admin?.suspend ||
                        "Suspend Account"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Reject modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="card w-full max-w-md bg-white p-6 shadow-2xl">
            <h3 className="font-display text-lg font-bold text-red-950">
              {t.admin?.rejectReasonTitle ||
                "Specify Rejection Reason"}
            </h3>

            <p className="mt-1 text-xs text-soil-900/70">
              {t.admin?.rejectReasonBody ||
                "This message will be shown to the user so they can correct their verification details."}
            </p>

            <textarea
              rows={3}
              className="field mt-3 text-sm"
              placeholder={
                t.admin?.rejectPlaceholder ||
                "Enter the reason for rejection..."
              }
              value={rejectReason}
              onChange={(e) =>
                setRejectReason(e.target.value)
              }
              disabled={actionBusy}
            />

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() =>
                  setShowRejectModal(false)
                }
                disabled={actionBusy}
                className="btn-ghost !py-2 text-xs"
              >
                {t.admin?.cancel || "Cancel"}
              </button>

              <button
                type="button"
                onClick={handleReject}
                disabled={
                  !rejectReason.trim() || actionBusy
                }
                className="btn-primary !bg-red-700 !py-2 text-xs hover:!bg-red-800"
              >
                {actionBusy
                  ? t.admin?.processing ||
                    "Processing..."
                  : t.admin?.confirmRejection ||
                    "Confirm Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
