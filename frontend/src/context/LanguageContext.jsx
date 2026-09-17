import { createContext, useContext, useMemo, useState } from "react";
import en from "../i18n/en.json";
import hi from "../i18n/hi.json";
import mr from "../i18n/mr.json";

const packs = { en, hi, mr };
const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(localStorage.getItem("fl_lang") || "en");
  const value = useMemo(() => {
    const t = packs[lang] || en;
    const set = (next) => {
      setLang(next);
      localStorage.setItem("fl_lang", next);
    };
    return { lang, setLang: set, t };
  }, [lang]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLang() {
  return useContext(LanguageContext);
}
