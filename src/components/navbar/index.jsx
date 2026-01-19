import React, {useEffect, useState} from 'react';
import NavbarStyle from "./style.js";
import {Link, useNavigate} from "react-router";
import {routes} from "../../pages/_router-map.jsx";


function Navbar() {
    let navigate = useNavigate();
    // 顶部导航栏选项
    const [topItems, setTopItems] = useState([]);
    // 底部导航栏选项
    const [bottomItems, setBottomItems] = useState([]);

    useEffect(() => {
        // 从路由映射关系中过滤出导航栏选项
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
                    <li key={index}>
                        <Link to={item.path}>
                            <img src={item.icon} alt={null}/>
                            {item.name}
                        </Link>
                    </li>
                ))}
            </ul>

            <ul className={"bottom"}>
                {bottomItems.map((item, index) => (
                    <li key={index}>
                        <Link to={item.path}>
                            <img src={item.icon} alt={null}/>
                            {item.name}
                        </Link>
                    </li>
                ))}
            </ul>
        </NavbarStyle>
    );
}

export default Navbar;