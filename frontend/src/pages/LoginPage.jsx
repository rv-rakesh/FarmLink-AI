import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useLang } from "../context/LanguageContext";

const DEMOS = {
  farmer: { role: "farmer", phone: "9876540001", password: "Farm@123" },
  buyer: { role: "buyer", phone: "9000000001", password: "Buyer@123" },
  admin: { role: "admin", phone: "9999999999", password: "Admin@123" },
};

export default function LoginPage() {
  const { t } = useLang();
  const { login } = useAuth();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [role, setRole] = useState(params.get("role") || "farmer");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");

  const goDash = (u) => {
    if (u.role === "buyer") nav("/buyer");
    else if (u.role === "admin") nav("/admin");
    else nav("/farmer");
  };

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    try {
      const u = await login({ role, phone, password });
      goDash(u);
    } catch (ex) {
      setErr(ex.response?.data?.error || ex.message);
    }
  };

  const demo = async (key) => {
    const d = DEMOS[key];
    setRole(d.role);
    setPhone(d.phone);
    setPassword(d.password);
    const u = await login(d);
    goDash(u);
  };

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <div className="card">
        <h1 className="font-display text-3xl">{t.auth.welcomeBack}</h1>
        <form className="mt-6 space-y-4" onSubmit={submit}>
          <div>
            <label className="label">{t.auth.role}</label>
            <select className="field" value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="farmer">{t.roles.farmer}</option>
              <option value="buyer">{t.roles.buyer}</option>
              <option value="admin">{t.roles.admin}</option>
            </select>
          </div>
          <div>
            <label className="label">{t.auth.phone}</label>
            <input className="field" value={phone} onChange={(e) => setPhone(e.target.value)} required />
          </div>
          <div>
            <label className="label">{t.auth.password}</label>
            <input
              className="field"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {err && <p className="text-red-700 font-semibold">{err}</p>}
          <button className="btn-primary w-full">{t.auth.submitLogin}</button>
        </form>
        <div className="mt-4 grid gap-2">
          <button className="btn-ghost w-full" onClick={() => demo("farmer")}>
            {t.auth.demoFarmer}
          </button>
          <button className="btn-ghost w-full" onClick={() => demo("buyer")}>
            {t.auth.demoBuyer}
          </button>
          <button className="btn-ghost w-full" onClick={() => demo("admin")}>
            {t.auth.demoAdmin}
          </button>
        </div>
        <p className="mt-4 text-sm">
          <Link className="underline" to="/signup">
            {t.nav.signup}
          </Link>
        </p>
      </div>
    </div>
  );
}
