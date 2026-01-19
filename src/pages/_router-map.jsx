// 路由配置

import Home from "./home/index.jsx";
import Settings from "./settings/index.jsx";
import TextSharingManager from "./text-sharing-manager/index.jsx";

export const routes = [
    {
        path: "/",
        element: <Home/>,
    }, {
        path: "/home",
        element: <Home/>,
        name: "主页",
        icon: "/src/assets/icon/home.svg",
        navPosition: "top"
    }, {
        path: "/text-sharing",
        element: <TextSharingManager/>,
        name: "文本共享",
        icon: "/src/assets/icon/textMsg.svg",
        navPosition: "top"
    }, {
        path: "/settings",
        element: <Settings/>,
        name: "设置",
        icon: "/src/assets/icon/setting.svg",
        navPosition: "bottom"
    }
];