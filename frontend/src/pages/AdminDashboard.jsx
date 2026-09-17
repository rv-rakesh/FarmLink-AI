import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ShieldCheck, AlertTriangle, ArrowRight, CheckCircle2 } from "lucide-react";
import { api } from "../services/api";
import { useLang } from "../context/LanguageContext";

export default function AdminDashboard() {
  const { t } = useLang();
  const [data, setData] = useState(null);

  const load = () => api.get("/api/admin/overview").then((r) => setData(r.data));
  useEffect(() => {
    load();
  }, []);

  if (!data) return <p className="p-8 text-center text-sm text-soil-900/60">Loading admin metrics…</p>;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold text-leaf-950">{t.admin.title}</h1>
          <p className="text-xs text-soil-900/60">Database: {data.using_mongomock ? "MongoMock (in-memory)" : "MongoDB"}</p>
        </div>
        <Link to="/admin/verifications" className="btn-primary !py-2.5 !px-5 text-sm self-start sm:self-auto">
          <ShieldCheck size={16} /> Verification & Fraud Portal →
        </Link>
      </div>

      {/* Verification Portal Hero Card */}
      <div className="card bg-leaf-900 text-cream-50 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border border-leaf-700/40 shadow-xl">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-harvest-400">
            <ShieldCheck size={16} /> Verification Queue Active
          </div>
          <h2 className="font-display text-2xl font-bold text-cream-50">
            User Verification & Risk Audit Queue
          </h2>
          <p className="text-xs text-cream-100/80 max-w-xl">
            Review farmer land records, FPO memberships, buyer GSTINs, and automated KYC checks. No badges are granted without completed review.
          </p>
        </div>
        <Link to="/admin/verifications" className="btn-gold !py-3 !px-6 text-sm shrink-0">
          Open Verification Queue ({data.counts?.pending_verifications || 0}) <ArrowRight size={16} />
        </Link>
      </div>

      {/* Counts Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="card text-center p-4">
          <p className="text-xs font-semibold text-soil-900/60 uppercase">Farmers</p>
          <p className="font-display text-3xl font-bold text-leaf-950">{data.counts?.farmers || 0}</p>
        </div>
        <div className="card text-center p-4">
          <p className="text-xs font-semibold text-soil-900/60 uppercase">Buyers</p>
          <p className="font-display text-3xl font-bold text-leaf-950">{data.counts?.buyers || 0}</p>
        </div>
        <div className="card text-center p-4">
          <p className="text-xs font-semibold text-soil-900/60 uppercase">Listings</p>
          <p className="font-display text-3xl font-bold text-leaf-950">{data.counts?.listings || 0}</p>
        </div>
        <div className="card text-center p-4">
          <p className="text-xs font-semibold text-soil-900/60 uppercase">Orders</p>
          <p className="font-display text-3xl font-bold text-leaf-950">{data.counts?.orders || 0}</p>
        </div>
        <div className="card text-center p-4">
          <p className="text-xs font-semibold text-soil-900/60 uppercase">Pending Review</p>
          <p className="font-display text-3xl font-bold text-harvest-500">{data.counts?.pending_verifications || 0}</p>
        </div>
      </div>

      {/* GMV Metrics */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="card p-5">
          <p className="text-xs font-semibold text-soil-900/60 uppercase">Total GMV</p>
          <p className="font-display text-2xl font-bold text-leaf-950">₹{Math.round(data.gmv).toLocaleString("en-IN")}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs font-semibold text-soil-900/60 uppercase">Escrow Held</p>
          <p className="font-display text-2xl font-bold text-harvest-500">₹{Math.round(data.escrow_held_value).toLocaleString("en-IN")}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs font-semibold text-soil-900/60 uppercase">Direct Payouts Released</p>
          <p className="font-display text-2xl font-bold text-leaf-700">₹{Math.round(data.released_value).toLocaleString("en-IN")}</p>
        </div>
      </div>

      {/* Recent Verifications list */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl font-bold text-leaf-950">{t.admin.pending}</h2>
          <Link to="/admin/verifications" className="text-xs font-bold text-leaf-700 underline">
            View All ({data.pending_verifications?.length || 0}) →
          </Link>
        </div>
        {(!data.pending_verifications || data.pending_verifications.length === 0) ? (
          <p className="text-sm text-soil-900/60">Verification queue is clear.</p>
        ) : (
          <ul className="space-y-2.5">
            {data.pending_verifications.slice(0, 5).map((b) => (
              <li key={b.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-2xl bg-cream-50 p-3.5 border border-leaf-900/10">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-leaf-950">{b.name || b.business_name}</span>
                    <span className="text-[10px] bg-leaf-100 text-leaf-900 font-bold px-2 py-0.5 rounded-full uppercase">
                      {b.role || "buyer"}
                    </span>
                    <span className="text-xs text-harvest-500 font-semibold">{b.status}</span>
                  </div>
                  <p className="text-xs text-soil-900/70 mt-0.5">
                    Phone: +91 {b.phone || "N/A"} · District: {b.district || "N/A"}
                  </p>
                </div>
                <Link
                  to="/admin/verifications"
                  className="btn-primary !py-1.5 !px-3 text-xs self-start sm:self-auto"
                >
                  Review Details →
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Escrow Flags */}
      <div className="card">
        <h2 className="font-display text-xl font-bold text-leaf-950 mb-3">{t.admin.flags}</h2>
        {data.escrow_flags.length === 0 ? (
          <p className="text-sm text-soil-900/60">No payment flags currently active.</p>
        ) : (
          <ul className="space-y-2">
            {data.escrow_flags.map((f) => (
              <li key={f.id} className="rounded-2xl border border-leaf-900/10 p-3 text-xs bg-cream-50">
                Order #{f.id.slice(-6).toUpperCase()} · ₹{f.total_amount?.toLocaleString("en-IN")} · Delivery: {f.delivery_status} / Payment: {f.payment_status}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
