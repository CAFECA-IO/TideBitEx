import React, { useState, useContext } from "react";
import { FaHome, FaCommentDots, FaDatabase } from "react-icons/fa";
import { BiLineChart } from "react-icons/bi";
import { Navbar, Nav, Container, NavDropdown } from "react-bootstrap";
import StoreContext from "../store/store-context";
import { useTranslation } from "react-i18next";
import DropDown from "./DropDown";

const languages = {
  en: "English",
  jp: "日本語",
  zh_HK: "简体中文",
  zh_TW: "繁體中文",
};

const Header = (_) => {
  const storeCtx = useContext(StoreContext);
  const { t, i18n } = useTranslation();
  const [languageKey, setLanguageKey] = useState("en");
  const changeLanguage = (key) => {
    console.log(`changeLanguage key`, key);
    setLanguageKey(key);
    i18n.changeLanguage(key);
  };
  return (
    <Navbar bg="teal" variant="dark" expand="lg">
      <Navbar.Brand href="/">
        <img
          src="/TideBit_White_hk.png"
          className="d-inline-block align-top"
          alt="TideBit"
          width="125px"
        />
      </Navbar.Brand>
      <Navbar.Toggle aria-controls="basic-navbar-nav" />
      <Navbar.Collapse>
        <Nav.Link href="/markets/btchkd">{t("trading")}</Nav.Link>
        <Nav.Link href="https://tidebit.zendesk.com/hc/zh-tw/articles/360003146914-%E5%A4%A7%E9%A1%8D%E4%BA%A4%E6%98%93Block-Trade-OTC-%E5%B0%88%E5%B1%AC-Whatsapp-852-62871829">
          {t("block_trade")}
        </Nav.Link>
        <Nav.Link href="/digital_staking/plans">
          {t("digital_staking")}
        </Nav.Link>
        <Nav.Link href="/referral">{t("refer_now")}</Nav.Link>
        {!storeCtx.isLogin && (
          <React.Fragment>
            <Nav.Link href="/signin">{t("login")}</Nav.Link>
            <Nav.Link href="/signup">{t("register")}</Nav.Link>
          </React.Fragment>
        )}
        {storeCtx.isLogin && (
          <React.Fragment>
            <Nav.Link href="/accounts">{t("accounts")}</Nav.Link>
            <Nav.Link href="/signout">{t("logout")}</Nav.Link>
          </React.Fragment>
        )}
        <DropDown
          options={Object.keys(languages)}
          selected={languageKey}
          onSelect={changeLanguage}
          placeholder="Language"
        >
          {(key) => <div>{languages[key]}</div>}
        </DropDown>
      </Navbar.Collapse>
      {false && (
        <Navbar.Collapse id="basic-navbar-nav">
          <Container>
            <Nav className="justify-content-end flex-grow-1 pe-3">
              <Nav.Link href="/">
                <Container>
                  <FaHome />
                  <p>{t("home")}</p>
                </Container>
              </Nav.Link>
              <Nav.Link href="/markets/btchkd">
                <Container>
                  <BiLineChart />
                  <p>{t("trading")}</p>
                </Container>
              </Nav.Link>
              <Nav.Link href="https://tidebit.zendesk.com/hc/zh-tw/articles/360003146914-%E5%A4%A7%E9%A1%8D%E4%BA%A4%E6%98%93Block-Trade-OTC-%E5%B0%88%E5%B1%AC-Whatsapp-852-62871829">
                <FaCommentDots />
                <p>{t("block_trade")}</p>
              </Nav.Link>
              <Nav.Link href="/digital_staking/plans">
                <Container>
                  <FaDatabase />
                  <p>{t("digital_staking")}</p>
                </Container>
              </Nav.Link>
              <Nav.Link href="/referrals">
                <Container>
                  <FaCommentDots />
                  <p>{t("refer_now")}</p>
                </Container>
              </Nav.Link>
              <Nav.Link href="/accounts">
                <Container>
                  <FaCommentDots />
                  <p>{t("accounts")}</p>
                </Container>
              </Nav.Link>
              <Nav.Link href="/history/orders">
                <Container>
                  <FaCommentDots />
                  <p>{t("history")}</p>
                </Container>
              </Nav.Link>
              <Nav.Link href="/settings">
                <Container>
                  <FaCommentDots />
                  <p>{t("settings")}</p>
                </Container>
              </Nav.Link>
              <Nav.Link href="/zendesk">
                <Container>
                  <FaCommentDots />
                  <p>{t("support_center")}</p>
                </Container>
              </Nav.Link>
              <Nav.Link href="https://tidebit.zendesk.com/hc/zh-tw/sections/115002703828-公告">
                <Container>
                  <FaCommentDots />
                  <p>{t("announcement")}</p>
                </Container>
              </Nav.Link>
              <Nav.Link href="/signout">
                <Container>
                  <FaCommentDots />
                  <p>{t("logout")}</p>
                </Container>
              </Nav.Link>
            </Nav>
          </Container>
        </Navbar.Collapse>
      )}
    </Navbar>
  );
};

export default Header;
