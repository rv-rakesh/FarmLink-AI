import { MapPin, Truck } from "lucide-react";

export default function RouteVisualizer({ route }) {
  const stops = route?.stops || [];
  if (!stops.length) {
    return <p className="text-sm text-leaf-900/70">Route appears after a match is confirmed.</p>;
  }
  const w = 640;
  const h = 220;
  const pad = 48;
  const xs = stops.map((_, i) => pad + (i * (w - pad * 2)) / Math.max(stops.length - 1, 1));
  const ys = stops.map((s, i) => 110 + Math.sin(i * 1.1) * 36);
  const d = xs.map((x, i) => `${i === 0 ? "M" : "L"} ${x} ${ys[i]}`).join(" ");

  return (
    <div className="card">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="font-display text-xl font-semibold flex items-center gap-2">
          <Truck size={20} /> Pickup route
        </h3>
        <p className="text-sm font-semibold text-leaf-700">
          {route.total_km} km · ~{route.estimated_hours} h
        </p>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full overflow-visible">
        <path d={d} fill="none" stroke="#95D5B2" strokeWidth="10" strokeLinecap="round" />
        <path d={d} fill="none" stroke="#1B4332" strokeWidth="3" strokeDasharray="8 8" />
        {stops.map((s, i) => (
          <g key={s.id + i} transform={`translate(${xs[i]}, ${ys[i]})`}>
            <circle r="16" fill={s.kind === "hub" ? "#E09F3E" : "#1B4332"} />
            <text y="5" textAnchor="middle" fill="#FBF7EF" fontSize="12" fontWeight="700">
              {s.stop_order}
            </text>
          </g>
        ))}
      </svg>
      <ol className="mt-4 space-y-2">
        {stops.map((s) => (
          <li key={s.id + s.stop_order} className="flex items-start gap-3 rounded-2xl bg-cream-50 px-3 py-2">
            <span className="mt-0.5 grid h-7 w-7 place-items-center rounded-full bg-leaf-900 text-xs font-bold text-white">
              {s.stop_order}
            </span>
            <div>
              <p className="font-semibold">{s.label}</p>
              <p className="text-sm text-leaf-900/70 flex items-center gap-1">
                <MapPin size={14} />
                {s.distance_from_prev_km} km from previous · {s.eta_minutes} min · {s.kind}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
