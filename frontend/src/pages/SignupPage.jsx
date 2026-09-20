import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useLang } from "../context/LanguageContext";

const DISTRICTS = [
  "Nashik",
  "Pune",
  "Karnal",
  "Ludhiana",
  "Nagpur",
  "Ahmedabad",
  "Indore",
  "Jaipur",
  "Hyderabad",
  "Bengaluru",
];

export default function SignupPage() {
  const { t } = useLang();
  const { signup } = useAuth();
  const nav = useNavigate();
  const [params] = useSearchParams();

  const [role, setRole] = useState(params.get("role") || "farmer");

  const [form, setForm] = useState({
    name: "",
    phone: "",
    password: "",
    village: "",
    district: "Nashik",
    gstin: "",
    business_name: "",
  });

  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (k, v) =>
    setForm((f) => ({
      ...f,
      [k]: v,
    }));

  const submit = async (e) => {
    e.preventDefault();

    if (busy) return;

    setErr("");
    setBusy(true);

    try {
      const payload = {
        ...form,
        role,
      };

      const u = await signup(payload);

      nav(
        u.role === "buyer"
          ? "/buyer/verify"
          : "/farmer"
      );
    } catch (ex) {
      setErr(
        ex?.response?.data?.error ||
          ex?.message ||
          t.auth.signupFailed
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <div className="card">

        <h1 className="font-display text-3xl">
          {t.auth.create}
        </h1>

        <form
          className="mt-6 space-y-3"
          onSubmit={submit}
        >

          <select
            className="field"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            disabled={busy}
          >
            <option value="farmer">
              {t.roles.farmer}
            </option>

            <option value="buyer">
              {t.roles.buyer}
            </option>
          </select>

          {role === "farmer" ? (
            <>
              <input
                className="field"
                placeholder={t.auth.name}
                value={form.name}
                onChange={(e) =>
                  set("name", e.target.value)
                }
                disabled={busy}
                required
              />

              <input
                className="field"
                placeholder={t.auth.village}
                value={form.village}
                onChange={(e) =>
                  set("village", e.target.value)
                }
                disabled={busy}
              />
            </>
          ) : (
            <>
              <input
                className="field"
                placeholder={t.auth.business}
                value={form.business_name}
                onChange={(e) =>
                  set(
                    "business_name",
                    e.target.value
                  )
                }
                disabled={busy}
                required
              />

              <input
                className="field"
                placeholder={t.auth.gstin}
                value={form.gstin}
                onChange={(e) =>
                  set("gstin", e.target.value)
                }
                disabled={busy}
                required
              />
            </>
          )}

          <select
            className="field"
            value={form.district}
            onChange={(e) =>
              set("district", e.target.value)
            }
            disabled={busy}
          >
            {DISTRICTS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          <input
            className="field"
            placeholder={t.auth.phone}
            value={form.phone}
            onChange={(e) =>
              set(
                "phone",
                e.target.value
                  .replace(/\D/g, "")
                  .slice(0, 10)
              )
            }
            pattern="[0-9]{10}"
            maxLength={10}
            inputMode="numeric"
            disabled={busy}
            required
          />

          <input
            className="field"
            type="password"
            placeholder={t.auth.password}
            value={form.password}
            onChange={(e) =>
              set("password", e.target.value)
            }
            minLength={8}
            disabled={busy}
            required
          />

          {err && (
            <p className="text-red-700 font-semibold">
              {err}
            </p>
          )}

          <button
            type="submit"
            className="btn-primary w-full"
            disabled={busy}
          >
            {busy
              ? t.auth.creating
              : t.auth.submitSignup}
          </button>

        </form>

        <p className="mt-4 text-sm">
          <Link
            className="underline"
            to="/login"
          >
            {t.nav.login}
          </Link>
        </p>

      </div>
    </div>
  );
}
