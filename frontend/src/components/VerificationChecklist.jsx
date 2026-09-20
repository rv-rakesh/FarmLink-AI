import {
  CheckCircle2,
  Circle,
  Clock,
  AlertCircle,
} from "lucide-react";
import { useLang } from "../context/LanguageContext";

export default function VerificationChecklist({
  role = "farmer",
  phoneVerified = false,
  identityVerified = false,
  roleVerified = false,
  roleSubmitted = false,
  locationVerified = false,
  status = "PENDING",
}) {
  const { t } = useLang();

  const steps = [
    {
      id: "phone",
      title:
        t.verification?.mobileStepTitle ||
        "Mobile Number Verification",
      subtitle:
        t.verification?.mobileStepSubtitle ||
        "6-digit OTP confirmation to establish direct SMS and voice reachability",
      done: phoneVerified,
      pending: false,
      rejected: false,
    },
    {
      id: "identity",
      title:
        t.verification?.identityStepTitle ||
        "Identity KYC Verification",
      subtitle:
        t.verification?.identityStepSubtitle ||
        "Validation of government identity reference",
      done: identityVerified,
      pending: false,
      rejected: false,
    },
    {
      id: "role",
      title:
        role === "buyer"
          ? t.verification?.businessEvidenceTitle ||
            "Business Evidence"
          : t.verification?.agriculturalEvidenceTitle ||
            "Agricultural Evidence",
      subtitle:
        role === "buyer"
          ? t.verification?.businessEvidenceSubtitle ||
            "GSTIN, Udyam MSME, or Trade Licence registration"
          : t.verification?.agriculturalEvidenceSubtitle ||
            "Farmer Registration, Land Record, or FPO membership",
      done: roleVerified,
      pending: roleSubmitted && !roleVerified,
      rejected:
        status === "REJECTED" &&
        roleSubmitted &&
        !roleVerified,
    },
    {
      id: "review",
      title:
        t.verification?.finalReviewTitle ||
        "FarmLink Final Review & Trust Status",
      subtitle:
        t.verification?.finalReviewSubtitle ||
        "Automated risk screening and admin approval for the verified marketplace badge",
      done: status === "VERIFIED",
      pending: status === "UNDER_REVIEW",
      rejected: status === "REJECTED",
    },
  ];

  const statusText = (step) => {
    if (step.done) {
      return (
        t.verification?.completed ||
        "Completed ✓"
      );
    }

    if (step.rejected) {
      return (
        t.verification?.rejected ||
        "Rejected"
      );
    }

    if (step.pending) {
      return (
        t.verification?.underReview ||
        "Under Review ⟳"
      );
    }

    return (
      t.verification?.pending ||
      "Pending"
    );
  };

  const statusClass = (step) => {
    if (step.done) {
      return "text-leaf-700";
    }

    if (step.rejected) {
      return "text-red-600";
    }

    if (step.pending) {
      return "text-harvest-500";
    }

    return "text-soil-900/40";
  };

  return (
    <div className="space-y-3">
      {steps.map((step, idx) => (
        <div
          key={step.id}
          className={`flex items-start gap-3 rounded-2xl border p-3.5 transition ${
            step.done
              ? "border-leaf-700/30 bg-leaf-100/30 text-leaf-950"
              : step.rejected
              ? "border-red-200 bg-red-50 text-red-950"
              : step.pending
              ? "border-harvest-500/30 bg-harvest-400/10 text-soil-950"
              : "border-leaf-900/10 bg-white/60 text-soil-900/60"
          }`}
        >
          {/* Status icon */}
          <div className="mt-0.5 shrink-0">
            {step.done ? (
              <CheckCircle2
                size={20}
                className="fill-leaf-100 text-leaf-700"
              />
            ) : step.rejected ? (
              <AlertCircle
                size={20}
                className="text-red-600"
              />
            ) : step.pending ? (
              <Clock
                size={20}
                className="animate-pulse text-harvest-500"
              />
            ) : (
              <Circle
                size={20}
                className="text-soil-900/30"
              />
            )}
          </div>

          {/* Content */}
          <div className="flex-1">
            <div className="flex items-center justify-between gap-2">
              <h5
                className={`text-sm font-semibold ${
                  step.done
                    ? "text-leaf-900"
                    : step.rejected
                    ? "text-red-900"
                    : "text-soil-950"
                }`}
              >
                {t.verification?.step || "Step"}{" "}
                {idx + 1}: {step.title}
              </h5>

              <span
                className={`shrink-0 text-xs font-bold ${statusClass(
                  step
                )}`}
              >
                {statusText(step)}
              </span>
            </div>

            <p className="mt-0.5 text-xs text-soil-900/70">
              {step.subtitle}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
