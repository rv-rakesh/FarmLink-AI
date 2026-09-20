import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useLang } from "../context/LanguageContext";

const CROPS = ["Wheat", "Rice", "Potato", "Tomato", "Cotton"];

export default function BuyerVerifyPage() {
  const { user, refreshUser } = useAuth();
  const { t, lang } = useLang();
  const nav = useNavigate();

  const [gstin, setGstin] = useState(user?.gstin || "");
  const [bank, setBank] = useState("");
  const [crop, setCrop] = useState("Wheat");
  const [qty, setQty] = useState(40);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const cropLabel = (value) =>
    t.crops?.[value] || value;

  const submit = async (e) => {
    e.preventDefault();

    if (loading) return;

    setLoading(true);
    setMsg("");

    try {
      const { data } = await api.post(
        "/api/buyers/verify",
        {
          gstin,
          bank_account_ref: bank || "HDFC1234",
          demand_profile: [
            {
              crop,
              avg_qty_needed: Number(qty),
            },
          ],
        }
      );

      refreshUser(data.user);
      setMsg(data.gstin.message);

      if (data.user.verified) {
        nav("/buyer");
      }
    } catch (err) {
      setMsg(
        err?.response?.data?.error ||
          err?.message ||
          t.buyer?.verificationFailed ||
          "Verification failed"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <form
        className="card space-y-3"
        onSubmit={submit}
      >
        <h1 className="font-display text-3xl">
          {t.nav.verify}
        </h1>

        <p className="text-sm text-leaf-900/70">
          {t.buyer?.gstinSandboxHint ||
            "Instant mock GSTIN check (sandbox)."}
        </p>

        <input
          className="field"
          value={gstin}
          onChange={(e) =>
            setGstin(e.target.value.toUpperCase())
          }
          placeholder={t.auth.gstin}
          disabled={loading}
          required
        />

        <input
          className="field"
          value={bank}
          onChange={(e) =>
            setBank(e.target.value)
          }
          placeholder={
            t.buyer?.bankAccountReference ||
            "Bank account reference"
          }
          disabled={loading}
        />

        <select
          className="field"
          value={crop}
          onChange={(e) =>
            setCrop(e.target.value)
          }
          disabled={loading}
        >
          {CROPS.map((c) => (
            <option key={c} value={c}>
              {cropLabel(c)}
            </option>
          ))}
        </select>

        <input
          className="field"
          type="number"
          min="1"
          value={qty}
          onChange={(e) =>
            setQty(e.target.value)
          }
          placeholder={
            t.buyer?.quantity ||
            "Quantity"
          }
          disabled={loading}
          required
        />

        <button
          type="submit"
          className="btn-primary w-full"
          disabled={loading}
        >
          {loading
            ? t.buyer?.verifying || "Verifying..."
            : t.buyer?.verifyNow || "Verify now"}
        </button>

        {msg && (
          <p className="font-semibold text-sm">
            {msg}
          </p>
        )}
      </form>
    </div>
  );
}
