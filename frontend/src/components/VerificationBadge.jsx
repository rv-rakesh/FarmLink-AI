import { useState } from "react";
import { CheckCircle2, Clock, AlertTriangle, ShieldCheck, ShieldAlert, X } from "lucide-react";

/**
 * VerificationBadge component
 * Levels:
 *   0 - Registered (grey/soil, no check)
 *   1 - Mobile Verified (blue/leaf-500)
 *   2 - Identity Verified (leaf-700)
 *   3 - Role Submitted/Under Review (harvest-500)
 *   4 - Fully Verified Farmer / Buyer (leaf-900 / green check)
 */
export default function VerificationBadge({
  level = 0,
  status = "PENDING",
  role = "farmer",
  trustScore = 0,
  verifiedDate = null,
  showDetailModal = true,
  size = "md",
}) {
  const [open, setOpen] = useState(false);

  // Normalize status and level
  const isFullyVerified = level >= 4 || status === "VERIFIED";
  const isUnderReview = status === "UNDER_REVIEW" || level === 3;
  const isRejected = status === "REJECTED";
  const isSuspended = status === "SUSPENDED";

  let badgeStyle = "bg-soil-950/10 text-soil-900 border-soil-950/20";
  let icon = <Clock size={14} className="text-soil-900/60" />;
  let label = "Registered";

  if (isSuspended) {
    badgeStyle = "bg-red-100 text-red-900 border-red-300";
    icon = <ShieldAlert size={14} className="text-red-700" />;
    label = "Suspended";
  } else if (isRejected) {
    badgeStyle = "bg-red-50 text-red-800 border-red-200";
    icon = <AlertTriangle size={14} className="text-red-600" />;
    label = "Action Required";
  } else if (isFullyVerified) {
    badgeStyle = "bg-leaf-100 text-leaf-900 border-leaf-700/40 font-bold";
    icon = <CheckCircle2 size={15} className="text-leaf-700 fill-leaf-100" />;
    label = role === "buyer" ? "✓ Verified Buyer" : "✓ Verified Farmer";
  } else if (isUnderReview) {
    badgeStyle = "bg-harvest-400/20 text-soil-900 border-harvest-500/40";
    icon = <Clock size={14} className="text-harvest-500" />;
    label = "Under Review";
  } else if (level === 2) {
    badgeStyle = "bg-leaf-500/15 text-leaf-900 border-leaf-500/30";
    icon = <ShieldCheck size={14} className="text-leaf-700" />;
    label = "ID Verified";
  } else if (level === 1) {
    badgeStyle = "bg-leaf-100/60 text-leaf-900 border-leaf-300";
    icon = <ShieldCheck size={14} className="text-leaf-500" />;
    label = "Mobile Verified";
  }

  const sizeClasses =
    size === "sm"
      ? "px-2 py-0.5 text-xs gap-1"
      : size === "lg"
      ? "px-3.5 py-1.5 text-sm gap-2"
      : "px-2.5 py-1 text-xs gap-1.5";

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => showDetailModal && setOpen(!open)}
        className={`inline-flex items-center rounded-full border ${badgeStyle} ${sizeClasses} font-semibold transition hover:opacity-90 active:scale-95 cursor-pointer shadow-sm`}
        title="Click to view FarmLink verification details"
      >
        {icon}
        <span>{label}</span>
      </button>

      {/* Popover detail panel */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setOpen(false)}>
          <div
            className="card relative w-full max-w-sm bg-white text-soil-950 shadow-2xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-leaf-900/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-leaf-900 text-cream-50">
                  <ShieldCheck size={18} />
                </span>
                <div>
                  <h4 className="font-display font-bold text-leaf-950 text-base">FarmLink Verification</h4>
                  <p className="text-xs text-soil-900/60 capitalize">{role} Trust Credentials</p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg p-1 text-soil-900/50 hover:bg-leaf-100 hover:text-leaf-900"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 space-y-2.5 text-sm">
              <div className="flex items-center justify-between rounded-xl bg-cream-50 p-2.5 border border-leaf-900/5">
                <span className="text-soil-900/80">Account Status</span>
                <span className="font-bold text-leaf-900">{status} (Level {level}/4)</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-cream-50 p-2.5 border border-leaf-900/5">
                <span className="text-soil-900/80">Trust Score</span>
                <span className="font-bold text-leaf-900">{trustScore}/100</span>
              </div>

              <div className="pt-2">
                <p className="text-xs font-bold text-leaf-900 uppercase tracking-wider mb-2">Verification Checks</p>
                <ul className="space-y-1.5 text-xs text-soil-900/80">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={14} className={level >= 1 ? "text-leaf-700" : "text-soil-900/30"} />
                    <span>Mobile OTP Verified</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={14} className={level >= 2 ? "text-leaf-700" : "text-soil-900/30"} />
                    <span>Identity KYC Confirmed</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={14} className={level >= 3 ? "text-leaf-700" : "text-soil-900/30"} />
                    <span>{role === "buyer" ? "Business Evidence (GSTIN/Udyam)" : "Agricultural Evidence (Land/FPO)"}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={14} className={level >= 4 ? "text-leaf-700" : "text-soil-900/30"} />
                    <span>FarmLink Admin Review Completed</span>
                  </li>
                </ul>
              </div>

              {verifiedDate && (
                <p className="mt-3 text-center text-xs text-soil-900/50">
                  Verified by FarmLink AI on {verifiedDate}
                </p>
              )}
            </div>

            <button
              onClick={() => setOpen(false)}
              className="btn-primary w-full mt-5 !py-2 text-sm"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
