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

  const [online, setOnline] = useState(
    typeof navigator !== "undefined"
      ? navigator.onLine
      : true
  );

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const dash =
    user?.role === "buyer"
      ? "/buyer"
      : user?.role === "admin"
      ? "/admin"
      : "/farmer";

  const roleLabel =
    t.roles?.[user?.role] || user?.role || "";

  const onlineLabel =
    t.nav?.online || "Online";

  const offlineLabel =
    t.nav?.offline || "Offline";

  const languageLabel =
    t.nav?.language || "Language";

  const adminLabel =
    t.nav?.admin || "Admin";

  return (
    <header className="sticky top-0 z-40 border-b border-leaf-900/10 bg-cream-50/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        {/* Brand */}
        <Link
          to="/"
          className="flex min-w-0 items-center gap-2 text-leaf-900"
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-leaf-900 text-cream-50">
            <Sprout size={22} />
          </span>

          <span className="truncate font-display text-xl font-bold leading-tight">
            {t.appName}
          </span>
        </Link>

        <div className="flex items-center gap-2">
          {/* Connection status */}
          <span
            className="hidden items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-semibold text-leaf-900 sm:inline-flex"
            title={online ? onlineLabel : offlineLabel}
          >
            {online ? (
              <Wifi size={14} />
            ) : (
              <WifiOff size={14} />
            )}

            {online ? onlineLabel : offlineLabel}
          </span>

          {/* Language */}
          <select
            className="rounded-xl border-2 border-leaf-900/15 bg-white px-2 py-2 text-sm font-semibold"
            value={lang}
            onChange={(e) => setLang(e.target.value)}
            aria-label={languageLabel}
          >
            <option value="en">EN</option>
            <option value="hi">हिंदी</option>
            <option value="mr">मराठी</option>
          </select>

          {user ? (
            <>
              {/* Verification badge */}
              {user.role !== "admin" && (
                <div className="hidden sm:block">
                  <VerificationBadge
                    level={
                      user.verification_level ||
                      (user.phone_verified ? 1 : 0)
                    }
                    status={
                      user.verification_status ||
                      "PENDING"
                    }
                    role={user.role}
                    trustScore={
                      user.trust_score || 0
                    }
                    size="sm"
                  />
                </div>
              )}

              {/* Role */}
              <span className="hidden rounded-full bg-leaf-100 px-3 py-1 text-sm font-bold text-leaf-900 md:inline">
                {roleLabel}
              </span>

              {/* Dashboard */}
              <NavLink
                className="btn-ghost !px-3 !py-2 text-sm"
                to={dash}
              >
                {t.nav?.dashboard || "Dashboard"}
              </NavLink>

              {/* Logout */}
              <button
                type="button"
                className="btn-primary !px-3 !py-2 text-sm"
                onClick={() => {
                  logout();
                  nav("/");
                }}
              >
                {t.nav?.logout || "Logout"}
              </button>
            </>
          ) : (
            <>
              {/* Admin */}
              <Link
                to="/login?role=admin"
                className="hidden items-center gap-1 px-2 py-1 text-xs font-semibold text-soil-900/70 hover:text-leaf-900 sm:inline-flex"
                title={adminLabel}
              >
                <Lock size={13} />
                {adminLabel}
              </Link>

              {/* Login */}
              <Link
                className="btn-ghost !px-3 !py-2 text-sm"
                to="/login"
              >
                {t.nav?.login || "Login"}
              </Link>

              {/* Signup */}
              <Link
                className="btn-primary !px-3 !py-2 text-sm"
                to="/signup"
              >
                {t.nav?.signup || "Sign Up"}
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
