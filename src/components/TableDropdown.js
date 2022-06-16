import React, { useState } from "react";

const TableDropdown = (props) => {
  const [openDropDown, setOpenDropDown] = useState(false);
  const onSelect = (exchange) => {
    props.selectHandler(exchange);
    setOpenDropDown(false);
  };
  return (
    <div
      className={`dropdown deposit__currency-dropdown ${
        props.className ? props.className : ""
      }`}
    >
      <input
        className="dropdown__controller"
        type="checkbox"
        id="dropdown-btn"
        checked={openDropDown}
        readOnly
      />
      <label
        className="dropdown__label"
        htmlFor="dropdown-btn"
        onClick={() => setOpenDropDown((prev) => !prev)}
      >
        <div className="dropdown__text">{props.selected || "-"}</div>
        {props.options?.length > 0 && <div className="dropdown__icon"></div>}
      </label>
      <ul className="dropdown__options">
        {props.options?.map((option) => (
          <div
            className={`dropdown__option${
              props.activePage === "ticker-setting" ? " active" : ""
            }`}
            onClick={() => onSelect(option)}
            key={`dropdown-${option}`}
          >
            {option}
          </div>
        ))}
      </ul>
    </div>
  );
};

export default TableDropdown;
