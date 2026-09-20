import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ReferenceLine,
} from "recharts";
import { useLang } from "../context/LanguageContext";

export default function PriceChart({
  history = [],
  min,
  max,
  target,
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

  const formatDate = (value) => {
    if (!value) return "";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleDateString(locale, {
      day: "numeric",
      month: "short",
    });
  };

  const data = history.map((h) => ({
    ...h,
    min,
    max,
  }));

  if (!data.length) {
    return (
      <p className="text-sm text-leaf-900/70">
        {t.listing?.noChartData ||
          "No chart data yet. Preview a price to load mandi history."}
      </p>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer>
        <AreaChart
          data={data}
          margin={{
            top: 8,
            right: 12,
            left: 0,
            bottom: 0,
          }}
        >
          <defs>
            <linearGradient
              id="price-gradient"
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop
                offset="0%"
                stopColor="#40916C"
                stopOpacity={0.35}
              />
              <stop
                offset="100%"
                stopColor="#40916C"
                stopOpacity={0}
              />
            </linearGradient>
          </defs>

          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#1B433220"
          />

          <XAxis
            dataKey="date"
            tick={{ fontSize: 11 }}
            minTickGap={24}
            tickFormatter={formatDate}
          />

          <YAxis
            tick={{ fontSize: 11 }}
            width={56}
            tickFormatter={formatNumber}
          />

          <Tooltip
            formatter={(value) => [
              `₹${formatNumber(value)}`,
              t.listing?.price || "Price",
            ]}
            labelFormatter={(label) =>
              formatDate(label)
            }
          />

          <Area
            type="monotone"
            dataKey="price"
            stroke="#1B4332"
            fill="url(#price-gradient)"
            strokeWidth={2}
          />

          {min != null && (
            <ReferenceLine
              y={min}
              stroke="#E09F3E"
              strokeDasharray="4 4"
              label={
                t.listing?.min ||
                "Min"
              }
            />
          )}

          {max != null && (
            <ReferenceLine
              y={max}
              stroke="#E09F3E"
              strokeDasharray="4 4"
              label={
                t.listing?.max ||
                "Max"
              }
            />
          )}

          {target != null && (
            <ReferenceLine
              y={target}
              stroke="#2D6A4F"
              label={
                t.listing?.target ||
                "Target"
              }
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
