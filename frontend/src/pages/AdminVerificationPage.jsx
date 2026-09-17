import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2, XCircle, AlertTriangle, ShieldAlert, ShieldCheck, Clock, RefreshCw, Eye, X, Filter } from "lucide-react";
import VerificationBadge from "../components/VerificationBadge";
import TrustScore from "../components/TrustScore";
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
  const [tab, setTab] = useState("all");
  const [roleFilter, setRoleFilter] = useState("");
  const [verifications, setVerifications] = useState([]);
  const [stats, setStats] = useState(null);
  const [riskFlags, setRiskFlags] = useState({ listings: [], accounts: [] });
  const [loading, setLoading] = useState(true);
  const [selectedVerif, setSelectedVerif] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [actionSuccess, setActionSuccess] = useState("");

  useEffect(() => {
    loadData();
  }, [tab, roleFilter]);

  const loadData = async () => {
    setLoading(true);
    try {
      const statusParam = tab === "all" || tab === "flags" ? "" : tab.toUpperCase();
      const [list, st, rf] = await Promise.all([
        getAdminVerifications(statusParam, roleFilter),
        getVerificationStats(),
        getRiskFlags(),
      ]);
      setVerifications(list);
      setStats(st);
      setRiskFlags(rf);
    } catch (e) {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = async (v) => {
    setDetailLoading(true);
    try {
      const detail = await getAdminVerificationDetail(v.id);
      setSelectedVerif(detail);
      setAdminNotes(detail.admin_notes || "");
    } catch (e) {
      setSelectedVerif(v);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedVerif) return;
    try {
      await approveVerification(selectedVerif.id, adminNotes);
      setActionSuccess("Verification approved successfully!");
      setSelectedVerif(null);
      await loadData();
    } catch (e) {
      alert("Failed to approve verification");
    }
  };

  const handleReject = async () => {
    if (!selectedVerif || !rejectReason) return;
    try {
      await rejectVerification(selectedVerif.id, rejectReason);
      setActionSuccess("Verification rejected.");
      setShowRejectModal(false);
      setRejectReason("");
      setSelectedVerif(null);
      await loadData();
    } catch (e) {
      alert("Failed to reject verification");
    }
  };

  const handleSuspend = async () => {
    if (!selectedVerif) return;
    if (!confirm("Are you sure you want to suspend this account?")) return;
    try {
      await suspendVerification(selectedVerif.id, "Administrative suspension");
      setActionSuccess("Account suspended.");
      setSelectedVerif(null);
      await loadData();
    } catch (e) {
      alert("Failed to suspend");
    }
  };

  const handleRequestInfo = async () => {
    if (!selectedVerif) return;
    try {
      await requestMoreVerificationInfo(selectedVerif.id, adminNotes || "Please provide clearer evidence");
      setActionSuccess("Information requested from user.");
      setSelectedVerif(null);
      await loadData();
    } catch (e) {
      alert("Failed to request info");
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <button
            onClick={() => nav("/admin")}
            className="inline-flex items-center gap-2 text-sm font-semibold text-leaf-900 hover:text-leaf-700 mb-2"
          >
            <ArrowLeft size={16} /> Back to Admin Overview
          </button>
          <h1 className="font-display text-3xl font-bold text-leaf-950">
            Verification Management & Audit
          </h1>
          <p className="text-sm text-soil-900/70">
            Review user identity submissions, inspect evidence documents, evaluate trust scores, and prevent fraudulent listings.
          </p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="btn-ghost !py-2 !px-4 text-sm self-start md:self-auto"
        >
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} /> Refresh List
        </button>
      </div>

      {actionSuccess && (
        <div className="mb-4 flex items-center justify-between rounded-2xl border border-leaf-700/30 bg-leaf-100/50 p-3 text-sm text-leaf-900">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="text-leaf-700" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess("")}><X size={16} /></button>
        </div>
      )}

      {/* Stats counter strip */}
      <div className="mb-6 grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="card text-center p-3">
          <p className="text-xs font-semibold text-soil-900/60 uppercase">Under Review</p>
          <p className="font-display text-2xl font-bold text-harvest-500">{stats?.by_status?.UNDER_REVIEW || 0}</p>
        </div>
        <div className="card text-center p-3">
          <p className="text-xs font-semibold text-soil-900/60 uppercase">Pending Details</p>
          <p className="font-display text-2xl font-bold text-soil-900">{stats?.by_status?.PENDING || 0}</p>
        </div>
        <div className="card text-center p-3">
          <p className="text-xs font-semibold text-soil-900/60 uppercase">Fully Verified</p>
          <p className="font-display text-2xl font-bold text-leaf-700">{stats?.by_status?.VERIFIED || 0}</p>
        </div>
        <div className="card text-center p-3">
          <p className="text-xs font-semibold text-soil-900/60 uppercase">Rejected</p>
          <p className="font-display text-2xl font-bold text-red-600">{stats?.by_status?.REJECTED || 0}</p>
        </div>
        <div className="card text-center p-3">
          <p className="text-xs font-semibold text-soil-900/60 uppercase">Risk Flagged</p>
          <p className="font-display text-2xl font-bold text-red-700">{(riskFlags.listings?.length || 0) + (riskFlags.accounts?.length || 0)}</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-leaf-900/10 pb-3">
        <div className="flex flex-wrap gap-2 text-sm font-semibold">
          {[
            { key: "all", label: "All Records" },
            { key: "under_review", label: "Under Review ⟳" },
            { key: "verified", label: "Verified ✓" },
            { key: "pending", label: "Pending" },
            { key: "rejected", label: "Rejected" },
            { key: "suspended", label: "Suspended" },
            { key: "flags", label: "Risk Flags ⚠" },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`rounded-xl px-3.5 py-1.5 text-xs transition ${
                tab === t.key
                  ? "bg-leaf-900 text-cream-50 font-bold shadow-card"
                  : "bg-white text-soil-900/70 hover:bg-cream-50"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Filter size={14} className="text-soil-900/60" />
          <select
            className="rounded-xl border border-leaf-900/15 bg-white px-2.5 py-1 text-xs font-semibold text-soil-950"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="">All Roles</option>
            <option value="farmer">Farmers Only</option>
            <option value="buyer">Buyers Only</option>
          </select>
        </div>
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Verifications List */}
        <div className={selectedVerif ? "lg:col-span-7" : "lg:col-span-12"}>
          {tab === "flags" ? (
            /* Risk flags view */
            <div className="space-y-4">
              <h3 className="font-bold text-soil-950 text-base">Flagged Listings & Anomalies</h3>
              {riskFlags.listings?.length === 0 && riskFlags.accounts?.length === 0 ? (
                <div className="card text-center p-8 text-soil-900/60 text-sm">
                  No risk flags currently detected. All active listings are within normal limits.
                </div>
              ) : (
                <div className="space-y-3">
                  {riskFlags.listings?.map((l) => (
                    <div key={l.id} className="card border-l-4 border-l-red-500 p-4">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-soil-950">{l.crop} - {l.quantity} Quintals</span>
                        <span className="text-xs bg-red-100 text-red-800 font-bold px-2 py-0.5 rounded-full">Flagged Listing</span>
                      </div>
                      <div className="mt-2 space-y-1">
                        {l.risk_flags?.map((rf, i) => (
                          <p key={i} className="text-xs text-red-700 font-medium">• {rf.message}</p>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Verifications Table / Card list */
            <div className="space-y-3">
              {loading ? (
                <div className="card text-center p-8 text-soil-900/60">Loading verification records...</div>
              ) : verifications.length === 0 ? (
                <div className="card text-center p-8 text-soil-900/60">No records found for this filter.</div>
              ) : (
                verifications.map((v) => (
                  <div
                    key={v.id}
                    onClick={() => handleSelect(v)}
                    className={`card p-4 cursor-pointer transition hover:shadow-md ${
                      selectedVerif?.id === v.id ? "ring-2 ring-leaf-700" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-display font-bold text-leaf-950 text-base">{v.name}</span>
                          <span className="rounded-full bg-cream-100 px-2 py-0.5 text-[11px] font-bold text-soil-900 uppercase">
                            {v.role}
                          </span>
                        </div>
                        <p className="text-xs text-soil-900/70 mt-1">
                          Phone: +91 {v.phone} · District: {v.district}
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
                          Trust: <span className="text-leaf-900">{v.trust_score}/100</span>
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between border-t border-leaf-900/5 pt-2 text-xs text-soil-900/60">
                      <span>Submitted: {v.submitted_at ? new Date(v.submitted_at).toLocaleDateString() : "Pending"}</span>
                      <span className="font-semibold text-leaf-700 flex items-center gap-1">
                        <Eye size={13} /> View Details →
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Right: Review Details Panel */}
        {selectedVerif && (
          <div className="lg:col-span-5">
            <div className="card sticky top-20 space-y-4 bg-white shadow-xl">
              <div className="flex items-center justify-between border-b border-leaf-900/10 pb-3">
                <div>
                  <h3 className="font-display font-bold text-leaf-950 text-lg">Verification Review</h3>
                  <p className="text-xs text-soil-900/60">{selectedVerif.name} ({selectedVerif.role})</p>
                </div>
                <button
                  onClick={() => setSelectedVerif(null)}
                  className="rounded-lg p-1 text-soil-900/50 hover:bg-leaf-100"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Status & Trust summary */}
              <div className="rounded-2xl bg-cream-50 p-3.5 border border-leaf-900/10">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-soil-900">Current Status</span>
                  <VerificationBadge
                    level={selectedVerif.verification_level}
                    status={selectedVerif.status}
                    role={selectedVerif.role}
                    trustScore={selectedVerif.trust_score}
                    showDetailModal={false}
                  />
                </div>
                <div className="mt-3">
                  <TrustScore score={selectedVerif.trust_score} breakdown={selectedVerif.trust_score_breakdown} />
                </div>
              </div>

              {/* Check details */}
              <div className="space-y-2 text-xs">
                <h4 className="font-bold text-leaf-900 uppercase tracking-wider">Submitted Credentials</h4>

                <div className="rounded-xl border border-leaf-900/10 p-2.5">
                  <span className="font-semibold text-soil-900">Mobile OTP: </span>
                  <span className={selectedVerif.phone_verified ? "font-bold text-leaf-700" : "text-soil-900/60"}>
                    {selectedVerif.phone_verified ? "Verified ✓ (+91 " + selectedVerif.phone + ")" : "Not Verified"}
                  </span>
                </div>

                <div className="rounded-xl border border-leaf-900/10 p-2.5">
                  <span className="font-semibold text-soil-900">Identity KYC: </span>
                  <span className={selectedVerif.identity_verified ? "font-bold text-leaf-700" : "text-soil-900/60"}>
                    {selectedVerif.identity_verified ? "Verified (Ref: " + (selectedVerif.identity_reference || "Confidential") + ")" : "Pending KYC"}
                  </span>
                </div>

                {selectedVerif.role === "farmer" ? (
                  <div className="rounded-xl border border-leaf-900/10 p-2.5">
                    <span className="font-semibold text-soil-900">Agricultural Evidence: </span>
                    <p className="mt-1 text-soil-900/80">
                      Type: <strong>{selectedVerif.agricultural_verification?.type || "None"}</strong><br />
                      Reference: <strong>{selectedVerif.agricultural_verification?.reference || "None"}</strong><br />
                      Status: <strong>{selectedVerif.agricultural_verification?.status || "None"}</strong>
                    </p>
                  </div>
                ) : (
                  <div className="rounded-xl border border-leaf-900/10 p-2.5">
                    <span className="font-semibold text-soil-900">Business Registration: </span>
                    <p className="mt-1 text-soil-900/80">
                      Type: <strong>{selectedVerif.business_verification?.type || "None"}</strong><br />
                      Reference: <strong>{selectedVerif.business_verification?.reference || "None"}</strong><br />
                      Status: <strong>{selectedVerif.business_verification?.status || "None"}</strong>
                    </p>
                  </div>
                )}

                <div className="rounded-xl border border-leaf-900/10 p-2.5">
                  <span className="font-semibold text-soil-900">Location Record: </span>
                  <span className="text-soil-900/80">
                    {selectedVerif.district || "N/A"}, {selectedVerif.location_verification?.state || "India"}
                  </span>
                </div>
              </div>

              {/* Admin Notes */}
              <div>
                <label className="label text-xs">Admin Notes</label>
                <textarea
                  rows={2}
                  className="field text-xs !py-2"
                  placeholder="Notes on document validity, khatauni checks, etc."
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                />
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={handleApprove}
                  className="btn-primary w-full !py-2.5 text-sm"
                >
                  <CheckCircle2 size={16} /> Approve & Grant Verified Badge
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setShowRejectModal(true)}
                    className="btn-ghost w-full !py-2 text-xs text-red-700 border-red-300 hover:bg-red-50"
                  >
                    Reject Application
                  </button>
                  <button
                    type="button"
                    onClick={handleRequestInfo}
                    className="btn-ghost w-full !py-2 text-xs"
                  >
                    Request Info
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleSuspend}
                  className="w-full text-center text-xs font-semibold text-red-600 hover:underline pt-1"
                >
                  Suspend Account
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Reject Reason Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="card w-full max-w-md bg-white p-6 shadow-2xl">
            <h3 className="font-display font-bold text-lg text-red-950">Specify Rejection Reason</h3>
            <p className="text-xs text-soil-900/70 mt-1">
              This message will be displayed to the user so they can correct their documents.
            </p>
            <textarea
              rows={3}
              className="field mt-3 text-sm"
              placeholder="e.g. The land record reference could not be verified against the state revenue portal."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                className="btn-ghost !py-2 text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReject}
                disabled={!rejectReason}
                className="btn-primary !py-2 text-xs bg-red-700 hover:bg-red-800"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
