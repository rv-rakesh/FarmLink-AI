export default function StatusBadge({ status }) {
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
  };
  const cls = map[status] || "bg-stone-200 text-stone-800";
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold capitalize ${cls}`}>
      {(status || "unknown").replaceAll("_", " ")}
    </span>
  );
}
