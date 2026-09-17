import { WifiOff } from "lucide-react";
import { useEffect, useState } from "react";
import { useLang } from "../context/LanguageContext";

export default function OfflineBanner() {
  const { t } = useLang();
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
  if (online) return null;
  return (
    <div className="flex items-center justify-center gap-2 bg-harvest-500 text-soil-950 px-4 py-2 text-sm font-bold">
      <WifiOff size={18} />
      {t.offline}
    </div>
  );
}
