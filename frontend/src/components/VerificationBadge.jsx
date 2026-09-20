import { useState } from "react";
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  X,
} from "lucide-react";
import { useLang } from "../context/LanguageContext";

export default function VerificationBadge({
  level = 0,
  status = "PENDING",
  role = "farmer",
  trustScore = 0,
  verifiedDate = null,
  showDetailModal = true,
  size = "md",
}) {
  const { t, lang } = useLang();
  const [open, setOpen] = useState(false);

  const locale =
    lang === "hi"
      ? "hi-IN-u-nu-deva"
      : lang === "mr"
      ? "mr-IN-u-nu-deva"
      : "en-IN";

  const formatNumber = (value) =>
    Number(value || 0).toLocaleString(locale);

  const isFullyVerified =
    level >= 4 || status === "VERIFIED";

  const isUnderReview =
    status === "UNDER_REVIEW" || level === 3;

  const isRejected = status === "REJECTED";
  const isSuspended = status === "SUSPENDED";

  let badgeStyle =
    "bg-soil-950/10 text-soil-900 border-soil-950/20";

  let icon = (
    <Clock
      size={14}
      className="text-soil-900/60"
    />
  );

  let label =
    t.verification?.registered ||
    "Registered";

  if (isSuspended) {
    badgeStyle =
      "bg-red-100 text-red-900 border-red-300";

    icon = (
      <ShieldAlert
        size={14}
        className="text-red-700"
      />
    );

    label =
      t.verification?.suspended ||
      "Suspended";
  } else if (isRejected) {
    badgeStyle =
      "bg-red-50 text-red-800 border-red-200";

    icon = (
      <AlertTriangle
        size={14}
        className="text-red-600"
      />
    );

    label =
      t.verification?.actionRequired ||
      "Action Required";
  } else if (isFullyVerified) {
    badgeStyle =
      "bg-leaf-100 text-leaf-900 border-leaf-700/40 font-bold";

    icon = (
      <CheckCircle2
        size={15}
        className="fill-leaf-100 text-leaf-700"
      />
    );

    label =
      role === "buyer"
        ? t.verification?.verifiedBuyer ||
          "✓ Verified Buyer"
        : t.verification?.verifiedFarmer ||
          "✓ Verified Farmer";
  } else if (isUnderReview) {
    badgeStyle =
      "bg-harvest-400/20 text-soil-900 border-harvest-500/40";

    icon = (
      <Clock
        size={14}
        className="text-harvest-500"
      />
    );

    label =
      t.verification?.underReview ||
      "Under Review";
  } else if (level === 2) {
    badgeStyle =
      "bg-leaf-500/15 text-leaf-900 border-leaf-500/30";

    icon = (
      <ShieldCheck
        size={14}
        className="text-leaf-700"
      />
    );

    label =
      t.verification?.identityVerified ||
      "ID Verified";
  } else if (level === 1) {
    badgeStyle =
      "bg-leaf-100/60 text-leaf-900 border-leaf-300";

    icon = (
      <ShieldCheck
        size={14}
        className="text-leaf-500"
      />
    );

    label =
      t.verification?.mobileVerified ||
      "Mobile Verified";
  }

  const sizeClasses =
    size === "sm"
      ? "px-2 py-0.5 text-xs gap-1"
      : size === "lg"
      ? "px-3.5 py-1.5 text-sm gap-2"
      : "px-2.5 py-1 text-xs gap-1.5";

  const statusLabels = {
    PENDING:
      t.verification?.pending || "Pending",
    SUBMITTED:
      t.verification?.submitted || "Submitted",
    UNDER_REVIEW:
      t.verification?.underReview ||
      "Under Review",
    VERIFIED:
      t.verification?.verified ||
      "Verified",
    REJECTED:
      t.verification?.rejected ||
      "Rejected",
    SUSPENDED:
      t.verification?.suspended ||
      "Suspended",
  };

  const statusLabel =
    statusLabels[status] ||
    status ||
    t.verification?.unknown ||
    "Unknown";

  const roleLabel =
    role === "buyer"
      ? t.roles?.buyer || "Buyer"
      : t.roles?.farmer || "Farmer";

  const verificationChecks = [
    {
      label:
        t.verification?.mobileOtp ||
        "Mobile OTP Verified",
      passed: level >= 1,
    },
    {
      label:
        t.verification?.identityKyc ||
        "Identity KYC Confirmed",
      passed: level >= 2,
    },
    {
      label:
        role === "buyer"
          ? t.verification?.businessEvidence ||
            "Business Evidence (GSTIN/Udyam)"
          : t.verification?.agriculturalEvidence ||
            "Agricultural Evidence (Land/FPO)",
      passed: level >= 3,
    },
    {
      label:
        t.verification?.adminReview ||
        "FarmLink Admin Review Completed",
      passed: level >= 4,
    },
  ];

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() =>
          showDetailModal && setOpen(!open)
        }
        className={`inline-flex items-center rounded-full border ${badgeStyle} ${sizeClasses} font-semibold transition ${
          showDetailModal
            ? "cursor-pointer hover:opacity-90 active:scale-95"
            : "cursor-default"
        } shadow-sm`}
        title={
          showDetailModal
            ? t.verification?.viewDetails ||
              "View verification details"
            : undefined
        }
      >
        {icon}
        <span>{label}</span>
      </button>

      {/* Detail modal */}
      {open && showDetailModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="card relative w-full max-w-sm bg-white p-6 text-soil-950 shadow-2xl"
            onClick={(e) =>
              e.stopPropagation()
            }
          >
            {/* Modal header */}
            <div className="flex items-center justify-between border-b border-leaf-900/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-leaf-900 text-cream-50">
                  <ShieldCheck size={18} />
                </span>

                <div>
                  <h4 className="font-display text-base font-bold text-leaf-950">
                    {t.verification?.farmLinkTitle ||
                      "FarmLink Verification"}
                  </h4>

                  <p className="text-xs capitalize text-soil-900/60">
                    {roleLabel} ·{" "}
                    {t.verification?.trustCredentials ||
                      "Trust Credentials"}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1 text-soil-900/50 hover:bg-leaf-100 hover:text-leaf-900"
                aria-label={
                  t.verification?.close ||
                  "Close"
                }
              >
                <X size={18} />
              </button>
            </div>

            {/* Status */}
            <div className="mt-4 space-y-2.5 text-sm">
              <div className="flex items-center justify-between rounded-xl border border-leaf-900/5 bg-cream-50 p-2.5">
                <span className="text-soil-900/80">
                  {t.verification?.accountStatus ||
                    "Account Status"}
                </span>

                <span className="font-bold text-leaf-900">
                  {statusLabel} (
                  {formatNumber(level)}/
                  {formatNumber(4)})
                </span>
              </div>

              {/* Trust score */}
              <div className="flex items-center justify-between rounded-xl border border-leaf-900/5 bg-cream-50 p-2.5">
                <span className="text-soil-900/80">
                  {t.verification?.trustScore ||
                    "Trust Score"}
                </span>

                <span className="font-bold text-leaf-900">
                  {formatNumber(trustScore)}/
                  {formatNumber(100)}
                </span>
              </div>

              {/* Verification checks */}
              <div className="pt-2">
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-leaf-900">
                  {t.verification?.checksTitle ||
                    "Verification Checks"}
                </p>

                <ul className="space-y-1.5 text-xs text-soil-900/80">
                  {verificationChecks.map(
                    (check) => (
                      <li
                        key={check.label}
                        className="flex items-center gap-2"
                      >
                        <CheckCircle2
                          size={14}
                          className={
                            check.passed
                              ? "text-leaf-700"
                              : "text-soil-900/30"
                          }
                        />

                        <span>{check.label}</span>
                      </li>
                    )
                  )}
                </ul>
              </div>

              {/* Verified date */}
              {verifiedDate && (
                <p className="mt-3 text-center text-xs text-soil-900/50">
                  {t.verification?.verifiedByFarmLink ||
                    "Verified by FarmLink AI on"}{" "}
                  {verifiedDate}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="btn-primary mt-5 w-full !py-2 text-sm"
            >
              {t.verification?.close ||
                "Close"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
