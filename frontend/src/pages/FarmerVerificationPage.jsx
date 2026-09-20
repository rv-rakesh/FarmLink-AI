import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ShieldCheck,
  Smartphone,
  FileText,
  MapPin,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useLang } from "../context/LanguageContext";
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
  const { t, lang } = useLang();
  const nav = useNavigate();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [verifStatus, setVerifStatus] = useState(null);

  const locale =
    lang === "hi"
      ? "hi-IN"
      : lang === "mr"
      ? "mr-IN"
      : "en-IN";

  const formatNumber = (value) =>
    Number(value || 0).toLocaleString(locale);

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
  const [evidenceType, setEvidenceType] = useState(
    "fpo_membership"
  );
  const [evidenceRef, setEvidenceRef] = useState("");

  // Step 4: Location
  const [stateName, setStateName] = useState("Maharashtra");
  const [district, setDistrict] = useState(
    user?.district || "Nashik"
  );
  const [village, setVillage] = useState(
    user?.village || ""
  );

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    try {
      const data = await getFarmerVerificationStatus();

      setVerifStatus(data);

      let nextStep = 1;

      if (data.phone_verified) {
        setOtpVerified(true);
        nextStep = 2;
      }

      if (data.identity_verified) {
        setIdVerified(true);
        nextStep = 3;
      }

      if (
        ["submitted", "verified"].includes(
          data.agricultural_verification?.status
        )
      ) {
        nextStep = 4;
      }

      setStep(nextStep);
    } catch (e) {
      // Initial status load can fail silently.
    }
  };

  const handleSendOtp = async () => {
    if (loading || phone.length !== 10) return;

    setError("");
    setSuccessMsg("");
    setLoading(true);

    try {
      const res = await sendVerificationOtp(phone);

      setOtpSessionId(res.session_id);

      if (res.sandbox_otp) {
        setSandboxOtp(res.sandbox_otp);
        setOtpCode(res.sandbox_otp);
      }

      setSuccessMsg(
        t.verification.otpSent.replace(
          "{phone}",
          phone
        )
      );
    } catch (err) {
      setError(
        err?.response?.data?.error ||
          t.verification.otpSendFailed
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (
      loading ||
      !otpSessionId ||
      otpCode.length !== 6
    ) {
      return;
    }

    setError("");
    setSuccessMsg("");
    setLoading(true);

    try {
      await verifyVerificationOtp(
        otpSessionId,
        otpCode
      );

      setOtpVerified(true);
      setSuccessMsg(t.verification.otpVerified);

      await fetchCurrentUser();
      await loadStatus();

      setStep(2);
    } catch (err) {
      setError(
        err?.response?.data?.error ||
          t.verification.invalidOtp
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyId = async () => {
    if (!idReference || idReference.length < 8) {
      setError(
        t.verification.invalidIdentityReference
      );
      return;
    }

    if (loading) return;

    setError("");
    setSuccessMsg("");
    setLoading(true);

    try {
      const res = await verifyIdentity(idReference);

      setIdVerified(res.identity_verified);

      setSuccessMsg(
        res.message ||
          t.verification.identityVerified
      );

      await fetchCurrentUser();
      await loadStatus();

      setStep(3);
    } catch (err) {
      setError(
        err?.response?.data?.error ||
          t.verification.identityFailed
      );
    } finally {
      setLoading(false);
    }
  };

  const handleFinalSubmit = async () => {
    if (!evidenceRef) {
      setError(
        t.verification.agriculturalEvidenceRequired
      );
      setStep(3);
      return;
    }

    if (loading) return;

    setError("");
    setSuccessMsg("");
    setLoading(true);

    try {
      await submitFarmerVerification({
        id_reference: idReference,
        evidence_type: evidenceType,
        evidence_reference: evidenceRef,
        state: stateName,
        district,
        village,
      });

      setSuccessMsg(
        t.verification.submissionSuccess
      );

      await fetchCurrentUser();
      nav("/verification/status");
    } catch (err) {
      setError(
        err?.response?.data?.error ||
          t.verification.submissionFailed
      );
    } finally {
      setLoading(false);
    }
  };

  const currentTrustScore =
    verifStatus?.trust_score ||
    (otpVerified ? 10 : 0) +
      (idVerified ? 20 : 0);

  const steps = [
    {
      num: 1,
      label: t.verification.mobileOtp,
      icon: Smartphone,
    },
    {
      num: 2,
      label: t.verification.identity,
      icon: FileText,
    },
    {
      num: 3,
      label: t.verification.agriEvidence,
      icon: Sparkles,
    },
    {
      num: 4,
      label: t.verification.location,
      icon: MapPin,
    },
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">

      {/* Header */}
      <div className="mb-6 flex items-center justify-between gap-3">

        <button
          type="button"
          onClick={() => nav("/farmer")}
          disabled={loading}
          className="inline-flex items-center gap-2 text-sm font-semibold text-leaf-900 hover:text-leaf-700"
        >
          <ArrowLeft size={16} />
          {t.verification.backToDashboard}
        </button>

        <VerificationBadge
          level={
            verifStatus?.verification_level ||
            (otpVerified ? 1 : 0)
          }
          status={
            verifStatus?.status || "PENDING"
          }
          role="farmer"
          trustScore={currentTrustScore}
        />
      </div>

      <div className="card">

        {/* Title */}
        <div className="border-b border-leaf-900/10 pb-5">

          <div className="flex items-center gap-3">

            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-leaf-900 text-cream-50 shadow-card">
              <ShieldCheck size={26} />
            </span>

            <div>

              <h1 className="font-display text-2xl md:text-3xl font-bold text-leaf-950">
                {t.verification.farmerTitle}
              </h1>

              <p className="mt-1 text-sm text-soil-900/70">
                {t.verification.farmerSubtitle}
              </p>

            </div>
          </div>

          <div className="mt-5">
            <TrustScore
              score={currentTrustScore}
              breakdown={
                verifStatus?.trust_score_breakdown ||
                {}
              }
            />
          </div>

          {/* Stepper */}
          <div className="mt-6 grid grid-cols-4 gap-2 text-center text-xs font-semibold">

            {steps.map((s) => {
              const active = step === s.num;

              const done =
                step > s.num ||
                (s.num === 1 && otpVerified) ||
                (s.num === 2 && idVerified);

              return (
                <button
                  key={s.num}
                  type="button"
                  onClick={() => setStep(s.num)}
                  disabled={loading}
                  className={`flex flex-col items-center gap-1.5 rounded-2xl p-2.5 transition ${
                    active
                      ? "bg-leaf-900 text-cream-50 shadow-card"
                      : done
                      ? "bg-leaf-100 text-leaf-900"
                      : "bg-cream-50 text-soil-900/60"
                  }`}
                >
                  <s.icon size={16} />
                  <span className="truncate">
                    {s.label}
                  </span>
                </button>
              );
            })}

          </div>
        </div>

        {/* Feedback */}
        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            <AlertCircle
              size={18}
              className="shrink-0 text-red-600"
            />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mt-4 flex items-center gap-2 rounded-2xl border border-leaf-700/30 bg-leaf-100/50 p-3 text-sm text-leaf-900">
            <CheckCircle2
              size={18}
              className="shrink-0 text-leaf-700"
            />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Step 1 */}
        {step === 1 && (
          <div className="mt-6 space-y-4">

            <div>
              <h3 className="text-lg font-bold text-leaf-950 flex items-center gap-2">
                <Smartphone
                  size={20}
                  className="text-leaf-700"
                />
                {t.verification.step1Title}
              </h3>

              <p className="text-xs text-soil-900/70 mt-0.5">
                {t.verification.step1Body}
              </p>
            </div>

            <div>

              <label className="label">
                {t.verification.mobileNumber}
              </label>

              <div className="flex gap-2">

                <input
                  type="tel"
                  className="field flex-1"
                  placeholder={
                    t.verification.mobilePlaceholder
                  }
                  value={phone}
                  onChange={(e) =>
                    setPhone(
                      e.target.value
                        .replace(/\D/g, "")
                        .slice(0, 10)
                    )
                  }
                  disabled={
                    loading || otpVerified
                  }
                  inputMode="numeric"
                  maxLength={10}
                />

                {!otpVerified && (
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={
                      loading ||
                      phone.length !== 10
                    }
                    className="btn-primary shrink-0"
                  >
                    {loading
                      ? t.verification.sending
                      : t.verification.sendOtp}
                  </button>
                )}

              </div>
            </div>

            {otpSessionId && !otpVerified && (
              <div className="rounded-2xl border border-harvest-500/30 bg-harvest-400/10 p-4">

                <label className="label">
                  {t.verification.enterOtp}
                </label>

                <div className="flex gap-2">

                  <input
                    type="text"
                    maxLength={6}
                    className="field flex-1 tracking-widest text-center font-mono font-bold"
                    placeholder="------"
                    value={otpCode}
                    onChange={(e) =>
                      setOtpCode(
                        e.target.value
                          .replace(/\D/g, "")
                          .slice(0, 6)
                      )
                    }
                    disabled={loading}
                    inputMode="numeric"
                  />

                  <button
                    type="button"
                    onClick={handleVerifyOtp}
                    disabled={
                      loading ||
                      otpCode.length !== 6
                    }
                    className="btn-gold shrink-0"
                  >
                    {loading
                      ? t.verification.verifying
                      : t.verification.verifyCode}
                  </button>

                </div>

                {sandboxOtp && (
                  <p className="mt-2 text-xs text-soil-900/70">
                    <strong>
                      {t.verification.sandboxDemo}:
                    </strong>{" "}
                    {t.verification.simulatedCode}{" "}
                    <span className="font-mono font-bold text-leaf-900">
                      {sandboxOtp}
                    </span>
                  </p>
                )}

              </div>
            )}

            {otpVerified && (
              <div className="flex items-center justify-between rounded-2xl bg-leaf-100/60 p-4 border border-leaf-700/20">

                <div className="flex items-center gap-2 text-sm font-bold text-leaf-900">
                  <CheckCircle2
                    size={18}
                    className="text-leaf-700"
                  />
                  {t.verification.mobileVerified} (
                  {formatNumber(10)}{" "}
                  {t.verification.trustPoints})
                </div>

                <button
                  type="button"
                  onClick={() => setStep(2)}
                  disabled={loading}
                  className="btn-primary !py-2 !px-4 text-sm"
                >
                  {t.verification.proceedStep2}
                  <ArrowRight size={16} />
                </button>

              </div>
            )}

          </div>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <div className="mt-6 space-y-4">

            <div>
              <h3 className="text-lg font-bold text-leaf-950 flex items-center gap-2">
                <FileText
                  size={20}
                  className="text-leaf-700"
                />
                {t.verification.step2Title}
              </h3>

              <p className="text-xs text-soil-900/70 mt-0.5">
                {t.verification.step2Body}
              </p>
            </div>

            <div>

              <label className="label">
                {t.verification.fullName}
              </label>

              <input
                type="text"
                className="field"
                value={fullName}
                onChange={(e) =>
                  setFullName(e.target.value)
                }
                placeholder={
                  t.verification.fullNamePlaceholder
                }
                disabled={loading}
              />

            </div>

            <div>

              <label className="label">
                {t.verification.identityReference}
              </label>

              <input
                type="text"
                className="field uppercase"
                value={idReference}
                onChange={(e) =>
                  setIdReference(
                    e.target.value.toUpperCase()
                  )
                }
                placeholder={
                  t.verification.identityPlaceholder
                }
                disabled={loading}
              />

              <p className="mt-1 text-xs text-soil-900/60">
                {t.verification.identityHint}
              </p>

            </div>

            <div className="flex justify-between pt-3">

              <button
                type="button"
                onClick={() => setStep(1)}
                disabled={loading}
                className="btn-ghost !py-2 text-sm"
              >
                ← {t.verification.back}
              </button>

              <button
                type="button"
                onClick={handleVerifyId}
                disabled={
                  loading || !idReference
                }
                className="btn-primary !py-2 text-sm"
              >
                {loading
                  ? t.verification.checking
                  : t.verification.verifyIdentity}
                <ArrowRight size={16} />
              </button>

            </div>

          </div>
        )}

        {/* Step 3 */}
        {step === 3 && (
          <div className="mt-6 space-y-4">

            <div>

              <h3 className="text-lg font-bold text-leaf-950 flex items-center gap-2">
                <Sparkles
                  size={20}
                  className="text-leaf-700"
                />
                {t.verification.step3Title}
              </h3>

              <p className="text-xs text-soil-900/70 mt-0.5">
                {t.verification.step3Body}
              </p>

            </div>

            <div>

              <label className="label">
                {t.verification.evidenceType}
              </label>

              <select
                className="field"
                value={evidenceType}
                onChange={(e) =>
                  setEvidenceType(e.target.value)
                }
                disabled={loading}
              >
                <option value="fpo_membership">
                  {t.verification.fpoMembership}
                </option>

                <option value="land_record">
                  {t.verification.landRecord}
                </option>

                <option value="farmer_registration">
                  {t.verification.farmerRegistration}
                </option>

                <option value="cooperative">
                  {t.verification.cooperative}
                </option>

                <option value="pm_kisan">
                  {t.verification.pmKisan}
                </option>

                <option value="other">
                  {t.verification.otherEvidence}
                </option>
              </select>

            </div>

            <div>

              <label className="label">
                {t.verification.documentReference}
              </label>

              <input
                type="text"
                className="field uppercase"
                value={evidenceRef}
                onChange={(e) =>
                  setEvidenceRef(
                    e.target.value.toUpperCase()
                  )
                }
                placeholder={
                  t.verification.documentPlaceholder
                }
                disabled={loading}
              />

              <p className="mt-1.5 text-xs text-soil-900/60">
                🔒{" "}
                <strong>
                  {t.verification.privacyAssurance}
                </strong>{" "}
                {t.verification.privacyBody}
              </p>

            </div>

            <div className="flex justify-between pt-3">

              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={loading}
                className="btn-ghost !py-2 text-sm"
              >
                ← {t.verification.back}
              </button>

              <button
                type="button"
                onClick={() => setStep(4)}
                disabled={
                  loading || !evidenceRef
                }
                className="btn-primary !py-2 text-sm"
              >
                {t.verification.nextLocation}
                <ArrowRight size={16} />
              </button>

            </div>

          </div>
        )}

        {/* Step 4 */}
        {step === 4 && (
          <div className="mt-6 space-y-4">

            <div>

              <h3 className="text-lg font-bold text-leaf-950 flex items-center gap-2">
                <MapPin
                  size={20}
                  className="text-leaf-700"
                />
                {t.verification.step4Title}
              </h3>

              <p className="text-xs text-soil-900/70 mt-0.5">
                {t.verification.step4Body}
              </p>

            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              <div>

                <label className="label">
                  {t.verification.state}
                </label>

                <input
                  type="text"
                  className="field"
                  value={stateName}
                  onChange={(e) =>
                    setStateName(e.target.value)
                  }
                  placeholder={
                    t.verification.statePlaceholder
                  }
                  disabled={loading}
                />

              </div>

              <div>

                <label className="label">
                  {t.verification.district}
                </label>

                <select
                  className="field"
                  value={district}
                  onChange={(e) =>
                    setDistrict(e.target.value)
                  }
                  disabled={loading}
                >
                  <option value="Nashik">
                    Nashik
                  </option>
                  <option value="Pune">
                    Pune
                  </option>
                  <option value="Nagpur">
                    Nagpur
                  </option>
                  <option value="Karnal">
                    Karnal
                  </option>
                  <option value="Ludhiana">
                    Ludhiana
                  </option>
                  <option value="Ahmedabad">
                    Ahmedabad
                  </option>
                  <option value="Indore">
                    Indore
                  </option>
                  <option value="Jaipur">
                    Jaipur
                  </option>
                  <option value="Hyderabad">
                    Hyderabad
                  </option>
                  <option value="Bengaluru">
                    Bengaluru
                  </option>
                </select>

              </div>

            </div>

            <div>

              <label className="label">
                {t.verification.village}
              </label>

              <input
                type="text"
                className="field"
                value={village}
                onChange={(e) =>
                  setVillage(e.target.value)
                }
                placeholder={
                  t.verification.villagePlaceholder
                }
                disabled={loading}
              />

            </div>

            <div className="rounded-2xl border border-leaf-900/10 bg-cream-50 p-4">

              <h4 className="font-bold text-leaf-950 text-sm">
                {t.verification.submissionSummary}
              </h4>

              <ul className="mt-2 space-y-1 text-xs text-soil-900/80">

                <li>
                  • {t.verification.mobileOtp}:{" "}
                  <span className="font-semibold text-leaf-900">
                    {otpVerified
                      ? t.verification.verified
                      : t.verification.pending}
                  </span>
                </li>

                <li>
                  • {t.verification.identityReference}:{" "}
                  <span className="font-semibold text-leaf-900">
                    {idReference ||
                      t.verification.verifiedSandbox}
                  </span>
                </li>

                <li>
                  • {t.verification.agriEvidence}:{" "}
                  <span className="font-semibold text-leaf-900">
                    {evidenceType} ({evidenceRef})
                  </span>
                </li>

                <li>
                  • {t.verification.farmLocation}:{" "}
                  <span className="font-semibold text-leaf-900">
                    {village
                      ? `${village}, `
                      : ""}
                    {district}, {stateName}
                  </span>
                </li>

              </ul>

            </div>

            <div className="flex justify-between pt-3">

              <button
                type="button"
                onClick={() => setStep(3)}
                disabled={loading}
                className="btn-ghost !py-2 text-sm"
              >
                ← {t.verification.back}
              </button>

              <button
                type="button"
                onClick={handleFinalSubmit}
                disabled={loading}
                className="btn-primary !py-2 text-sm"
              >
                {loading
                  ? t.verification.submitting
                  : t.verification.submit}
                <CheckCircle2 size={16} />
              </button>

            </div>

          </div>
        )}

      </div>
    </div>
  );
}
