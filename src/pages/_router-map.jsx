// 路由配置

import Home from "@/pages/home/index.jsx";
import Settings from "@/pages/settings/index.jsx";
import TextSharingManager from "@/pages/text-sharing-manager/index.jsx";
import History from "@/pages/history/index.jsx";


export const routes = [
    {
        path: "/",
        element: <Home/>,
    }, {
        path: "/home",
        element: <Home/>,
        name: "主页",
        icon: "home",
        navPosition: "top"
    }, {
        path: "/text-sharing",
        element: <TextSharingManager/>,
        name: "文本共享",
        icon: "textMsg",
        navPosition: "top"
    }, {
        path: "/history",
        element: <History/>,
        name: "历史记录",
        icon: "history",
        navPosition: "top"
    }, {
        path: "/settings",
        element: <Settings/>,
        name: "设置",
        icon: "setting",
        navPosition: "bottom"
    }
];
