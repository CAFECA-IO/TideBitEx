import React, { useState } from "react";

const Sidebar = (props) => {
  const [openDropDown, setOpenDropDown] = useState(true);

  const selectPageHandler = (page) => {
    if (page === "ticker-setting" || page === "currency-setting") {
      setOpenDropDown(true);
    } else {
      setOpenDropDown(false);
    }
    props.onSelected(page);
  };
  return (
    <section className="admin-sidebar">
      <div className="btn btn--dropdown admin-dropdown">
        <input
          className="admin-dropdown__controller"
          type="checkbox"
          id="dropdown-btn"
          checked={openDropDown}
          readOnly
        />
        <label
          className="admin-dropdown__label sidebar__btn"
          htmlFor="admin-dropdown-btn"
          onClick={() => setOpenDropDown((prev) => !prev)}
        >
          <div className="sidebar__text admin-dropdown__text">交易管理</div>
          <div className="admin-dropdown__icon"></div>
        </label>
        <ul className="admin-dropdown__options">
          <div
            className={`sidebar__text admin-dropdown__option${
              props.activePage === "ticker-setting" ? " active" : ""
            }`}
            onClick={() => selectPageHandler("ticker-setting")}
          >
            交易對設定
          </div>
          <div
            className={`sidebar__text admin-dropdown__option${
              props.activePage === "currency-setting" ? " active" : ""
            }`}
            onClick={() => selectPageHandler("currency-setting")}
          >
            支援幣種設定
          </div>
        </ul>
      </div>
      <div
        className={`admin-sidebar__btn${
          props.activePage === "deposit" ? " active" : ""
        }`}
        onClick={() => selectPageHandler("deposit")}
      >
        <div className="admin-sidebar__text">入金管理</div>
      </div>
      <div
        className={`admin-sidebar__btn${
          props.activePage === "sub-account" ? " active" : ""
        }`}
        onClick={() => selectPageHandler("sub-account")}
      >
        <div className="admin-sidebar__text">子帳號管理</div>
      </div>
      <div
        className={`admin-sidebar__btn${
          props.activePage === "assets-overview" ? " active" : ""
        }`}
        onClick={() => selectPageHandler("assets-overview")}
      >
        <div className="admin-sidebar__text">資產總覽</div>
      </div>
      <div
        className={`admin-sidebar__btn${
          props.activePage === "info-setting" ? " active" : ""
        }`}
        onClick={() => selectPageHandler("info-setting")}
      >
        <div className="admin-sidebar__text">通知設定</div>
      </div>
    </section>
  );
};

export default Sidebar;
