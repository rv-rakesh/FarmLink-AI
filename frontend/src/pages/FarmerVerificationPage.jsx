import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, CheckCircle2, ShieldCheck, Smartphone, FileText, MapPin, Sparkles, AlertCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import TrustScore from "../components/TrustScore";
import VerificationBadge from "../components/VerificationBadge";
import {
  sendVerificationOtp,
  verifyVerificationOtp,
  verifyIdentity,
  submitFarmerVerification,
  getFarmerVerificationStatus,
} from "../services/api";

export default function FarmerVerificationPage() {
  const { user, fetchCurrentUser } = useAuth();
  const nav = useNavigate();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Verification status from server
  const [verifStatus, setVerifStatus] = useState(null);

  // Form states
  // Step 1: Mobile OTP
  const [phone, setPhone] = useState(user?.phone || "");
  const [otpSessionId, setOtpSessionId] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [sandboxOtp, setSandboxOtp] = useState("");
  const [otpVerified, setOtpVerified] = useState(false);

  // Step 2: Identity
  const [fullName, setFullName] = useState(user?.name || "");
  const [idReference, setIdReference] = useState("");
  const [idVerified, setIdVerified] = useState(false);

  // Step 3: Agricultural Evidence
  const [evidenceType, setEvidenceType] = useState("fpo_membership");
  const [evidenceRef, setEvidenceRef] = useState("");

  // Step 4: Location
  const [stateName, setStateName] = useState("Maharashtra");
  const [district, setDistrict] = useState(user?.district || "Nashik");
  const [village, setVillage] = useState(user?.village || "");

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    try {
      const data = await getFarmerVerificationStatus();
      setVerifStatus(data);
      if (data.phone_verified) {
        setOtpVerified(true);
        if (step === 1) setStep(2);
      }
      if (data.identity_verified) {
        setIdVerified(true);
        if (step === 2) setStep(3);
      }
      if (data.agricultural_verification?.status in { submitted: 1, verified: 1 }) {
        if (step === 3) setStep(4);
      }
    } catch (e) {
      // initial load
    }
  };

  // Step 1: Send OTP
  const handleSendOtp = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await sendVerificationOtp(phone);
      setOtpSessionId(res.session_id);
      if (res.sandbox_otp) {
        setSandboxOtp(res.sandbox_otp);
        setOtpCode(res.sandbox_otp); // auto-fill in demo for convenience
      }
      setSuccessMsg("OTP sent to " + phone + ". In demo sandbox, OTP is auto-filled.");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  // Step 1: Verify OTP
  const handleVerifyOtp = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await verifyVerificationOtp(otpSessionId, otpCode);
      setOtpVerified(true);
      setSuccessMsg("Mobile verified successfully!");
      await fetchCurrentUser();
      await loadStatus();
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.error || "Invalid OTP code");
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify Identity
  const handleVerifyId = async () => {
    if (!idReference || idReference.length < 8) {
      setError("Please enter a valid identity document reference (at least 8 characters)");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await verifyIdentity(idReference);
      setIdVerified(res.identity_verified);
      setSuccessMsg(res.message || "Identity verified!");
      await fetchCurrentUser();
      await loadStatus();
      setStep(3);
    } catch (err) {
      setError(err.response?.data?.error || "Identity verification failed");
    } finally {
      setLoading(false);
    }
  };

  // Step 4: Final Submit
  const handleFinalSubmit = async () => {
    if (!evidenceRef) {
      setError("Please provide your agricultural evidence reference number");
      setStep(3);
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await submitFarmerVerification({
        id_reference: idReference,
        evidence_type: evidenceType,
        evidence_reference: evidenceRef,
        state: stateName,
        district,
        village,
      });
      setSuccessMsg("Verification details submitted for review!");
      await fetchCurrentUser();
      nav("/verification/status");
    } catch (err) {
      setError(err.response?.data?.error || "Submission failed");
    } finally {
      setLoading(false);
    }
  };

  const currentTrustScore = verifStatus?.trust_score || (otpVerified ? 10 : 0) + (idVerified ? 20 : 0);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* Header with Back button */}
      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={() => nav("/farmer")}
          className="inline-flex items-center gap-2 text-sm font-semibold text-leaf-900 hover:text-leaf-700"
        >
          <ArrowLeft size={16} /> Back to Dashboard
        </button>
        <VerificationBadge
          level={verifStatus?.verification_level || (otpVerified ? 1 : 0)}
          status={verifStatus?.status || "PENDING"}
          role="farmer"
          trustScore={currentTrustScore}
        />
      </div>

      {/* Main card */}
      <div className="card">
        {/* Title */}
        <div className="border-b border-leaf-900/10 pb-5">
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-leaf-900 text-cream-50 shadow-card">
              <ShieldCheck size={26} />
            </span>
            <div>
              <h1 className="font-display text-2xl md:text-3xl font-bold text-leaf-950">
                Farmer Verification
              </h1>
              <p className="mt-1 text-sm text-soil-900/70">
                Complete all 4 verification steps to unlock the Verified Farmer badge and direct buyer connections.
              </p>
            </div>
          </div>

          {/* Trust score widget */}
          <div className="mt-5">
            <TrustScore
              score={currentTrustScore}
              breakdown={verifStatus?.trust_score_breakdown || {}}
            />
          </div>

          {/* Stepper indicators */}
          <div className="mt-6 grid grid-cols-4 gap-2 text-center text-xs font-semibold">
            {[
              { num: 1, label: "Mobile OTP", icon: Smartphone },
              { num: 2, label: "Identity", icon: FileText },
              { num: 3, label: "Agri Evidence", icon: Sparkles },
              { num: 4, label: "Location", icon: MapPin },
            ].map((s) => {
              const active = step === s.num;
              const done = step > s.num || (s.num === 1 && otpVerified) || (s.num === 2 && idVerified);
              return (
                <button
                  key={s.num}
                  type="button"
                  onClick={() => setStep(s.num)}
                  className={`flex flex-col items-center gap-1.5 rounded-2xl p-2.5 transition ${
                    active
                      ? "bg-leaf-900 text-cream-50 shadow-card"
                      : done
                      ? "bg-leaf-100 text-leaf-900"
                      : "bg-cream-50 text-soil-900/60"
                  }`}
                >
                  <s.icon size={16} />
                  <span className="truncate">{s.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Feedback alerts */}
        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            <AlertCircle size={18} className="shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="mt-4 flex items-center gap-2 rounded-2xl border border-leaf-700/30 bg-leaf-100/50 p-3 text-sm text-leaf-900">
            <CheckCircle2 size={18} className="shrink-0 text-leaf-700" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Step 1: Mobile OTP */}
        {step === 1 && (
          <div className="mt-6 space-y-4">
            <div>
              <h3 className="text-lg font-bold text-leaf-950 flex items-center gap-2">
                <Smartphone size={20} className="text-leaf-700" /> Step 1: Verify Mobile Number
              </h3>
              <p className="text-xs text-soil-900/70 mt-0.5">
                Farmers use their phone number to receive real SMS bids and voice AI callbacks.
              </p>
            </div>

            <div>
              <label className="label">Mobile Number</label>
              <div className="flex gap-2">
                <input
                  type="tel"
                  className="field flex-1"
                  placeholder="10-digit mobile number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={otpVerified}
                />
                {!otpVerified && (
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={loading || !phone}
                    className="btn-primary shrink-0"
                  >
                    {loading ? "Sending..." : "Send OTP"}
                  </button>
                )}
              </div>
            </div>

            {otpSessionId && !otpVerified && (
              <div className="rounded-2xl border border-harvest-500/30 bg-harvest-400/10 p-4">
                <label className="label">Enter 6-Digit OTP Code</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    maxLength={6}
                    className="field flex-1 tracking-widest text-center font-mono font-bold"
                    placeholder="------"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={handleVerifyOtp}
                    disabled={loading || !otpCode}
                    className="btn-gold shrink-0"
                  >
                    {loading ? "Verifying..." : "Verify Code"}
                  </button>
                </div>
                {sandboxOtp && (
                  <p className="mt-2 text-xs text-soil-900/70">
                    <strong>Sandbox Demo:</strong> Your simulated code is <span className="font-mono font-bold text-leaf-900">{sandboxOtp}</span>
                  </p>
                )}
              </div>
            )}

            {otpVerified && (
              <div className="flex items-center justify-between rounded-2xl bg-leaf-100/60 p-4 border border-leaf-700/20">
                <div className="flex items-center gap-2 text-sm font-bold text-leaf-900">
                  <CheckCircle2 size={18} className="text-leaf-700" /> Mobile Verified (+10 Trust Points)
                </div>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="btn-primary !py-2 !px-4 text-sm"
                >
                  Proceed to Step 2 <ArrowRight size={16} />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Identity */}
        {step === 2 && (
          <div className="mt-6 space-y-4">
            <div>
              <h3 className="text-lg font-bold text-leaf-950 flex items-center gap-2">
                <FileText size={20} className="text-leaf-700" /> Step 2: Identity KYC Verification
              </h3>
              <p className="text-xs text-soil-900/70 mt-0.5">
                We verify government identity references through official sandbox checks. Raw copies are never stored.
              </p>
            </div>

            <div>
              <label className="label">Farmer Full Name (as on Government ID)</label>
              <input
                type="text"
                className="field"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Full Name"
              />
            </div>

            <div>
              <label className="label">Identity Reference Number (PAN / Aadhaar Ref)</label>
              <input
                type="text"
                className="field uppercase"
                value={idReference}
                onChange={(e) => setIdReference(e.target.value.toUpperCase())}
                placeholder="e.g. ABCDE1234F or REF12345678"
              />
              <p className="mt-1 text-xs text-soil-900/60">
                Sandbox hint: Standard PAN formats (e.g. ABCDE1234F) are automatically verified (+20 Trust Points).
              </p>
            </div>

            <div className="flex justify-between pt-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="btn-ghost !py-2 text-sm"
              >
                ← Back
              </button>
              <button
                type="button"
                onClick={handleVerifyId}
                disabled={loading || !idReference}
                className="btn-primary !py-2 text-sm"
              >
                {loading ? "Checking KYC..." : "Verify Identity & Continue →"}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Agricultural Evidence */}
        {step === 3 && (
          <div className="mt-6 space-y-4">
            <div>
              <h3 className="text-lg font-bold text-leaf-950 flex items-center gap-2">
                <Sparkles size={20} className="text-leaf-700" /> Step 3: Agricultural Evidence
              </h3>
              <p className="text-xs text-soil-900/70 mt-0.5">
                Proof of agricultural activity gives buyers confidence that they are transacting with a legitimate grower.
              </p>
            </div>

            <div>
              <label className="label">Select Evidence Type</label>
              <select
                className="field"
                value={evidenceType}
                onChange={(e) => setEvidenceType(e.target.value)}
              >
                <option value="fpo_membership">FPO / Farmer Producer Company Membership (+Govt Bonus)</option>
                <option value="land_record">Land Record / Khatauni Reference</option>
                <option value="farmer_registration">State Farmer Registration Certificate</option>
                <option value="cooperative">Agricultural Cooperative Society Member</option>
                <option value="pm_kisan">PM-KISAN Beneficiary ID</option>
                <option value="other">Other Agricultural Evidence</option>
              </select>
            </div>

            <div>
              <label className="label">Document / Membership Reference Number</label>
              <input
                type="text"
                className="field uppercase"
                value={evidenceRef}
                onChange={(e) => setEvidenceRef(e.target.value.toUpperCase())}
                placeholder="e.g. FPO-MH-8821 or KHATA-9982"
              />
              <p className="mt-1.5 text-xs text-soil-900/60">
                🔒 <strong>Privacy Assurance:</strong> FarmLink AI stores only masked verification hashes. Your personal land and identity documents are never published or shared.
              </p>
            </div>

            <div className="flex justify-between pt-3">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="btn-ghost !py-2 text-sm"
              >
                ← Back
              </button>
              <button
                type="button"
                onClick={() => setStep(4)}
                disabled={!evidenceRef}
                className="btn-primary !py-2 text-sm"
              >
                Next: Location Details →
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Location & Submit */}
        {step === 4 && (
          <div className="mt-6 space-y-4">
            <div>
              <h3 className="text-lg font-bold text-leaf-950 flex items-center gap-2">
                <MapPin size={20} className="text-leaf-700" /> Step 4: Farm Location Confirmation
              </h3>
              <p className="text-xs text-soil-900/70 mt-0.5">
                Confirm your farm district to match with verified buyers in your operational corridor.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">State</label>
                <input
                  type="text"
                  className="field"
                  value={stateName}
                  onChange={(e) => setStateName(e.target.value)}
                  placeholder="State"
                />
              </div>

              <div>
                <label className="label">District</label>
                <select
                  className="field"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                >
                  <option value="Nashik">Nashik</option>
                  <option value="Pune">Pune</option>
                  <option value="Nagpur">Nagpur</option>
                  <option value="Karnal">Karnal</option>
                  <option value="Ludhiana">Ludhiana</option>
                  <option value="Ahmedabad">Ahmedabad</option>
                  <option value="Indore">Indore</option>
                  <option value="Jaipur">Jaipur</option>
                  <option value="Hyderabad">Hyderabad</option>
                  <option value="Bengaluru">Bengaluru</option>
                </select>
              </div>
            </div>

            <div>
              <label className="label">Village / Taluka</label>
              <input
                type="text"
                className="field"
                value={village}
                onChange={(e) => setVillage(e.target.value)}
                placeholder="Village or Tehsil name"
              />
            </div>

            <div className="rounded-2xl border border-leaf-900/10 bg-cream-50 p-4">
              <h4 className="font-bold text-leaf-950 text-sm">Submission Summary</h4>
              <ul className="mt-2 space-y-1 text-xs text-soil-900/80">
                <li>• Mobile OTP: <span className="font-semibold text-leaf-900">{otpVerified ? "Verified ✓" : "Pending"}</span></li>
                <li>• Identity Reference: <span className="font-semibold text-leaf-900">{idReference || "Verified in sandbox"}</span></li>
                <li>• Agricultural Evidence: <span className="font-semibold text-leaf-900">{evidenceType} ({evidenceRef})</span></li>
                <li>• Farm Location: <span className="font-semibold text-leaf-900">{village ? village + ", " : ""}{district}, {stateName}</span></li>
              </ul>
            </div>

            <div className="flex justify-between pt-3">
              <button
                type="button"
                onClick={() => setStep(3)}
                className="btn-ghost !py-2 text-sm"
              >
                ← Back
              </button>
              <button
                type="button"
                onClick={handleFinalSubmit}
                disabled={loading}
                className="btn-primary !py-2 text-sm"
              >
                {loading ? "Submitting..." : "Submit for Verification Review ✓"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
