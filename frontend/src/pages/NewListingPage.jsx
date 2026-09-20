import { WifiOff } from "lucide-react";
import { useEffect, useState } from "react";
import { useLang } from "../context/LanguageContext";

export default function OfflineBanner() {
  const { t } = useLang();

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

  if (online) {
    return null;
  }

  return (
    <div className="flex items-center justify-center gap-2 bg-harvest-500 px-4 py-2 text-sm font-bold text-soil-950">
      <WifiOff size={18} />
      {t?.offline || "Offline Mode"}
    </div>
  );
}
