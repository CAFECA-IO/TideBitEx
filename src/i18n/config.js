import i18n from "i18next";
import { initReactI18next } from "react-i18next";

i18n.use(initReactI18next).init({
  // fallbackLng: "en",
  // lng: "en",
  resources: {
    "en-US": {
      translations: require("./locales/en/translations.json"),
    },
    jp: {
      translations: require("./locales/jp/translations.json"),
    },
    "zh-CN": {
      translations: require("./locales/zh_CN/translations.json"),
    },
    "zh-HK": {
      translations: require("./locales/zh_HK/translations.json"),
    },
    "zh-TW": {
      translations: require("./locales/zh_TW/translations.json"),
    },
  },
  ns: ["translations"],
  defaultNS: "translations",
});

i18n.languages = ["en-US", "jp", "zh-CN", "zh-HK", "zh-TW"];

export default i18n;
