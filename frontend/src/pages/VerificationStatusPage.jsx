import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useLang } from "../context/LanguageContext";
import VerificationBadge from "../components/VerificationBadge";
import TrustScore from "../components/TrustScore";
import VerificationChecklist from "../components/VerificationChecklist";
import { getVerificationStatus } from "../services/api";

export default function VerificationStatusPage() {
  const { user } = useAuth();
  const { t } = useLang();
  const nav = useNavigate();

  const [statusData, setStatusData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const fetchStatus = useCallback(async () => {
    if (loading === false) {
      setLoading(true);
    }

    setErr("");

    try {
      const data = await getVerificationStatus();
      setStatusData(data);
    } catch (e) {
      setErr(
        e.response?.data?.error ||
          e.message ||
          t.verification?.statusLoadFailed ||
          "Unable to load verification status."
      );
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const role = user?.role || "farmer";

  const verifyPath =
    role === "buyer"
      ? "/buyer/verify"
      : "/farmer/verify";

  const dashPath =
    role === "buyer"
      ? "/buyer"
      : role === "admin"
      ? "/admin"
      : "/farmer";

  const isVerified =
    statusData?.status === "VERIFIED" ||
    statusData?.verification_level === 4;

  const isUnderReview =
    statusData?.status === "UNDER_REVIEW";

  const isRejected =
    statusData?.status === "REJECTED";

  const isSubmitted = [
    "SUBMITTED",
    "UNDER_REVIEW",
    "VERIFIED",
  ].includes(statusData?.status);

  if (loading && !statusData) {
    return (
      <div className="flex min-h-[300px] items-center justify-center p-8">
        <div className="text-center">
          <RefreshCw
            size={24}
            className="mx-auto mb-3 animate-spin text-leaf-700"
          />
          <p className="text-sm text-soil-900/60">
            {t.verification?.loadingStatus ||
              "Loading verification status..."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* Header actions */}
      <div className="mb-6 flex items-center justify-between gap-3">
        <button
          onClick={() => nav(dashPath)}
          className="inline-flex items-center gap-2 text-sm font-semibold text-leaf-900 hover:text-leaf-700"
        >
          <ArrowLeft size={16} />
          {t.verification?.backDashboard ||
            "Back to Dashboard"}
        </button>

        <button
          onClick={fetchStatus}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-xl border border-leaf-900/10 bg-white px-3 py-1.5 text-xs font-semibold text-leaf-900 shadow-sm hover:bg-leaf-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw
            size={13}
            className={loading ? "animate-spin" : ""}
          />
          {loading
            ? t.verification?.refreshing || "Refreshing..."
            : t.verification?.refreshStatus ||
              "Refresh Status"}
        </button>
      </div>

      <div className="space-y-6">
        {/* Top status card */}
        <div className="card">
          <div className="flex flex-col justify-between gap-4 border-b border-leaf-900/10 pb-5 md:flex-row md:items-center">
            <div className="flex items-center gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-leaf-900 text-cream-50 shadow-card">
                <ShieldCheck size={26} />
              </span>

              <div>
                <h1 className="font-display text-2xl font-bold text-leaf-950">
                  {t.verification?.statusTitle ||
                    "Verification & Trust Status"}
                </h1>

                <p className="text-xs capitalize text-soil-900/70">
                  {t.verification?.accountType ||
                    "Account Type"}
                  : {role} ·{" "}
                  {t.verification?.registeredAs ||
                    "Registered as"}{" "}
                  {user?.name ||
                    user?.business_name ||
                    ""}
                </p>
              </div>
            </div>

            <VerificationBadge
              level={statusData?.verification_level || 0}
              status={statusData?.status || "PENDING"}
              role={role}
              trustScore={statusData?.trust_score || 0}
              size="lg"
            />
          </div>

          {/* Status banner */}
          <div className="mt-5">
            {isVerified ? (
              <div className="flex items-start gap-3 rounded-2xl border border-leaf-700/30 bg-leaf-100/50 p-4 text-leaf-950">
                <CheckCircle2
                  size={24}
                  className="mt-0.5 shrink-0 fill-leaf-100 text-leaf-700"
                />

                <div>
                  <h4 className="text-base font-bold text-leaf-900">
                    {t.verification?.fullyVerified ||
                      "Account Fully Verified ✓"}
                  </h4>

                  <p className="mt-1 text-sm text-leaf-900/80">
                    {t.verification?.fullyVerifiedBody ||
                      "Your account has completed the required verification steps and has access to verified trading features."}
                  </p>

                  {statusData?.verified_on && (
                    <p className="mt-2 text-xs font-semibold text-leaf-700">
                      {t.verification?.verifiedOn ||
                        "Verified by FarmLink AI on"}:{" "}
                      {statusData.verified_on}
                    </p>
                  )}
                </div>
              </div>
            ) : isUnderReview ? (
              <div className="flex items-start gap-3 rounded-2xl border border-harvest-500/30 bg-harvest-400/10 p-4 text-soil-950">
                <Clock
                  size={24}
                  className="mt-0.5 shrink-0 text-harvest-500"
                />

                <div>
                  <h4 className="text-base font-bold text-soil-950">
                    {t.verification?.underReview ||
                      "Documents Under Review"}
                  </h4>

                  <p className="mt-1 text-sm text-soil-900/80">
                    {t.verification?.underReviewBody ||
                      "Your submitted verification details are currently being reviewed."}
                  </p>
                </div>
              </div>
            ) : isRejected ? (
              <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-900">
                <AlertTriangle
                  size={24}
                  className="mt-0.5 shrink-0 text-red-600"
                />

                <div>
                  <h4 className="text-base font-bold text-red-900">
                    {t.verification?.actionRequired ||
                      "Action Required"}
                  </h4>

                  <p className="mt-1 text-sm text-red-800">
                    {statusData?.rejection_reason ||
                      t.verification?.rejectedBody ||
                      "The submitted verification details could not be validated."}
                  </p>

                  <button
                    onClick={() => nav(verifyPath)}
                    className="btn-primary mt-3 !py-2 text-sm"
                  >
                    {t.verification?.resubmit ||
                      "Resubmit Verification Details →"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3 rounded-2xl border border-leaf-900/10 bg-cream-50 p-4 text-soil-950">
                <ShieldCheck
                  size={24}
                  className="mt-0.5 shrink-0 text-leaf-700"
                />

                <div className="flex-1">
                  <h4 className="text-base font-bold text-leaf-950">
                    {t.verification?.completeTitle ||
                      "Complete Verification to Unlock Full Access"}
                  </h4>

                  <p className="mt-1 text-sm text-soil-900/80">
                    {statusData?.next_step ||
                      t.verification?.completeBody ||
                      "Complete the required verification steps to earn the verified badge."}
                  </p>

                  <button
                    onClick={() => nav(verifyPath)}
                    className="btn-primary mt-3 !py-2 text-sm"
                  >
                    {t.verification?.continueWizard ||
                      "Continue Verification Wizard →"}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Trust score */}
          <div className="mt-5">
            <TrustScore
              score={statusData?.trust_score || 0}
              breakdown={
                statusData?.trust_score_breakdown || {}
              }
            />
          </div>
        </div>

        {/* Checklist */}
        <div className="card">
          <h3 className="mb-4 font-display text-lg font-bold text-leaf-950">
            {t.verification?.checklistTitle ||
              "Verification Steps Checklist"}
          </h3>

          <VerificationChecklist
            role={role}
            phoneVerified={statusData?.phone_verified}
            identityVerified={statusData?.identity_verified}
            roleVerified={
              statusData?.status === "VERIFIED"
            }
            roleSubmitted={isSubmitted}
            locationVerified={
              statusData?.location_verification?.status ===
              "verified"
            }
            status={statusData?.status || "PENDING"}
          />
        </div>

        {/* Error */}
        {err && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-800">
            {err}
          </div>
        )}

        {/* Bottom action */}
        {!isVerified && (
          <div className="text-center">
            <button
              onClick={() => nav(verifyPath)}
              className="btn-primary inline-flex !px-8 text-base shadow-card"
            >
              {t.verification?.goToWizard ||
                "Go to Verification Wizard"}
              <ArrowRight size={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
