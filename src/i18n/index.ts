import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import ar from "./locales/ar.json";
import en from "./locales/en.json";

export type Lang = "ar" | "en";

const STORAGE_KEY = "realty-lang";

export function getInitialLang(): Lang {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === "en" || stored === "ar" ? stored : "ar";
}

/** يطبق اتجاه الصفحة واللغة على عنصر html */
export function applyDirection(lang: Lang) {
  const html = document.documentElement;
  html.lang = lang;
  html.dir = lang === "ar" ? "rtl" : "ltr";
  localStorage.setItem(STORAGE_KEY, lang);
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      ar: { translation: ar },
      en: { translation: en },
    },
    lng: getInitialLang(),
    fallbackLng: "ar",
    interpolation: { escapeValue: false },
    detection: {
      order: ["localStorage"],
      lookupLocalStorage: STORAGE_KEY,
      caches: ["localStorage"],
    },
  });

applyDirection(i18n.language === "en" ? "en" : "ar");

export default i18n;
