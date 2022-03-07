import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

const resources = {
  en: {
    translations: require("./locales/en/translations.json"),
  },
  en_us: {
    translations: require("./locales/en/translations.json"),
  },
  "en-US": {
    translations: require("./locales/en/translations.json"),
  },
  jp: {
    translations: require("./locales/jp/translations.json"),
  },
  zh_cn: {
    translations: require("./locales/zh_CN/translations.json"),
  },
  "zh-CN": {
    translations: require("./locales/zh_CN/translations.json"),
  },
  "zh-HK": {
    translations: require("./locales/zh_HK/translations.json"),
  },
  zh_hk: {
    translations: require("./locales/zh_HK/translations.json"),
  },
  "zh-TW": {
    translations: require("./locales/zh_TW/translations.json"),
  },
};

const DETECTION_OPTIONS = {
  order: [
    "querystring",
    "cookie",
    "localStorage",
    // "sessionStorage",
    // "navigator",
    "htmlTag",
    // "path",
    // "subdomain",
  ],
  lookupQuerystring: "lang",
  lookupCookie: "lang",
  lookupLocalStorage: "lang",
  htmlTag: document.documentElement,
  // lookupSessionStorage: "lang",
  caches: ["cookie", "localStorage"],
};

i18n
  .use(initReactI18next)
  .use(LanguageDetector)
  .init({
    detection: DETECTION_OPTIONS,
    resources,
    fallbackLng: "en-US",
    ns: ["translations"],
    defaultNS: "translations",
    supportedLngs: [
      "en",
      "en_us",
      "en-US",
      "jp",
      "zh-CN",
      "zh_cn",
      "zh_hk",
      "zh-HK",
      "zh-TW",
    ],
    interpolation: {
      escapeValue: false, // react already safes from xss
    },
  });

export default i18n;
