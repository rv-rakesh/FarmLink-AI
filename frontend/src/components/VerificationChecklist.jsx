import { CheckCircle2, Circle, Clock, AlertCircle } from "lucide-react";

export default function VerificationChecklist({
  role = "farmer",
  phoneVerified = false,
  identityVerified = false,
  roleVerified = false,
  roleSubmitted = false,
  locationVerified = false,
  status = "PENDING",
}) {
  const steps = [
    {
      id: "phone",
      title: "Mobile Number Verification",
      subtitle: "6-digit OTP confirmation to establish direct SMS/voice reachability",
      done: phoneVerified,
      pending: false,
    },
    {
      id: "identity",
      title: "Identity KYC Verification",
      subtitle: "Validation of government identity reference (PAN/UID)",
      done: identityVerified,
      pending: false,
    },
    {
      id: "role",
      title: role === "buyer" ? "Business Evidence" : "Agricultural Evidence",
      subtitle:
        role === "buyer"
          ? "GSTIN, Udyam MSME, or Trade Licence registration"
          : "Farmer Registration, Land record (Khatauni), or FPO membership",
      done: roleVerified,
      pending: roleSubmitted && !roleVerified,
    },
    {
      id: "review",
      title: "FarmLink Final Review & Trust Status",
      subtitle: "Automated risk screening & admin approval for verified marketplace badge",
      done: status === "VERIFIED",
      pending: status === "UNDER_REVIEW",
    },
  ];

  return (
    <div className="space-y-3">
      {steps.map((step, idx) => (
        <div
          key={step.id}
          className={`flex items-start gap-3 rounded-2xl border p-3.5 transition ${
            step.done
              ? "border-leaf-700/30 bg-leaf-100/30 text-leaf-950"
              : step.pending
              ? "border-harvest-500/30 bg-harvest-400/10 text-soil-950"
              : "border-leaf-900/10 bg-white/60 text-soil-900/60"
          }`}
        >
          <div className="mt-0.5 shrink-0">
            {step.done ? (
              <CheckCircle2 size={20} className="text-leaf-700 fill-leaf-100" />
            ) : step.pending ? (
              <Clock size={20} className="text-harvest-500 animate-pulse" />
            ) : (
              <Circle size={20} className="text-soil-900/30" />
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between gap-2">
              <h5 className={`font-semibold text-sm ${step.done ? "text-leaf-900" : "text-soil-950"}`}>
                Step {idx + 1}: {step.title}
              </h5>
              <span className="text-xs font-bold">
                {step.done ? (
                  <span className="text-leaf-700">Completed ✓</span>
                ) : step.pending ? (
                  <span className="text-harvest-500">Under Review ⟳</span>
                ) : (
                  <span className="text-soil-900/40">Pending</span>
                )}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-soil-900/70">{step.subtitle}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
