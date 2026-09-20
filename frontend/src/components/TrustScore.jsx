import { ShieldCheck } from "lucide-react";
import { useLang } from "../context/LanguageContext";

export default function TrustScore({
  score = 0,
  breakdown = {},
  showBreakdown = true,
}) {
  const { t, lang } = useLang();

  const locale =
    lang === "hi"
      ? "hi-IN-u-nu-deva"
      : lang === "mr"
      ? "mr-IN-u-nu-deva"
      : "en-IN";

  const formatNumber = (value) =>
    Number(value || 0).toLocaleString(locale);

  const percentage = Math.min(
    100,
    Math.max(0, Number(score) || 0)
  );

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
    phone_verified:
      t.trust?.phoneVerified ||
      "Mobile OTP",

    identity_verified:
      t.trust?.identityVerified ||
      "Identity KYC",

    agricultural_verified:
      t.trust?.agriculturalVerified ||
      "Agri Record",

    govt_source_match:
      t.trust?.govtSourceMatch ||
      "Govt Registry",

    fpo_cooperative:
      t.trust?.fpoCooperative ||
      "FPO Member",

    business_reg_verified:
      t.trust?.businessRegVerified ||
      "Business Registration",

    identity_business_match:
      t.trust?.identityBusinessMatch ||
      "Identity Match",

    completed_transactions:
      t.trust?.completedTransactions ||
      "Past Deals",

    successful_transactions:
      t.trust?.successfulTransactions ||
      "Order History",

    positive_transactions:
      t.trust?.positiveTransactions ||
      "High Ratings",
  };

  const getBreakdownLabel = (key) => {
    if (breakdownLabels[key]) {
      return breakdownLabels[key];
    }

    return key
      .replaceAll("_", " ")
      .replace(/\b\w/g, (char) =>
        char.toUpperCase()
      );
  };

  return (
    <div className="rounded-2xl border border-leaf-900/10 bg-cream-50/70 p-3.5">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <ShieldCheck
            size={16}
            className="text-leaf-700"
          />

          <span className="text-xs font-bold uppercase tracking-wider text-soil-900/70">
            {t.trust?.title || "Trust Score"}
          </span>
        </div>

        <div className="flex items-baseline gap-1">
          <span
            className={`font-display text-xl font-bold ${textColor}`}
          >
            {formatNumber(score)}
          </span>

          <span className="text-xs font-semibold text-soil-900/50">
            /{formatNumber(100)}
          </span>
        </div>
      </div>

      {/* Progress */}
      <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-soil-950/10">
        <div
          className={`h-full rounded-full ${barColor} transition-all duration-500`}
          style={{
            width: `${percentage}%`,
          }}
        />
      </div>

      {/* Breakdown */}
      {showBreakdown &&
        breakdown &&
        Object.keys(breakdown).length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {Object.entries(breakdown).map(
              ([key, value]) => (
                <span
                  key={key}
                  className="inline-flex items-center gap-1 rounded-md border border-leaf-900/5 bg-white px-2 py-0.5 text-[10px] font-semibold text-soil-900 shadow-sm"
                >
                  <span className="text-leaf-700">
                    +{formatNumber(value)}
                  </span>

                  <span>
                    {getBreakdownLabel(key)}
                  </span>
                </span>
              )
            )}
          </div>
        )}
    </div>
  );
}
