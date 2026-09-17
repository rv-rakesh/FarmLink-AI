import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, ShieldCheck, Clock, CheckCircle2, AlertTriangle, RefreshCw } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import VerificationBadge from "../components/VerificationBadge";
import TrustScore from "../components/TrustScore";
import VerificationChecklist from "../components/VerificationChecklist";
import { getVerificationStatus } from "../services/api";

export default function VerificationStatusPage() {
  const { user } = useAuth();
  const nav = useNavigate();

  const [statusData, setStatusData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const data = await getVerificationStatus();
      setStatusData(data);
    } catch (e) {
      // fallback
    } finally {
      setLoading(false);
    }
  };

  const role = user?.role || "farmer";
  const verifyPath = role === "buyer" ? "/buyer/verify" : "/farmer/verify";
  const dashPath = role === "buyer" ? "/buyer" : role === "admin" ? "/admin" : "/farmer";

  const isVerified = statusData?.status === "VERIFIED" || statusData?.verification_level === 4;
  const isUnderReview = statusData?.status === "UNDER_REVIEW";
  const isRejected = statusData?.status === "REJECTED";

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={() => nav(dashPath)}
          className="inline-flex items-center gap-2 text-sm font-semibold text-leaf-900 hover:text-leaf-700"
        >
          <ArrowLeft size={16} /> Back to Dashboard
        </button>
        <button
          onClick={fetchStatus}
          disabled={loading}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-leaf-900 hover:text-leaf-700 rounded-xl bg-white px-3 py-1.5 border border-leaf-900/10 shadow-sm"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh Status
        </button>
      </div>

      <div className="space-y-6">
        {/* Top Status Card */}
        <div className="card">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-leaf-900/10 pb-5">
            <div className="flex items-center gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-leaf-900 text-cream-50 shadow-card">
                <ShieldCheck size={26} />
              </span>
              <div>
                <h1 className="font-display text-2xl font-bold text-leaf-950">
                  Verification & Trust Status
                </h1>
                <p className="text-xs text-soil-900/70 capitalize">
                  Account Type: {role} · Registered as {user?.name || user?.business_name}
                </p>
              </div>
            </div>
            <div>
              <VerificationBadge
                level={statusData?.verification_level || 0}
                status={statusData?.status || "PENDING"}
                role={role}
                trustScore={statusData?.trust_score || 0}
                size="lg"
              />
            </div>
          </div>

          {/* Status highlight banner */}
          <div className="mt-5">
            {isVerified ? (
              <div className="flex items-start gap-3 rounded-2xl border border-leaf-700/30 bg-leaf-100/50 p-4 text-leaf-950">
                <CheckCircle2 size={24} className="shrink-0 text-leaf-700 fill-leaf-100 mt-0.5" />
                <div>
                  <h4 className="font-bold text-base text-leaf-900">Account Fully Verified ✓</h4>
                  <p className="mt-1 text-sm text-leaf-900/80">
                    Your account has completed multi-step identity, role evidence, and risk verification. You have full access to direct farmer ↔ buyer trading and live market insights.
                  </p>
                  {statusData?.verified_on && (
                    <p className="mt-2 text-xs font-semibold text-leaf-700">
                      Verified by FarmLink AI on: {statusData.verified_on}
                    </p>
                  )}
                </div>
              </div>
            ) : isUnderReview ? (
              <div className="flex items-start gap-3 rounded-2xl border border-harvest-500/30 bg-harvest-400/10 p-4 text-soil-950">
                <Clock size={24} className="shrink-0 text-harvest-500 mt-0.5" />
                <div>
                  <h4 className="font-bold text-base text-soil-950">Documents Under Review ⟳</h4>
                  <p className="mt-1 text-sm text-soil-900/80">
                    Your evidence documents have been submitted and are currently in the verification queue. Automated KYC sandbox checks are complete. Verification is typically completed within 24–48 hours.
                  </p>
                </div>
              </div>
            ) : isRejected ? (
              <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-900">
                <AlertTriangle size={24} className="shrink-0 text-red-600 mt-0.5" />
                <div>
                  <h4 className="font-bold text-base text-red-900">Action Required: Verification Incomplete</h4>
                  <p className="mt-1 text-sm text-red-800">
                    {statusData?.rejection_reason || "The submitted documentation could not be validated."}
                  </p>
                  <button
                    onClick={() => nav(verifyPath)}
                    className="btn-primary mt-3 !py-2 text-sm"
                  >
                    Resubmit Verification Details →
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3 rounded-2xl border border-leaf-900/10 bg-cream-50 p-4 text-soil-950">
                <ShieldCheck size={24} className="shrink-0 text-leaf-700 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-bold text-base text-leaf-950">Complete Verification to Unlock Full Access</h4>
                  <p className="mt-1 text-sm text-soil-900/80">
                    {statusData?.next_step || "Complete mobile OTP, identity, and role evidence to earn the verified badge."}
                  </p>
                  <button
                    onClick={() => nav(verifyPath)}
                    className="btn-primary mt-3 !py-2 text-sm"
                  >
                    Continue Verification Wizard →
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Trust score overview */}
          <div className="mt-5">
            <TrustScore
              score={statusData?.trust_score || 0}
              breakdown={statusData?.trust_score_breakdown || {}}
            />
          </div>
        </div>

        {/* Verification Checklist */}
        <div className="card">
          <h3 className="font-display text-lg font-bold text-leaf-950 mb-4">
            Verification Steps Checklist
          </h3>
          <VerificationChecklist
            role={role}
            phoneVerified={statusData?.phone_verified}
            identityVerified={statusData?.identity_verified}
            roleVerified={statusData?.status === "VERIFIED"}
            roleSubmitted={statusData?.status in { SUBMITTED: 1, UNDER_REVIEW: 1, VERIFIED: 1 }}
            locationVerified={Boolean(statusData?.location_verification?.status === "verified")}
            status={statusData?.status || "PENDING"}
          />
        </div>

        {/* Action button */}
        {!isVerified && (
          <div className="text-center">
            <button
              onClick={() => nav(verifyPath)}
              className="btn-primary !px-8 text-base shadow-card"
            >
              Go to Verification Wizard <ArrowRight size={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
