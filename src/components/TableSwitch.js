import React from "react";

const TableSwitch = (props) => {
  return (
    <div
      className={`deposit__currency-switch ${
        props.className ? props.className : ""
      }`}
    >
      <input
        className="switch__controller"
        type="checkbox"
        id="switch-btn"
        checked={props.status}
        readOnly
      />
      <div className="switch__btn" onClick={props.toggleStatus}></div>
    </div>
  );
};

export default TableSwitch;
