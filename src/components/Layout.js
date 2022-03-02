import React, { useState, useContext, useEffect, useCallback } from "react";
import Header from "./Header";
import SideBar from "./SideBar";
import { useTranslation } from "react-i18next";

const languages = {
  "en-US": "English",
  jp: "日本語",
  "zh-CN": "简体中文",
  "zh-TW": "繁體中文",
};

const Layout = ({ children }) => {
  const { i18n } = useTranslation();
  const [languageKey, setLanguageKey] = useState("en");
  const [active, setActive] = useState(false);

  const changeLanguage = useCallback(
    (key) => {
      setLanguageKey(key);
      document.cookie = `lang=${key}`;
      i18n.changeLanguage(key);
    },
    [i18n]
  );
  useEffect(() => {
    const key =
      document.cookie
        .split(";")
        .find((v) => /lang/.test(v))
        ?.split("=")[1] || navigator.language;
    console.log(`key`, key);
    changeLanguage(key);
  }, [changeLanguage]);

  return (
    <div id="layout" className="layout layout--pushable">
      <SideBar
        languages={languages}
        languageKey={languageKey}
        changeLanguage={changeLanguage}
      />
      <div className={`layout--pusher${active ? " active" : ""}`}>
        <Header
          languages={languages}
          languageKey={languageKey}
          changeLanguage={changeLanguage}
          sidebarHandler={() => setActive((prev) => !prev)}
        />
        {children}
        <div className="layout--cover" onClick={() => setActive(false)}></div>
      </div>
    </div>
  );
};

export default Layout;
