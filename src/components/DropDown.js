import React, { useState } from "react";

const randomID = (n) => {
  var ID = "";
  var text = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  n = parseInt(n);
  if (!(n > 0)) {
    n = 8;
  }
  while (ID.length < n) {
    ID = ID.concat(text.charAt(parseInt(Math.random() * text.length)));
  }
  return ID;
};

const DropDown = (props) => {
  const id = randomID(6);

  const [checked, setChecked] = useState(false);
  const selectHandler = (option) => {
    setChecked(false);
    props.onSelect(option);
  };
  const clickHandler = () => {
    setChecked((prev) => !prev);
  };
  return (
    <div className="header-dropdown">
      <input
        className="header-dropdown__controller"
        type="checkbox"
        id="header-dropdown-controller"
        checked={checked}
        readOnly
      />
      <label
        className="header-dropdown__button"
        htmlFor={id}
        onClick={clickHandler}
      >
        {props.selected && props.children(props.selected)}
        {!!props.options && (
          <div className="header-dropdown__icon">&#10095;</div>
        )}
      </label>
      {!!props.options && (
        <ul className="header-dropdown__list header-dropdown__card">
          {props.options.map((data) => (
            <li
              className="header-dropdown__item"
              key={data}
              onClick={() => {
                selectHandler(data);
              }}
            >
              {props.children(data)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default DropDown;
