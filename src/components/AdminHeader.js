import React from "react";

const AdminHeader = (props) => {
  return (
    <header className="admin-header">
      <div className="admin-header__logo-box">
        <img src="/TideBit_White_hk.png" alt="TideBit" width="125px" />
      </div>
      <div className="admin-header__button-box">
        <div
          className={`admin-header__button${
            props.activePage === "manager" ? " active" : ""
          }`}
          onClick={() => {
            props.onSelected("manager");
          }}
        >
          管理
        </div>
        <div
          className={`admin-header__button${
            props.activePage === "analysis" ? " active" : ""
          }`}
          onClick={() => {
            props.onSelected("analysis");
          }}
        >
          分析
        </div>
      </div>
    </header>
  );
};

export default AdminHeader;
