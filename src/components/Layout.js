import React, { useState, useContext, useEffect, useCallback } from "react";
import Header from "./Header";
import SideBar from "./SideBar";
import { useTranslation } from "react-i18next";
import BottomNavigator from "./BottomNavigator";

const languages = {
  "en-US": "English",
  "zh-HK": "繁體中文",
  jp: "日本語",
  "zh-CN": "简体中文",
  // "zh-TW": "繁體中文",
};

const Layout = ({ children }) => {
  const { i18n } = useTranslation();
  const [languageKey, setLanguageKey] = useState("en");
  const [active, setActive] = useState(false);
  const changeLanguage = useCallback(
    async (key) => {
      console.log(`1 key`, key);
      if (!key) {
        key =
          document.cookie
            .split(";")
            .filter((v) => /lang/.test(v))
            .pop()
            ?.split("=")[1] ||
          navigator.language ||
          Object.keys(languages)[0];
        // const lang = await window.cookieStore.get("lang");
        // key = lang.value;
        // console.log(`lang`, lang);
        console.log(`2 key`, key);
      } else {
        console.log(`3 key`, key);
        // document.cookie.replace(
        //   `${document.cookie.split(";").find((v) => /lang/.test(v))};`,
        //   ""
        // );
        // document.cookie = `lang=${key}`;
        await window.cookieStore.set("lang", key);
      }
      setLanguageKey(key);
      i18n.changeLanguage(key);
    },
    [i18n]
  );
  useEffect(() => {
    changeLanguage();
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
        <BottomNavigator />
        <div className="layout--cover" onClick={() => setActive(false)}></div>
      </div>
    </div>
  );
};

export default Layout;
