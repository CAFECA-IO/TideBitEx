import React, { useState } from "react";

const TableSwitchWithLock = (props) => {
  const [active, setActive] = useState(false);
  const [unLocked, setUnLocked] = useState(false);
  return (
    <div
      className={`switch ${props.className ? props.className : ""}${
        active ? " active" : ""
      }${unLocked ? " unLocked" : ""}`}
      onClick={() => {
        setActive(true);
        if (active) {
          setUnLocked(true);
          props.toggleStatus();
          const timer = setTimeout(() => {
            setUnLocked(false);
            setActive(false);
            clearTimeout(timer);
          }, 500);
        }
      }}
    >
      <div className="switch__lock"></div>
      <div className="switch__box">
        <input
          className="switch__controller"
          type="checkbox"
          id="switch-btn"
          checked={props.status}
          readOnly
        />
        <div className="switch__btn"></div>
      </div>
    </div>
  );
};

export default TableSwitchWithLock;
