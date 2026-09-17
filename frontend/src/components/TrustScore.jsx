import { ShieldCheck, TrendingUp } from "lucide-react";

export default function TrustScore({ score = 0, breakdown = {}, showBreakdown = true }) {
  const percentage = Math.min(100, Math.max(0, score));

  // Determine color theme based on score
  let barColor = "bg-harvest-500";
  let textColor = "text-harvest-500";
  if (percentage >= 75) {
    barColor = "bg-leaf-700";
    textColor = "text-leaf-900";
  } else if (percentage < 40) {
    barColor = "bg-soil-800";
    textColor = "text-soil-900";
  }

  const breakdownLabels = {
    phone_verified: "Mobile OTP",
    identity_verified: "Identity KYC",
    agricultural_verified: "Agri Record",
    govt_source_match: "Govt Registry",
    fpo_cooperative: "FPO Member",
    business_reg_verified: "Business Reg",
    identity_business_match: "Identity Match",
    completed_transactions: "Past Deals",
    successful_transactions: "Order History",
    positive_transactions: "High Ratings",
  };

  return (
    <div className="rounded-2xl border border-leaf-900/10 bg-cream-50/70 p-3.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <ShieldCheck size={16} className="text-leaf-700" />
          <span className="text-xs font-bold uppercase tracking-wider text-soil-900/70">Trust Score</span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className={`font-display text-xl font-bold ${textColor}`}>{score}</span>
          <span className="text-xs font-semibold text-soil-900/50">/100</span>
        </div>
      </div>

      {/* Progress track */}
      <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-soil-950/10">
        <div
          className={`h-full rounded-full ${barColor} transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Breakdown chips */}
      {showBreakdown && breakdown && Object.keys(breakdown).length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {Object.entries(breakdown).map(([k, v]) => (
            <span
              key={k}
              className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-0.5 text-[10px] font-semibold text-soil-900 shadow-sm border border-leaf-900/5"
            >
              <span className="text-leaf-700">+{v}</span>
              <span>{breakdownLabels[k] || k}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
