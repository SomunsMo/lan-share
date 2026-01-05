// 路由配置

import Home from "./home/index.jsx";
import Settings from "./settings/index.jsx";
import Test from "./test/index.jsx";


export const routes = [
    {
        path: "/",
        element: <Home/>,
    }, {
        path: "/home",
        element: <Home/>,
    },
    {
        path: "/settings",
        element: <Settings/>,
    }, {
        path: "/test",
        element: <Test/>,
    }
];