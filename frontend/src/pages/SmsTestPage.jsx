import SmsSimulator from "../components/SmsSimulator";
import { useAuth } from "../context/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function SmsTestPage() {
  const { user, login } = useAuth();
  const nav = useNavigate();

  const handleDemoLogin = async () => {
    try {
      await login({ role: "farmer", phone: "9876540001", password: "Farm@123" });
    } catch (e) {
      nav("/login?role=farmer");
    }
  };

  if (!user || user.role !== "farmer") {
    return (
      <div className="mx-auto max-w-md p-8 text-center space-y-4">
        <h2 className="font-display text-2xl font-bold text-leaf-950">SMS Gateway Simulator</h2>
        <p className="text-sm text-soil-900/70">
          To simulate sending SMS messages and receiving instant AI crop rates, please log in as a farmer.
        </p>
        <button
          onClick={handleDemoLogin}
          className="btn-primary w-full text-sm"
        >
          Quick Demo Login (Ramesh Patil) →
        </button>
        <Link className="block text-xs text-leaf-700 underline" to="/login?role=farmer">
          Or log in with existing account
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-4">
        <button
          onClick={() => nav("/farmer")}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-leaf-900 hover:text-leaf-700"
        >
          <ArrowLeft size={14} /> Back to Dashboard
        </button>
      </div>
      <SmsSimulator />
    </div>
  );
}
