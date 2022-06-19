import React from "react";

const TableSwitch = (props) => {
  return (
    <div className={`switch ${props.className ? props.className : ""}`}>
      <div className="switch__box">
        <input
          className="switch__controller"
          type="checkbox"
          id="switch-btn"
          checked={props.status}
          readOnly
        />
        <div className="switch__btn" onClick={props.toggleStatus}></div>
      </div>
    </div>
  );
};

export default TableSwitch;
