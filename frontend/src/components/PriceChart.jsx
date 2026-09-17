import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceLine } from "recharts";

export default function PriceChart({ history = [], min, max, target }) {
  const data = history.map((h) => ({ ...h, min, max }));
  if (!data.length) {
    return <p className="text-sm text-leaf-900/70">No chart data yet. Preview a price to load mandi history.</p>;
  }
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="p" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#40916C" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#40916C" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1B433220" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} minTickGap={24} />
          <YAxis tick={{ fontSize: 11 }} width={48} />
          <Tooltip />
          <Area type="monotone" dataKey="price" stroke="#1B4332" fill="url(#p)" strokeWidth={2} />
          {min != null && <ReferenceLine y={min} stroke="#E09F3E" strokeDasharray="4 4" label="Min" />}
          {max != null && <ReferenceLine y={max} stroke="#E09F3E" strokeDasharray="4 4" label="Max" />}
          {target != null && <ReferenceLine y={target} stroke="#2D6A4F" />}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
