import React from 'react';
import NavbarStyle from "./style.js";
import {Link, useNavigate} from "react-router";

// 导航栏选项
const items = [
    {
        name: "主页",
        path: "/home"
    },
    {
        name: "设置",
        path: "/settings"
    }
];

function Navbar() {
    let navigate = useNavigate();

    return (
        <NavbarStyle>
            <ul className={"top"}>
                <li><a onClick={() => navigate(-1)}>返回</a></li>
            </ul>

            <ul className={"bottom"}>
                {items.map((item, index) => (
                    <li key={index}>
                        <Link to={item.path}>{item.name}</Link>
                    </li>
                ))}
            </ul>
        </NavbarStyle>
    );
}

export default Navbar;