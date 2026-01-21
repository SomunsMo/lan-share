// 路由配置

import Home from "@/pages/home/index.jsx";
import Settings from "@/pages/settings/index.jsx";
import TextSharingManager from "@/pages/text-sharing-manager/index.jsx";

import HomeIcon from "/src/assets/icon/home.svg";
import TextSharingIcon from "/src/assets/icon/textMsg.svg";
import SettingIcon from "/src/assets/icon/setting.svg";


export const routes = [
    {
        path: "/",
        element: <Home/>,
    }, {
        path: "/home",
        element: <Home/>,
        name: "主页",
        icon: HomeIcon,
        navPosition: "top"
    }, {
        path: "/text-sharing",
        element: <TextSharingManager/>,
        name: "文本共享",
        icon: TextSharingIcon,
        navPosition: "top"
    }, {
        path: "/settings",
        element: <Settings/>,
        name: "设置",
        icon: SettingIcon,
        navPosition: "bottom"
    }
];