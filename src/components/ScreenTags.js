import { tags } from "../constant/tag";

const ScreenTags = (props) => {
  return (
    <div className="screen__select-options-box">
      <ul className="screen__select-bar">
        <li
          className={`screen__select-option${
            "ALL" === props.selectedTag ? " active" : ""
          }`}
          key="ALL"
          onClick={() =>
            props.selectTagHandler(
              "ALL",
              props.data ? Object.values(props.data) : null
            )
          }
        >
          ALL
        </li>
        <li
          className={`screen__select-option${
            "Top" === props.selectedTag ? " active" : ""
          }`}
          key="Top"
          onClick={() =>
            props.selectTagHandler(
              "Top",
              props.data ? Object.values(props.data) : null
            )
          }
        >
          Top
        </li>
        {tags.map((option) => (
          <li
            className={`screen__select-option${
              option === props.selectedTag ? " active" : ""
            }`}
            key={option}
            onClick={() =>
              props.selectTagHandler(
                option,
                props.data ? Object.values(props.data) : null
              )
            }
          >
            {option}
          </li>
        ))}
      </ul>
      <div
        className="screen__select-bar-icon"
        onClick={() => {
          const selectBar = window.document.querySelector(
            ".screen__select-bar"
          );
          // const scrollWidth = selectBar.scrollWidth;
          const scrollLeft = selectBar.scrollLeft;
          selectBar.scroll(scrollLeft + 200, 0);
        }}
      >
          <img src="/img/arrow_box@2x.png" alt="arrow" />
      </div>
    </div>
  );
};

export default ScreenTags;
