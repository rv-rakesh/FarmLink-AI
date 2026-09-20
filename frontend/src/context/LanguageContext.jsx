import {
  createContext,
  useContext,
  useMemo,
  useState,
} from "react";

import en from "../i18n/en.json";
import hi from "../i18n/hi.json";
import mr from "../i18n/mr.json";

const packs = {
  en,
  hi,
  mr,
};

const SUPPORTED_LANGUAGES = ["en", "hi", "mr"];

const LanguageContext = createContext(null);

function getInitialLanguage() {
  try {
    const saved = localStorage.getItem("fl_lang");

    if (SUPPORTED_LANGUAGES.includes(saved)) {
      return saved;
    }
  } catch (e) {
    // Ignore localStorage errors and use English.
  }

  return "en";
}

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(
    getInitialLanguage
  );

  const setLang = (next) => {
    const normalized = SUPPORTED_LANGUAGES.includes(next)
      ? next
      : "en";

    setLangState(normalized);

    try {
      localStorage.setItem(
        "fl_lang",
        normalized
      );
    } catch (e) {
      // Ignore localStorage errors.
    }
  };

  const value = useMemo(() => {
    const t = packs[lang] || packs.en;

    return {
      lang,
      setLang,
      t,
      languages: SUPPORTED_LANGUAGES,
    };
  }, [lang]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLang() {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error(
      "useLang must be used inside LanguageProvider"
    );
  }

  return context;
}
