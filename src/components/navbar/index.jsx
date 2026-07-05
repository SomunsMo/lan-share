import React from 'react';
import NavbarStyle from "./style.js";
import {Link, useLocation} from "react-router";
import {routes} from "../../pages/_router-map.jsx";
import {useTranslation} from "react-i18next";

const icons = {
  home: (
    <svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
  ),
  textMsg: (
    <svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><line x1="8" y1="9" x2="16" y2="9"/><line x1="8" y1="13" x2="14" y2="13"/></svg>
  ),
  history: (
    <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
  ),
  setting: (
    <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
  ),
  info: (
    <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
  ),
};

function Navbar() {
  let location = useLocation();
  const { t } = useTranslation();

  const topItems = [];
  const bottomItems = [];
  routes.forEach(route => {
    if (route.navPosition === "top") {
      topItems.push(route);
    } else if (route.navPosition === "bottom") {
      bottomItems.push(route);
    }
  });

  return (
    <NavbarStyle>
      <div className="logo-area">
        <div className="logo-text">
          <span className="logo-brand">LAN Share</span>
          <span className="logo-tagline">{t('navbar.tagline')}</span>
        </div>
      </div>

      <div className="nav-group">
        {topItems.map((item, index) => (
          <Link
            key={index}
            to={item.path}
            className={"nav-item" + (location.pathname === item.path ? " active" : "")}
          >
            <span className="nav-icon">{icons[item.icon]}</span>
            {t(item.name)}
          </Link>
        ))}
      </div>

      <div className="nav-divider" />

      <div className="nav-bottom">
        {bottomItems.map((item, index) => (
          <Link
            key={index}
            to={item.path}
            className={"nav-item" + (location.pathname === item.path ? " active" : "")}
          >
            <span className="nav-icon">{icons[item.icon]}</span>
            {t(item.name)}
          </Link>
        ))}
      </div>
    </NavbarStyle>
  );
}

export default Navbar;
