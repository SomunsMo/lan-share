// 路由配置

import Home from "@/pages/home/index.jsx";
import Settings from "@/pages/settings/index.jsx";
import TextSharingManager from "@/pages/text-sharing-manager/index.jsx";
import History from "@/pages/history/index.jsx";
import About from "@/pages/about/index.jsx";


export const routes = [
    {
        path: "/",
        element: <Home/>,
    }, {
        path: "/home",
        element: <Home/>,
        name: "route.home",
        icon: "home",
        navPosition: "top"
    }, {
        path: "/text-sharing",
        element: <TextSharingManager/>,
        name: "route.textSharing",
        icon: "textMsg",
        navPosition: "top"
    }, {
        path: "/history",
        element: <History/>,
        name: "route.history",
        icon: "history",
        navPosition: "top"
    }, {
        path: "/settings",
        element: <Settings/>,
        name: "route.settings",
        icon: "setting",
        navPosition: "bottom"
    }, {
        path: "/about",
        element: <About/>,
        name: "route.about",
        icon: "info",
        navPosition: "bottom"
    }
];
