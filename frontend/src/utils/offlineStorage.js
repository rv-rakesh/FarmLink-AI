const PRICE_KEY = "fl_price_cache";
const TREND_KEY = "fl_trend_cache";

export function cachePrice(queryKey, payload) {
  const all = JSON.parse(localStorage.getItem(PRICE_KEY) || "{}");
  all[queryKey] = { payload, savedAt: Date.now() };
  localStorage.setItem(PRICE_KEY, JSON.stringify(all));
}

export function readCachedPrice(queryKey) {
  const all = JSON.parse(localStorage.getItem(PRICE_KEY) || "{}");
  return all[queryKey]?.payload || null;
}

export function cacheTrends(payload) {
  localStorage.setItem(TREND_KEY, JSON.stringify({ payload, savedAt: Date.now() }));
}

export function readCachedTrends() {
  const raw = localStorage.getItem(TREND_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw).payload;
  } catch {
    return null;
  }
}

export function priceCacheKey({ crop, district, quality }) {
  return `${crop}|${district}|${quality}`;
}
