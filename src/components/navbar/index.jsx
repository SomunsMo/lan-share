import React from 'react';
import NavbarStyle from "./style.js";
import {Link, useNavigate} from "react-router";

// 顶部导航栏选项
const topItems = [
    {
        name: "主页",
        path: "/home",
        icon: "/src/assets/icon/home.webp",
    },
    {
        name: "文本共享",
        path: "/text-sharing",
        icon: "/src/assets/icon/home.webp",
    },
    {
        name: "测试页",
        path: "/test",
    }
];

// 底部导航栏选项
const bottomItems = [
    {
        name: "设置",
        path: "/settings",
        icon: "/src/assets/icon/setting.webp",
    }
];

function Navbar() {
    let navigate = useNavigate();

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