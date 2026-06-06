import React, {useEffect, useState} from 'react';
import NavbarStyle from "./style.js";
import {Link, useLocation} from "react-router";
import {routes} from "../../pages/_router-map.jsx";
import {useTranslation} from "react-i18next";

const icons = {
  home: (
    <svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
  ),
  textMsg: (
    <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/></svg>
  ),
  history: (
    <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
  ),
  setting: (
    <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
  ),
};

function Navbar() {
  let location = useLocation();
  const { t } = useTranslation();
  const [topItems, setTopItems] = useState([]);
  const [bottomItems, setBottomItems] = useState([]);

  useEffect(() => {
    let topItems = [];
    let bottomItems = [];
    routes.forEach(route => {
      if (route.navPosition === "top") {
        topItems.push(route);
      } else if (route.navPosition === "bottom") {
        bottomItems.push(route);
      }
    });
    setTopItems(topItems);
    setBottomItems(bottomItems);
  }, []);

  return (
    <NavbarStyle>
      <ul className={"top"}>
        {topItems.map((item, index) => (
          <li key={index} className={location.pathname === item.path ? "active" : ""}>
            <Link to={item.path}>
              <span className="nav-icon">{icons[item.icon]}</span>
              {t(item.name)}
            </Link>
          </li>
        ))}
      </ul>

      <ul className={"bottom"}>
        {bottomItems.map((item, index) => (
          <li key={index} className={location.pathname === item.path ? "active" : ""}>
            <Link to={item.path}>
              <span className="nav-icon">{icons[item.icon]}</span>
              {t(item.name)}
            </Link>
          </li>
        ))}
      </ul>
    </NavbarStyle>
  );
}

export default Navbar;
