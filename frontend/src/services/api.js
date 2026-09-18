import axios from "axios";
import { cachePrice, priceCacheKey, readCachedPrice } from "../utils/offlineStorage";

export const api = axios.create({
  baseURL: "https://farmlink-backend-3zww.onrender.com",
  timeout: 60000,
});

export function setToken(token) {
  if (token) api.defaults.headers.common.Authorization = `Bearer ${token}`;
  else delete api.defaults.headers.common.Authorization;
}

const existing = localStorage.getItem("fl_token");
if (existing) setToken(existing);

export async function recommendPrice(body) {
  const key = priceCacheKey(body);
  if (!navigator.onLine) {
    const cached = readCachedPrice(key);
    if (cached) return { ...cached, fromCache: true };
    throw new Error("Offline and no cached price");
  }
  const { data } = await api.post("/api/price-recommendation", body);
  cachePrice(key, data);
  return data;
}

// ── Market Prices ─────────────────────────────────────────────────────────────
export async function getMarketPrices() {
  const { data } = await api.get("/api/pricing/market");
  return data.prices || [];
}

// ── Verification APIs ─────────────────────────────────────────────────────────
export async function sendVerificationOtp(phone) {
  const { data } = await api.post("/api/verification/otp/send", { phone });
  return data;
}

export async function verifyVerificationOtp(sessionId, otp) {
  const { data } = await api.post("/api/verification/otp/verify", {
    session_id: sessionId,
    otp,
  });
  return data;
}

export async function verifyIdentity(idReference) {
  const { data } = await api.post("/api/verification/identity/verify", {
    id_reference: idReference,
  });
  return data;
}

export async function submitFarmerVerification(payload) {
  const { data } = await api.post("/api/verification/farmer/submit", payload);
  return data;
}

export async function getFarmerVerificationStatus() {
  const { data } = await api.get("/api/verification/farmer/status");
  return data;
}

export async function submitBuyerVerification(payload) {
  const { data } = await api.post("/api/verification/buyer/submit", payload);
  return data;
}

export async function getBuyerVerificationStatus() {
  const { data } = await api.get("/api/verification/buyer/status");
  return data;
}

export async function getVerificationStatus() {
  const { data } = await api.get("/api/verification/status");
  return data;
}

// ── Buyer Contact Request ─────────────────────────────────────────────────────
export async function requestFarmerContact(listingId) {
  const { data } = await api.post(`/api/buyers/request-contact/${listingId}`);
  return data;
}

// ── Admin Verification APIs ───────────────────────────────────────────────────
export async function getAdminVerifications(status = "", role = "") {
  const params = {};
  if (status) params.status = status;
  if (role) params.role = role;
  const { data } = await api.get("/api/admin/verifications", { params });
  return data.verifications || [];
}

export async function getAdminVerificationDetail(verifId) {
  const { data } = await api.get(`/api/admin/verifications/${verifId}`);
  return data;
}

export async function approveVerification(verifId, notes = "") {
  const { data } = await api.post(`/api/admin/verifications/${verifId}/approve`, { notes });
  return data;
}

export async function rejectVerification(verifId, reason = "") {
  const { data } = await api.post(`/api/admin/verifications/${verifId}/reject`, { reason });
  return data;
}

export async function suspendVerification(verifId, reason = "") {
  const { data } = await api.post(`/api/admin/verifications/${verifId}/suspend`, { reason });
  return data;
}

export async function requestMoreVerificationInfo(verifId, notes = "") {
  const { data } = await api.post(`/api/admin/verifications/${verifId}/request-more-info`, { notes });
  return data;
}

export async function getVerificationStats() {
  const { data } = await api.get("/api/admin/verifications/stats");
  return data;
}

export async function getRiskFlags() {
  const { data } = await api.get("/api/admin/risk-flags");
  return data;
}
