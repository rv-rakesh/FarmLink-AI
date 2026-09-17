import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useLang } from "../context/LanguageContext";

export default function BuyerVerifyPage() {
  const { user, refreshUser } = useAuth();
  const { t } = useLang();
  const nav = useNavigate();
  const [gstin, setGstin] = useState(user?.gstin || "");
  const [bank, setBank] = useState("");
  const [crop, setCrop] = useState("Wheat");
  const [qty, setQty] = useState(40);
  const [msg, setMsg] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    const { data } = await api.post("/api/buyers/verify", {
      gstin,
      bank_account_ref: bank || "HDFC1234",
      demand_profile: [{ crop, avg_qty_needed: Number(qty) }],
    });
    refreshUser(data.user);
    setMsg(data.gstin.message);
    if (data.user.verified) nav("/buyer");
  };

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <form className="card space-y-3" onSubmit={submit}>
        <h1 className="font-display text-3xl">{t.nav.verify}</h1>
        <p className="text-sm text-leaf-900/70">Instant mock GSTIN check (sandbox).</p>
        <input className="field" value={gstin} onChange={(e) => setGstin(e.target.value)} placeholder="GSTIN" />
        <input className="field" value={bank} onChange={(e) => setBank(e.target.value)} placeholder="Bank account ref" />
        <select className="field" value={crop} onChange={(e) => setCrop(e.target.value)}>
          {["Wheat", "Rice", "Potato", "Tomato", "Cotton"].map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <input className="field" type="number" value={qty} onChange={(e) => setQty(e.target.value)} />
        <button className="btn-primary w-full">Verify now</button>
        {msg && <p className="font-semibold">{msg}</p>}
      </form>
    </div>
  );
}
