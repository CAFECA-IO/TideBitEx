import React, { useContext } from "react";
import { useTranslation } from "react-i18next";
import StoreContext from "../store/store-context";

const BottomNavigator = (props) => {
  const storeCtx = useContext(StoreContext);
  const { t } = useTranslation();

  return (
    <nav id="bottom-navigator" className="bottom-navigator">
      <ul className="bottom-navigator__navbar">
        <li className="bottom-navigator__item">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
          >
            <g fill="none" fill-rule="evenodd">
              <path d="M0 0h24v24H0z"></path>
              <path
                fill="#4B4B52"
                fill-rule="nonzero"
                d="M4.7 8.159a.8.8 0 1 1 1.6 0v10.78a.8.8 0 1 1-1.6 0V8.159zM9.7 4.233a.8.8 0 1 1 1.6 0V20.94a.8.8 0 1 1-1.6 0V4.233zM14.7 6.233a.8.8 0 1 1 1.6 0V16.94a.8.8 0 1 1-1.6 0V6.233zM19.7 8a.8.8 0 1 1 1.6 0v5.684a.8.8 0 1 1-1.6 0V8z"
              ></path>
            </g>
          </svg>
          <div class="text-center">{t("navigator_chart")}</div>
        </li>
        <li className="bottom-navigator__item active">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
          >
            <g fill="none" fill-rule="evenodd">
              <path d="M2.5 15.224v4.658a1 1 0 0 0 1 1h16.907a1 1 0 0 0 1-1V9.45a1 1 0 0 0-.497-.864l-.012-.007a.992.992 0 0 0-1.012.01l-6.25 3.779a1 1 0 0 1-.972.035l-3.683-1.88a1 1 0 0 0-1.058.094l-5.027 3.81a1 1 0 0 0-.396.797z"></path>
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M2.32 9.369L8.369 4.84l4.988 2.6L20.627 3"
              ></path>
            </g>
          </svg>
          <div class="text-center">{t("navigator_market")}</div>
        </li>
        <li className="bottom-navigator__item">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
          >
            <path
              fill="#4B4B52"
              fill-rule="nonzero"
              d="M6 10.2a4.2 4.2 0 1 1 0-8.4 4.2 4.2 0 0 1 0 8.4zm0-1.4a2.8 2.8 0 1 0 0-5.6 2.8 2.8 0 0 0 0 5.6zm12 13.4a4.2 4.2 0 1 1 0-8.4 4.2 4.2 0 0 1 0 8.4zm0-1.4a2.8 2.8 0 1 0 0-5.6 2.8 2.8 0 0 0 0 5.6zM4.54 14.83l-.942-.18a.2.2 0 0 1-.08-.358l2.152-1.566a.2.2 0 0 1 .291.062l1.276 2.218a.2.2 0 0 1-.211.297l-1.103-.21c-.45 2.203 1.996 4.002 4.08 2.742a.7.7 0 0 1 .725 1.199c-3.146 1.9-6.883-.864-6.188-4.205zm14.944-5.862l.941.179a.2.2 0 0 1 .08.358l-2.151 1.566a.2.2 0 0 1-.291-.062L16.787 8.79a.2.2 0 0 1 .211-.296l1.103.21c.45-2.204-1.997-4.002-4.08-2.743a.7.7 0 0 1-.725-1.198c3.146-1.9 6.883.864 6.188 4.205z"
            ></path>
          </svg>
          <div class="text-center">{t("navigator_trade")}</div>
        </li>
        <li className="bottom-navigator__item">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
          >
            <g fill="none" fill-rule="evenodd">
              <path d="M0 0h24v24H0z"></path>
              <path
                fill="#4B4B52"
                fill-rule="nonzero"
                d="M21.1 15.851h-2.099c-1.886 0-3.279-1.26-3.279-3.1s1.393-3.196 3.279-3.196h2.1V7.2a.663.663 0 0 1-.192.028H6.285a.64.64 0 0 1-.648-.632c0-.349.29-.632.648-.632H20.93a2.692 2.692 0 0 0-2.521-1.7H3.878c-1.487 0-2.692 1.175-2.692 2.625v10.17c0 1.451 1.205 2.627 2.692 2.627h14.53c1.487 0 2.692-1.176 2.692-2.626v-1.21zm1.186 0v1.21c0 2.148-1.768 3.89-3.949 3.89H3.95C1.768 20.951 0 19.21 0 17.061V6.89C0 4.74 1.768 3 3.949 3h14.388c2.181 0 3.949 1.742 3.949 3.89v2.665h1.031c.377 0 .683.298.683.666v4.964a.675.675 0 0 1-.683.666h-1.031zm.509-5.102h-3.813c-1.212 0-2.055.821-2.055 2.003 0 1.182.843 1.905 2.055 1.905h3.813v-3.908zm-3.64 2.732a.739.739 0 0 1-.747-.73c0-.402.335-.729.748-.729s.748.327.748.73c0 .403-.335.73-.748.73z"
              ></path>
            </g>
          </svg>
          <div class="text-center">{t("navigator_assets")}</div>
        </li>
      </ul>
    </nav>
  );
  //   <div className="bottom-navigator"></div>;
};

export default BottomNavigator;
