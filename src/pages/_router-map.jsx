// 路由配置

import Home from "./home/index.jsx";
import Settings from "./settings/index.jsx";
import Test from "./test/index.jsx";
import TextSharingManager from "./text-sharing-manager/index.jsx";


export const routes = [
    {
        path: "/",
        element: <Home/>,
    }, {
        path: "/home",
        element: <Home/>,
    }, {
        path: "/text-sharing",
        element: <TextSharingManager/>,
    }, {
        path: "/settings",
        element: <Settings/>,
    }, {
        path: "/test",
        element: <Test/>,
    }
];