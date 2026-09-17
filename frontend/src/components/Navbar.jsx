import { Link, NavLink, useNavigate } from "react-router-dom";
import { Sprout, Wifi, WifiOff, Lock } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useLang } from "../context/LanguageContext";
import VerificationBadge from "./VerificationBadge";

export default function Navbar() {
  const { user, logout } = useAuth();
  const { t, lang, setLang } = useLang();
  const nav = useNavigate();
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  const dash =
    user?.role === "buyer" ? "/buyer" : user?.role === "admin" ? "/admin" : "/farmer";

  return (
    <header className="sticky top-0 z-40 border-b border-leaf-900/10 bg-cream-50/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <Link to="/" className="flex items-center gap-2 text-leaf-900">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-leaf-900 text-cream-50">
            <Sprout size={22} />
          </span>
          <span className="font-display text-xl font-bold leading-tight">
            {t.appName}
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-semibold text-leaf-900">
            {online ? <Wifi size={14} /> : <WifiOff size={14} />}
            {online ? "Online" : "Offline"}
          </span>
          <select
            className="rounded-xl border-2 border-leaf-900/15 bg-white px-2 py-2 text-sm font-semibold"
            value={lang}
            onChange={(e) => setLang(e.target.value)}
            aria-label="Language"
          >
            <option value="en">EN</option>
            <option value="hi">हिंदी</option>
            <option value="mr">मराठी</option>
          </select>
          {user ? (
            <>
              {/* Verification badge in header */}
              {user.role !== "admin" && (
                <div className="hidden sm:block">
                  <VerificationBadge
                    level={user.verification_level || (user.phone_verified ? 1 : 0)}
                    status={user.verification_status || "PENDING"}
                    role={user.role}
                    trustScore={user.trust_score || 0}
                    size="sm"
                  />
                </div>
              )}
              <span className="hidden md:inline rounded-full bg-leaf-100 px-3 py-1 text-sm font-bold text-leaf-900">
                {t.roles[user.role] || user.role}
              </span>
              <NavLink className="btn-ghost !py-2 !px-3 text-sm" to={dash}>
                {t.nav.dashboard}
              </NavLink>
              <button
                className="btn-primary !py-2 !px-3 text-sm"
                onClick={() => {
                  logout();
                  nav("/");
                }}
              >
                {t.nav.logout}
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login?role=admin"
                className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold text-soil-900/70 hover:text-leaf-900 px-2 py-1"
                title="Admin Login"
              >
                <Lock size={13} /> Admin
              </Link>
              <Link className="btn-ghost !py-2 !px-3 text-sm" to="/login">
                {t.nav.login}
              </Link>
              <Link className="btn-primary !py-2 !px-3 text-sm" to="/signup">
                {t.nav.signup}
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
