import { useLang } from "../context/LanguageContext";

export default function StatusBadge({ status }) {
  const { t } = useLang();

  const map = {
    listed: "bg-leaf-100 text-leaf-900",
    matched: "bg-sky-100 text-sky-900",
    in_transit: "bg-amber-100 text-amber-950",
    delivered: "bg-emerald-100 text-emerald-900",
    payment_released: "bg-harvest-400 text-soil-950",
    escrow_held: "bg-indigo-100 text-indigo-900",
    released: "bg-leaf-300 text-leaf-950",
    completed: "bg-leaf-500 text-white",
    pending: "bg-stone-200 text-stone-800",
    unknown: "bg-stone-200 text-stone-800",
  };

  const labels = {
    listed: t.order?.statusListed || "Listed",
    matched: t.order?.statusMatched || "Matched",
    in_transit: t.order?.statusInTransit || "In Transit",
    delivered: t.order?.statusDelivered || "Delivered",
    payment_released:
      t.order?.statusPaymentReleased || "Payment Released",
    escrow_held:
      t.order?.statusEscrowHeld || "Escrow Held",
    released:
      t.order?.statusReleased || "Released",
    completed:
      t.order?.statusCompleted || "Completed",
    pending:
      t.order?.statusPending || "Pending",
    unknown:
      t.order?.statusUnknown || "Unknown",
  };

  const safeStatus = status || "unknown";

  const cls =
    map[safeStatus] ||
    "bg-stone-200 text-stone-800";

  const label =
    labels[safeStatus] ||
    safeStatus.replaceAll("_", " ");

  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${cls}`}
    >
      {label}
    </span>
  );
}
