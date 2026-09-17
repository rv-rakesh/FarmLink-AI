import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShieldCheck, TrendingUp, Phone, Lock, ArrowRight, CheckCircle2, Building2 } from "lucide-react";
import { api, getMarketPrices, getBuyerVerificationStatus, requestFarmerContact } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useLang } from "../context/LanguageContext";
import StatusBadge from "../components/StatusBadge";
import VerificationBadge from "../components/VerificationBadge";
import TrustScore from "../components/TrustScore";

export default function BuyerDashboard() {
  const { user } = useAuth();
  const { t } = useLang();
  const nav = useNavigate();
  const [feed, setFeed] = useState([]);
  const [orders, setOrders] = useState([]);
  const [marketPrices, setMarketPrices] = useState([]);
  const [verif, setVerif] = useState(null);
  const [contactModal, setContactModal] = useState(null);

  useEffect(() => {
    api.get("/api/buyers/feed").then((r) => setFeed(r.data || []));
    api.get("/api/orders").then((r) => setOrders(r.data || []));
    getMarketPrices().then((p) => setMarketPrices(p || [])).catch(() => {});
    getBuyerVerificationStatus().then((d) => setVerif(d)).catch(() => {});
  }, []);

  const isVerified = verif?.status === "VERIFIED" || user?.is_verified || (user?.verification_level || 0) >= 4;
  const currentLevel = verif?.verification_level || user?.verification_level || 0;
  const currentTrust = verif?.trust_score || user?.trust_score || 0;

  const handleRequestContact = async (listingId) => {
    if (!isVerified) {
      nav("/buyer/verify");
      return;
    }
    try {
      const res = await requestFarmerContact(listingId);
      setContactModal(res);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to retrieve contact details");
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
      {/* 1. Profile Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-leaf-900/10 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="font-display text-3xl font-bold text-leaf-950">
              {user?.business_name || user?.name}
            </h1>
            <VerificationBadge
              level={currentLevel}
              status={verif?.status || user?.verification_status || "PENDING"}
              role="buyer"
              trustScore={currentTrust}
              size="sm"
            />
          </div>
          <p className="text-sm text-soil-900/70">
            {user?.gstin ? `GSTIN: ${user.gstin} · ` : ""}Location: {user?.district || "Maharashtra"}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {!isVerified ? (
            <Link className="btn-gold !py-2.5 !px-5 text-sm" to="/buyer/verify">
              Complete Verification →
            </Link>
          ) : (
            <div className="flex items-center gap-1.5 rounded-full bg-leaf-100 px-3.5 py-1.5 text-xs font-bold text-leaf-900 border border-leaf-700/20">
              <CheckCircle2 size={16} className="text-leaf-700" />
              Verified Wholesale Buyer
            </div>
          )}
        </div>
      </div>

      {/* Verification Notice if unverified */}
      {!isVerified && (
        <div className="card bg-cream-50 border-2 border-harvest-500/40 p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-harvest-500 text-soil-950 font-bold">
              <ShieldCheck size={20} />
            </span>
            <div>
              <p className="font-bold text-soil-950 text-sm">
                Unlock Farmer Direct Contact (Current Trust: {currentTrust}/100)
              </p>
              <p className="text-xs text-soil-900/80 mt-0.5">
                Farmers' private phone numbers and farm addresses are protected. Complete account verification to view full contact details and place direct wholesale orders.
              </p>
            </div>
          </div>
          <button
            onClick={() => nav("/buyer/verify")}
            className="btn-primary !py-2 !px-4 text-xs shrink-0 self-start md:self-auto"
          >
            Start Verification Wizard <ArrowRight size={14} />
          </button>
        </div>
      )}

      {/* 2. Live Mandi Benchmarks Strip */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <TrendingUp size={16} className="text-leaf-700" />
            <h3 className="font-bold text-leaf-950 text-sm">Live Mandi Benchmark Rates</h3>
          </div>
          <span className="text-[10px] text-soil-900/50">data.gov.in / Agmarknet</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {(marketPrices.length > 0 ? marketPrices : [
            { crop: "Wheat", avg_price: 2275 },
            { crop: "Rice", avg_price: 2300 },
            { crop: "Potato", avg_price: 1800 },
            { crop: "Tomato", avg_price: 2000 },
            { crop: "Cotton", avg_price: 7121 },
          ]).map((item) => (
            <div key={item.crop} className="rounded-xl bg-cream-50 p-2 text-center border border-leaf-900/5">
              <span className="text-xs font-semibold text-soil-900/70">{item.crop}</span>
              <p className="font-mono font-bold text-leaf-900 text-sm">₹{item.avg_price}/q</p>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Main Grid: Available Harvests & Order History */}
      <div className="grid gap-6 md:grid-cols-12">
        {/* Available Listings Feed (8 cols) */}
        <div className="md:col-span-8 space-y-4">
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-display text-xl font-bold text-leaf-950">Direct Harvest Feed</h2>
                <p className="text-xs text-soil-900/60">Live agricultural lots listed directly by farmers</p>
              </div>
              <span className="text-xs font-bold text-leaf-700">{feed.length} Active Lots</span>
            </div>

            {feed.length === 0 ? (
              <div className="rounded-2xl bg-cream-50 p-8 text-center text-sm text-soil-900/60">
                No active listings matching your profile right now.
              </div>
            ) : (
              <div className="space-y-3.5">
                {feed.map((f) => {
                  const l = f.listing;
                  const canSeeContact = l.contact_revealed || isVerified;

                  return (
                    <div key={l.id} className="rounded-2xl border border-leaf-900/10 p-4 bg-white hover:shadow-sm transition">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-base text-leaf-950">
                              {l.crop} · {l.quantity} Quintals
                            </span>
                            <span className="rounded-md bg-leaf-100 px-2 py-0.5 text-[11px] font-bold text-leaf-900">
                              Grade {l.quality_grade || "B"}
                            </span>
                          </div>
                          <p className="text-xs text-soil-900/70 mt-1">
                            Origin: <strong>{l.farmer_district || l.district}</strong> · Farmer Asking: <strong className="text-leaf-900 text-sm">₹{l.farmer_asking_price}/q</strong>
                          </p>
                        </div>

                        <div className="flex flex-col sm:items-end gap-1">
                          <VerificationBadge
                            level={l.farmer_verified ? 4 : 2}
                            status={l.farmer_verified ? "VERIFIED" : "REGISTERED"}
                            role="farmer"
                            trustScore={l.farmer_trust_score || 50}
                            size="sm"
                          />
                          <span className="text-[11px] font-semibold text-soil-900/60">
                            Farmer: {l.farmer_name}
                          </span>
                        </div>
                      </div>

                      {/* Farmer Contact & Action */}
                      <div className="mt-3.5 pt-3 border-t border-leaf-900/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-1.5">
                          <Phone size={13} className={canSeeContact ? "text-leaf-700" : "text-soil-900/40"} />
                          <span className="text-soil-900/70">Farmer Contact: </span>
                          {canSeeContact ? (
                            <span className="font-mono font-bold text-leaf-900">+91 {l.farmer_phone}</span>
                          ) : (
                            <span className="font-mono text-soil-900/50 flex items-center gap-1">
                              <Lock size={11} /> {l.farmer_phone} (Locked)
                            </span>
                          )}
                        </div>

                        {canSeeContact ? (
                          <button
                            onClick={() => handleRequestContact(l.id)}
                            className="btn-primary !py-1.5 !px-3 text-xs"
                          >
                            Connect Directly →
                          </button>
                        ) : (
                          <button
                            onClick={() => nav("/buyer/verify")}
                            className="btn-gold !py-1.5 !px-3 text-xs"
                          >
                            Verify to View Contact
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: Orders & Trust Score (4 cols) */}
        <div className="md:col-span-4 space-y-4">
          <div className="card">
            <h3 className="font-display font-bold text-lg text-leaf-950 mb-3">Your Trust Score</h3>
            <TrustScore
              score={currentTrust}
              breakdown={verif?.trust_score_breakdown || {}}
            />
            <div className="mt-3 text-center">
              <Link to="/verification/status" className="text-xs font-semibold text-leaf-900 underline">
                View Verification Progress →
              </Link>
            </div>
          </div>

          <div className="card">
            <h3 className="font-display font-bold text-lg text-leaf-950 mb-3">Your Deals</h3>
            {orders.length === 0 ? (
              <p className="text-xs text-soil-900/60">No orders placed yet.</p>
            ) : (
              <ul className="space-y-2.5">
                {orders.map((o) => (
                  <li key={o.id}>
                    <Link
                      className="block rounded-xl border border-leaf-900/10 p-3 hover:shadow-sm transition bg-cream-50/50 text-xs"
                      to={`/orders/${o.id}`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-leaf-950">₹{o.total_amount?.toLocaleString("en-IN")}</span>
                        <StatusBadge status={o.delivery_status} />
                      </div>
                      <p className="mt-1 text-[11px] text-soil-900/60">
                        Order #{o.id?.slice(-6).toUpperCase()} · View Details →
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Direct Contact Modal */}
      {contactModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setContactModal(null)}>
          <div className="card max-w-sm w-full bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display font-bold text-xl text-leaf-950">Farmer Contact Details</h3>
            <div className="mt-4 space-y-2 text-sm bg-cream-50 p-4 rounded-2xl border border-leaf-900/10">
              <p><strong>Name:</strong> {contactModal.farmer?.name}</p>
              <p><strong>Direct Phone:</strong> <span className="font-mono font-bold text-leaf-900">+91 {contactModal.farmer?.phone}</span></p>
              <p><strong>District:</strong> {contactModal.farmer?.district}</p>
              <p><strong>Village:</strong> {contactModal.farmer?.village || "N/A"}</p>
              <p className="pt-2 border-t border-leaf-900/10 text-xs text-soil-900/70">
                Lot: {contactModal.quantity}q {contactModal.crop} @ ₹{contactModal.price}/q
              </p>
            </div>
            <button
              onClick={() => setContactModal(null)}
              className="btn-primary w-full mt-4 !py-2 text-sm"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
